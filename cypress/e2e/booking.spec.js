describe('Booking Flow', () => {
  beforeEach(() => {
    // Log in before each test
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
    
    // Mock the services API
    cy.intercept('GET', '**/rest/v1/services*', { fixture: 'services.json' }).as('getServices');
    
    // Mock the payment methods API
    cy.mockStripeAPI('payment-methods.json');
    
    // Mock the payment intent API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'create-payment-intent') {
        req.reply({ fixture: 'payment-intent.json' });
      }
    }).as('createPaymentIntent');
  });

  it('should allow a user to create a one-time booking with cash payment', () => {
    cy.visit('/booking');
    
    // Wait for services to load
    cy.wait('@getServices');
    
    // Step 1: Select service type
    cy.contains('Lawn Mowing').click();
    
    // Step 2: Select date
    cy.contains('Mon, Apr 20').click();
    
    // Step 3: Select time
    cy.contains('10:00 AM').click();
    
    // Step 4: Confirm address
    cy.contains('Current Address').click();
    
    // Step 5: Select one-time service
    cy.contains('No, one-time only').click();
    
    // Step 6: Select payment method
    cy.contains('Cash on Delivery').click();
    
    // Step 7: Confirm booking
    cy.contains('Confirm Booking').click();
    
    // Verify booking confirmation
    cy.contains('Booking Confirmed').should('be.visible');
    cy.contains('Lawn Mowing').should('be.visible');
    cy.contains('Cash on Delivery').should('be.visible');
  });

  it('should allow a user to create a recurring booking with card payment', () => {
    cy.visit('/booking');
    
    // Wait for services to load
    cy.wait('@getServices');
    
    // Step 1: Select service type
    cy.contains('Lawn Fertilization').click();
    
    // Step 2: Select date
    cy.contains('Mon, Apr 20').click();
    
    // Step 3: Select time
    cy.contains('2:00 PM').click();
    
    // Step 4: Confirm address
    cy.contains('Current Address').click();
    
    // Step 5: Select recurring service
    cy.contains('Yes, make it recurring').click();
    
    // Select a plan
    cy.contains('Monthly Plan').click();
    
    // Step 6: Select payment method
    cy.wait('@stripeAPI');
    cy.contains('Visa ending in 4242').click();
    
    // Step 7: Confirm booking
    cy.contains('Confirm Booking').click();
    
    // Wait for payment intent creation
    cy.wait('@createPaymentIntent');
    
    // Verify booking confirmation
    cy.contains('Booking Confirmed').should('be.visible');
    cy.contains('Lawn Fertilization').should('be.visible');
    cy.contains('Monthly Plan').should('be.visible');
    cy.contains('Visa ending in 4242').should('be.visible');
  });

  it('should show network error when offline', () => {
    // Simulate offline status
    cy.setNetworkStatus(false);
    
    cy.visit('/booking');
    
    // Verify offline warning is displayed
    cy.contains('You are currently offline').should('be.visible');
    
    // Try to proceed with booking
    cy.contains('Lawn Mowing').click();
    cy.contains('Mon, Apr 20').click();
    cy.contains('10:00 AM').click();
    cy.contains('Current Address').click();
    cy.contains('No, one-time only').click();
    cy.contains('Cash on Delivery').click();
    
    // Verify confirm button is disabled
    cy.contains('Confirm Booking').should('be.disabled');
    
    // Restore online status
    cy.setNetworkStatus(true);
    
    // Verify offline warning is no longer displayed
    cy.contains('You are currently offline').should('not.exist');
    
    // Verify confirm button is enabled
    cy.contains('Confirm Booking').should('not.be.disabled');
  });

  it('should handle errors during payment processing', () => {
    // Mock a failed payment intent
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'create-payment-intent') {
        req.reply({
          statusCode: 400,
          body: {
            error: 'Your card was declined',
            code: 'card_declined',
            operation: 'creating payment intent'
          }
        });
      }
    }).as('failedPaymentIntent');
    
    cy.visit('/booking');
    
    // Complete booking steps
    cy.contains('Lawn Mowing').click();
    cy.contains('Mon, Apr 20').click();
    cy.contains('10:00 AM').click();
    cy.contains('Current Address').click();
    cy.contains('No, one-time only').click();
    cy.contains('Visa ending in 4242').click();
    cy.contains('Confirm Booking').click();
    
    // Wait for failed payment intent
    cy.wait('@failedPaymentIntent');
    
    // Verify error message
    cy.contains('Your card was declined').should('be.visible');
    cy.contains('Please try a different payment method').should('be.visible');
  });
});
