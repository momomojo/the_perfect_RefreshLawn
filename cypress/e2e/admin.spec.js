describe('Admin Dashboard', () => {
  beforeEach(() => {
    // Log in as admin before each test
    cy.login(Cypress.env('adminUserEmail'), Cypress.env('adminUserPassword'));
    
    // Mock the admin dashboard data
    cy.intercept('GET', '**/rest/v1/bookings*', {
      fixture: 'admin-bookings.json'
    }).as('getBookings');
    
    cy.intercept('GET', '**/rest/v1/customers*', {
      fixture: 'admin-customers.json'
    }).as('getCustomers');
    
    cy.intercept('GET', '**/rest/v1/payments*', {
      fixture: 'admin-payments.json'
    }).as('getPayments');
  });

  it('should display admin dashboard with key metrics', () => {
    cy.visit('/admin/dashboard');
    
    // Wait for data to load
    cy.wait(['@getBookings', '@getCustomers', '@getPayments']);
    
    // Verify dashboard metrics are displayed
    cy.contains('Total Bookings').should('be.visible');
    cy.contains('Total Revenue').should('be.visible');
    cy.contains('Active Customers').should('be.visible');
    cy.contains('Pending Bookings').should('be.visible');
  });

  it('should display booking list with filtering options', () => {
    cy.visit('/admin/bookings');
    
    // Wait for bookings to load
    cy.wait('@getBookings');
    
    // Verify booking list is displayed
    cy.contains('Booking ID').should('be.visible');
    cy.contains('Customer').should('be.visible');
    cy.contains('Service').should('be.visible');
    cy.contains('Date').should('be.visible');
    cy.contains('Status').should('be.visible');
    
    // Test filtering by status
    cy.get('select[name="status"]').select('Pending');
    cy.contains('Pending').should('be.visible');
    cy.contains('Completed').should('not.exist');
    
    // Test filtering by date range
    cy.get('input[name="startDate"]').type('2025-04-01');
    cy.get('input[name="endDate"]').type('2025-04-30');
    cy.contains('Apply Filter').click();
    
    // Verify filtered results
    cy.contains('Apr 15, 2025').should('be.visible');
    cy.contains('Mar 15, 2025').should('not.exist');
  });

  it('should allow updating booking status', () => {
    cy.visit('/admin/bookings');
    
    // Wait for bookings to load
    cy.wait('@getBookings');
    
    // Click on a booking to view details
    cy.contains('BK-12345').click();
    
    // Update booking status
    cy.get('select[name="bookingStatus"]').select('Completed');
    
    // Mock the update booking API
    cy.intercept('PATCH', '**/rest/v1/bookings*', {
      statusCode: 200,
      body: {
        data: {
          id: 'BK-12345',
          status: 'completed'
        }
      }
    }).as('updateBooking');
    
    // Save changes
    cy.contains('Update Status').click();
    
    // Wait for booking update
    cy.wait('@updateBooking');
    
    // Verify success message
    cy.contains('Booking status updated successfully').should('be.visible');
  });

  it('should display customer list with search functionality', () => {
    cy.visit('/admin/customers');
    
    // Wait for customers to load
    cy.wait('@getCustomers');
    
    // Verify customer list is displayed
    cy.contains('Customer ID').should('be.visible');
    cy.contains('Name').should('be.visible');
    cy.contains('Email').should('be.visible');
    cy.contains('Phone').should('be.visible');
    cy.contains('Total Bookings').should('be.visible');
    
    // Test search functionality
    cy.get('input[name="search"]').type('John');
    cy.contains('Search').click();
    
    // Verify search results
    cy.contains('John Doe').should('be.visible');
    cy.contains('Jane Smith').should('not.exist');
  });

  it('should display payment history with filtering options', () => {
    cy.visit('/admin/payments');
    
    // Wait for payments to load
    cy.wait('@getPayments');
    
    // Verify payment list is displayed
    cy.contains('Payment ID').should('be.visible');
    cy.contains('Customer').should('be.visible');
    cy.contains('Amount').should('be.visible');
    cy.contains('Date').should('be.visible');
    cy.contains('Status').should('be.visible');
    
    // Test filtering by payment status
    cy.get('select[name="paymentStatus"]').select('Succeeded');
    cy.contains('Succeeded').should('be.visible');
    cy.contains('Failed').should('not.exist');
    
    // Test filtering by date range
    cy.get('input[name="startDate"]').type('2025-04-01');
    cy.get('input[name="endDate"]').type('2025-04-30');
    cy.contains('Apply Filter').click();
    
    // Verify filtered results
    cy.contains('Apr 15, 2025').should('be.visible');
    cy.contains('Mar 15, 2025').should('not.exist');
  });

  it('should allow issuing refunds', () => {
    cy.visit('/admin/payments');
    
    // Wait for payments to load
    cy.wait('@getPayments');
    
    // Click on a payment to view details
    cy.contains('py_12345').click();
    
    // Click refund button
    cy.contains('Issue Refund').click();
    
    // Confirm refund
    cy.contains('Yes, issue refund').click();
    
    // Mock the refund API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'create-refund') {
        req.reply({
          statusCode: 200,
          body: {
            refundId: 're_12345',
            status: 'succeeded'
          }
        });
      }
    }).as('createRefund');
    
    // Wait for refund to be processed
    cy.wait('@createRefund');
    
    // Verify success message
    cy.contains('Refund issued successfully').should('be.visible');
  });
});
