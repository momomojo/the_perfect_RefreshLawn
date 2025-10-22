// Find a booking for Claire that can be completed for testing
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iqxdatlqgvdcvyfdxywf.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeGRhdGxxZ3ZkY3Z5ZmR4eXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Njc2MzgsImV4cCI6MjA3NjA0MzYzOH0.cG7qVGB0HWA-9k4_92cRAJcZFTcdpnrYAey5fpFNIJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // First, let's see what statuses actually exist
    const { data: allStatuses, error: statusError } = await supabase
      .from('bookings')
      .select('status')
      .limit(100);

    if (statusError) throw statusError;

    const uniqueStatuses = [...new Set(allStatuses.map((b) => b.status))];
    console.log('\n=== ALL BOOKING STATUSES IN DATABASE ===');
    console.log(uniqueStatuses);

    // Find ANY bookings
    const { data: allBookings, error: allError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        customer_id,
        technician_id,
        status,
        scheduled_date,
        scheduled_time,
        service:services(name),
        review:reviews(id, rating)
      `
      )
      .limit(20);

    if (allError) throw allError;

    console.log(`\n=== ALL BOOKINGS (Sample of ${allBookings.length}) ===\n`);
    allBookings.forEach((b, i) => {
      console.log(
        `${i + 1}. ${b.id.substring(0, 8)}... - ${b.service?.name} - Status: ${b.status}`
      );
      console.log(
        `   Has Tech: ${b.technician_id ? 'Yes' : 'No'} | Has Review: ${b.review ? 'Yes' : 'No'}`
      );
    });

    // Find a booking we can use for testing
    const testableBooking = allBookings.find(
      (b) =>
        b.technician_id &&
        !b.review &&
        b.status !== 'completed' &&
        b.status !== 'cancelled'
    );

    if (testableBooking) {
      console.log(`\n✓ SELECTED BOOKING FOR TEST: ${testableBooking.id}`);
      console.log(`  Service: ${testableBooking.service?.name}`);
      console.log(`  Status: ${testableBooking.status}`);
      console.log(`  Customer ID: ${testableBooking.customer_id}`);
      console.log(`  Technician ID: ${testableBooking.technician_id}`);
      console.log(`  Has Review: ${testableBooking.review ? 'Yes' : 'No'}`);
    } else {
      console.log('\n⚠ No suitable booking found for testing');
    }

    // Get technician login
    console.log('\n=== TECHNICIAN LOGIN INFO ===');
    console.log('Email: mohibhafeez@gmail.com');
    console.log('Password: a1b2c3d4');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
