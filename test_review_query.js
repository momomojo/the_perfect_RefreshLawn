// Query script to check Claire's bookings and review status
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iqxdatlqgvdcvyfdxywf.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeGRhdGxxZ3ZkY3Z5ZmR4eXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Njc2MzgsImV4cCI6MjA3NjA0MzYzOH0.cG7qVGB0HWA-9k4_92cRAJcZFTcdpnrYAey5fpFNIJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // Get Claire's user ID from auth metadata
    // Email: claireherman135@gmail.com
    // We'll use a known customer ID or query from auth.users
    // For now, let's try to find the user through bookings

    const { data: allBookings, error: searchError } = await supabase
      .from('bookings')
      .select('customer_id, profiles!inner(id)')
      .limit(1000);

    if (searchError) throw searchError;

    // Use first customer_id we find (this is Claire based on login)
    const customerId =
      allBookings.length > 0 ? allBookings[0].customer_id : null;

    if (!customerId) {
      throw new Error('Could not find customer ID');
    }

    console.log('Using Customer ID:', customerId);

    // Get all bookings for Claire
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        scheduled_date,
        technician_id,
        service:services(name),
        review:reviews(id, rating, comment, admin_feedback, admin_reviewed)
      `
      )
      .eq('customer_id', customerId)
      .order('scheduled_date', { ascending: false });

    if (bookingsError) throw bookingsError;

    console.log("\n=== CLAIRE'S BOOKINGS ===");
    console.log(`Total bookings: ${bookings.length}\n`);

    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Service: ${booking.service?.name || 'Unknown'}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Date: ${booking.scheduled_date}`);
      console.log(`   Has Technician: ${booking.technician_id ? 'Yes' : 'No'}`);
      console.log(`   Has Review: ${booking.review ? 'Yes' : 'No'}`);
      if (booking.review) {
        console.log(`   Review Rating: ${booking.review.rating} stars`);
        console.log(`   Has Comment: ${booking.review.comment ? 'Yes' : 'No'}`);
        console.log(`   Admin Feedback Flag: ${booking.review.admin_feedback}`);
        console.log(`   Admin Reviewed: ${booking.review.admin_reviewed}`);
      }
      console.log('');
    });

    // Find completed bookings without reviews
    const completedWithoutReview = bookings.filter(
      (b) => b.status === 'completed' && !b.review && b.technician_id
    );

    console.log(
      `\n=== COMPLETED BOOKINGS WITHOUT REVIEWS: ${completedWithoutReview.length} ===`
    );
    completedWithoutReview.forEach((b) => {
      console.log(`- ${b.id} (${b.service?.name})`);
    });

    // Check database constraints
    console.log('\n=== CHECKING DATABASE CONSTRAINTS ===');

    const { data: constraints, error: constraintError } = await supabase.rpc(
      'execute_sql',
      {
        query: `
        SELECT
          conname,
          contype,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'reviews'::regclass
        AND (conname LIKE '%booking%' OR conname LIKE '%rating%')
        ORDER BY conname;
      `,
      }
    );

    if (constraintError) {
      console.log('Could not check constraints (may need admin access)');
    } else {
      console.log('Constraints:', JSON.stringify(constraints, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
