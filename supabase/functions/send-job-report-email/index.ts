// Edge Function: Send Job Report Email
// Description: Sends a completed job report to the customer via email
// Triggered by: Database trigger when report_email_sent flag is set

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../shared/cors.ts';

// Resend API configuration
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'RefreshLawn <noreply@refreshlawn.com>';

interface JobReportData {
  booking: {
    id: string;
    service_date: string;
    property_address: string;
    report_notes?: string;
    before_photo_url?: string;
    after_photo_url?: string;
    total_amount?: number;
    stripe_payment_intent_id?: string;
  };
  customer: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  technician: {
    first_name?: string;
    last_name?: string;
  };
  service: {
    name: string;
    description?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing job report email for booking:', bookingId);

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch booking data with related information
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(
        `
        id,
        service_date,
        property_address,
        report_notes,
        before_photo_url,
        after_photo_url,
        total_amount,
        stripe_payment_intent_id,
        customer_id,
        technician_id,
        service_id
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Failed to fetch booking:', bookingError);
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch customer profile
    const { data: customer, error: customerError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', booking.customer_id)
      .single();

    if (customerError || !customer?.email) {
      console.error('Failed to fetch customer:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer email not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch technician profile
    const { data: technician } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', booking.technician_id)
      .maybeSingle();

    // Fetch service details
    const { data: service } = await supabaseClient
      .from('services')
      .select('name, description')
      .eq('id', booking.service_id)
      .maybeSingle();

    // Generate signed URLs for photos if they exist
    let beforePhotoSignedUrl: string | undefined;
    let afterPhotoSignedUrl: string | undefined;

    if (booking.before_photo_url) {
      const { data: beforeSignedData } = await supabaseClient.storage
        .from('booking-images')
        .createSignedUrl(
          booking.before_photo_url.replace(/^.*\/booking-images\//, ''),
          60 * 60 * 24 * 7 // 7 days
        );
      beforePhotoSignedUrl = beforeSignedData?.signedUrl;
    }

    if (booking.after_photo_url) {
      const { data: afterSignedData } = await supabaseClient.storage
        .from('booking-images')
        .createSignedUrl(
          booking.after_photo_url.replace(/^.*\/booking-images\//, ''),
          60 * 60 * 24 * 7 // 7 days
        );
      afterPhotoSignedUrl = afterSignedData?.signedUrl;
    }

    // Build email content
    const emailHtml = generateJobReportEmail({
      booking: {
        ...booking,
        before_photo_url: beforePhotoSignedUrl,
        after_photo_url: afterPhotoSignedUrl,
      },
      customer,
      technician: technician || {},
      service: service || { name: 'Lawn Care Service' },
    });

    // Generate payment receipt link
    let paymentReceiptLink = '';
    if (booking.stripe_payment_intent_id) {
      // Stripe Dashboard link (customers can't access this, but we'll provide it for admin reference)
      paymentReceiptLink = `https://dashboard.stripe.com/payments/${booking.stripe_payment_intent_id}`;
    } else {
      paymentReceiptLink = 'Paid with Cash';
    }

    // Send email via Resend
    const emailPayload = {
      from: FROM_EMAIL,
      to: customer.email,
      subject: `Job Completed - ${service?.name || 'Lawn Care Service'}`,
      html: emailHtml,
    };

    console.log('Sending email to:', customer.email);

    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job report email sent successfully',
        emailId: resendData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-job-report-email:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateJobReportEmail(data: JobReportData): string {
  const { booking, customer, technician, service } = data;

  const customerName = customer.first_name
    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
    : 'Valued Customer';

  const technicianName = technician.first_name
    ? `${technician.first_name} ${technician.last_name || ''}`.trim()
    : 'Our Technician';

  const formattedDate = new Date(booking.service_date).toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const formattedAmount = booking.total_amount
    ? `$${(booking.total_amount / 100).toFixed(2)}`
    : 'N/A';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Job Report - ${service.name}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #22c55e;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #22c55e;
          margin-bottom: 10px;
        }
        h1 {
          color: #22c55e;
          font-size: 24px;
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #22c55e;
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e5e5;
        }
        .info-label {
          font-weight: 600;
          color: #666;
        }
        .info-value {
          color: #333;
        }
        .photos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }
        .photo-container {
          text-align: center;
        }
        .photo-label {
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
        }
        .photo {
          width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .notes {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #22c55e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
          .photos {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🌱 RefreshLawn</div>
          <h1>Job Completed!</h1>
          <p>Your service has been completed successfully</p>
        </div>

        <div class="section">
          <div class="section-title">Service Details</div>
          <div class="info-row">
            <span class="info-label">Service:</span>
            <span class="info-value">${service.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${booking.property_address}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Technician:</span>
            <span class="info-value">${technicianName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Amount:</span>
            <span class="info-value">${formattedAmount}</span>
          </div>
        </div>

        ${
          booking.before_photo_url || booking.after_photo_url
            ? `
          <div class="section">
            <div class="section-title">Before & After Photos</div>
            <div class="photos">
              ${
                booking.before_photo_url
                  ? `
                <div class="photo-container">
                  <div class="photo-label">Before</div>
                  <img src="${booking.before_photo_url}" alt="Before" class="photo" />
                </div>
              `
                  : ''
              }
              ${
                booking.after_photo_url
                  ? `
                <div class="photo-container">
                  <div class="photo-label">After</div>
                  <img src="${booking.after_photo_url}" alt="After" class="photo" />
                </div>
              `
                  : ''
              }
            </div>
          </div>
        `
            : ''
        }

        ${
          booking.report_notes
            ? `
          <div class="section">
            <div class="section-title">Technician Notes</div>
            <div class="notes">${booking.report_notes}</div>
          </div>
        `
            : ''
        }

        ${
          booking.stripe_payment_intent_id
            ? `
          <div class="section">
            <div class="section-title">Payment Information</div>
            <p>Your payment was processed successfully via Stripe.</p>
            <p><small>Payment ID: ${booking.stripe_payment_intent_id}</small></p>
          </div>
        `
            : ''
        }

        <div class="footer">
          <p><strong>Thank you for choosing RefreshLawn!</strong></p>
          <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
          <p style="margin-top: 20px; color: #999; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
