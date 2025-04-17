describe('Stripe Integration', () => {
  beforeEach(() => {
    // Log in before each test
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
    
    // Mock the payment methods API
    cy.mockStripeAPI('payment-methods.json');
  });

  it('should create a payment intent for a booking', () => {
    // Mock the services API
    cy.intercept('GET', '**/rest/v1/services*', { fixture: 'services.json' }).as('getServices');
    
    // Mock the payment intent API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'create-payment-intent') {
        req.reply({ fixture: 'payment-intent.json' });
      }
    }).as('createPaymentIntent');
    
    cy.visit('/booking');
    
    // Wait for services to load
    cy.wait('@getServices');
    
    // Complete booking steps
    cy.contains('Lawn Mowing').click();
    cy.contains('Mon, Apr 20').click();
    cy.contains('10:00 AM').click();
    cy.contains('Current Address').click();
    cy.contains('No, one-time only').click();
    cy.contains('Visa ending in 4242').click();
    cy.contains('Confirm Booking').click();
    
    // Wait for payment intent creation
    cy.wait('@createPaymentIntent');
    
    // Verify payment intent was created
    cy.get('@createPaymentIntent').its('request.body').should('deep.include', {
      action: 'create-payment-intent'
    });
    
    // Verify booking confirmation
    cy.contains('Booking Confirmed').should('be.visible');
  });

  it('should add a new payment method', () => {
    // Mock the attach payment method API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'attach-payment-method') {
        req.reply({
          statusCode: 200,
          body: { success: true }
        });
      }
    }).as('attachPaymentMethod');
    
    cy.visit('/profile');
    
    // Navigate to payment methods section
    cy.contains('Payment Methods').click();
    
    // Click add new card button
    cy.contains('Add New Credit/Debit Card').click();
    
    // Fill in card details
    cy.get('input[name="cardholderName"]').type('Test User');
    
    // Use Stripe test card
    cy.get('iframe[name^="__privateStripeFrame"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body).find('input[name="cardnumber"]').type('4242424242424242');
      cy.wrap($body).find('input[name="exp-date"]').type('1225');
      cy.wrap($body).find('input[name="cvc"]').type('123');
    });
    
    // Save card
    cy.contains('Save Card').click();
    
    // Wait for payment method to be attached
    cy.wait('@attachPaymentMethod');
    
    // Verify payment method was attached
    cy.get('@attachPaymentMethod').its('request.body').should('deep.include', {
      action: 'attach-payment-method'
    });
    
    // Verify success message
    cy.contains('Payment method added successfully').should('be.visible');
  });

  it('should set a default payment method', () => {
    // Mock the set default payment method API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'set-default-payment') {
        req.reply({
          statusCode: 200,
          body: { success: true }
        });
      }
    }).as('setDefaultPaymentMethod');
    
    cy.visit('/profile');
    
    // Navigate to payment methods section
    cy.contains('Payment Methods').click();
    
    // Wait for payment methods to load
    cy.wait('@stripeAPI');
    
    // Click set as default for the second card
    cy.contains('Mastercard ending in 5555')
      .parent()
      .contains('Set as Default')
      .click();
    
    // Wait for default payment method to be set
    cy.wait('@setDefaultPaymentMethod');
    
    // Verify default payment method was set
    cy.get('@setDefaultPaymentMethod').its('request.body').should('deep.include', {
      action: 'set-default-payment'
    });
    
    // Verify success message
    cy.contains('Default payment method updated').should('be.visible');
  });

  it('should detach a payment method', () => {
    // Mock the detach payment method API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'detach-payment-method') {
        req.reply({
          statusCode: 200,
          body: { success: true }
        });
      }
    }).as('detachPaymentMethod');
    
    cy.visit('/profile');
    
    // Navigate to payment methods section
    cy.contains('Payment Methods').click();
    
    // Wait for payment methods to load
    cy.wait('@stripeAPI');
    
    // Click remove for the second card
    cy.contains('Mastercard ending in 5555')
      .parent()
      .contains('Remove')
      .click();
    
    // Confirm removal
    cy.contains('Remove').click();
    
    // Wait for payment method to be detached
    cy.wait('@detachPaymentMethod');
    
    // Verify payment method was detached
    cy.get('@detachPaymentMethod').its('request.body').should('deep.include', {
      action: 'detach-payment-method'
    });
    
    // Verify success message
    cy.contains('Payment method removed').should('be.visible');
  });

  it('should create a subscription', () => {
    // Mock the services API
    cy.intercept('GET', '**/rest/v1/services*', { fixture: 'services.json' }).as('getServices');
    
    // Mock the recurring plans API
    cy.intercept('GET', '**/rest/v1/recurring_plans*', {
      data: [
        {
          id: '1',
          name: 'Weekly Plan',
          description: 'Service every week',
          interval: 'week',
          interval_count: 1,
          discount_percentage: 10
        },
        {
          id: '2',
          name: 'Bi-Weekly Plan',
          description: 'Service every two weeks',
          interval: 'week',
          interval_count: 2,
          discount_percentage: 5
        },
        {
          id: '3',
          name: 'Monthly Plan',
          description: 'Service once a month',
          interval: 'month',
          interval_count: 1,
          discount_percentage: 0
        }
      ]
    }).as('getRecurringPlans');
    
    // Mock the create subscription API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'create-subscription') {
        req.reply({
          statusCode: 200,
          body: {
            subscriptionId: 'sub_12345',
            status: 'active',
            clientSecret: 'pi_test_secret_123456789'
          }
        });
      }
    }).as('createSubscription');
    
    cy.visit('/booking');
    
    // Wait for services to load
    cy.wait('@getServices');
    
    // Complete booking steps
    cy.contains('Lawn Fertilization').click();
    cy.contains('Mon, Apr 20').click();
    cy.contains('2:00 PM').click();
    cy.contains('Current Address').click();
    cy.contains('Yes, make it recurring').click();
    
    // Wait for recurring plans to load
    cy.wait('@getRecurringPlans');
    
    // Select a plan
    cy.contains('Weekly Plan').click();
    
    // Wait for payment methods to load
    cy.wait('@stripeAPI');
    
    // Select payment method
    cy.contains('Visa ending in 4242').click();
    
    // Confirm booking
    cy.contains('Confirm Booking').click();
    
    // Wait for subscription creation
    cy.wait('@createSubscription');
    
    // Verify subscription was created
    cy.get('@createSubscription').its('request.body').should('deep.include', {
      action: 'create-subscription'
    });
    
    // Verify booking confirmation
    cy.contains('Booking Confirmed').should('be.visible');
    cy.contains('Weekly Plan').should('be.visible');
  });

  it('should handle Stripe errors gracefully', () => {
    // Mock the services API
    cy.intercept('GET', '**/rest/v1/services*', { fixture: 'services.json' }).as('getServices');
    
    // Mock a failed payment intent with a specific Stripe error
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'create-payment-intent') {
        req.reply({
          statusCode: 400,
          body: {
            error: 'Your card has insufficient funds.',
            code: 'card_declined',
            decline_code: 'insufficient_funds',
            operation: 'creating payment intent'
          }
        });
      }
    }).as('failedPaymentIntent');
    
    cy.visit('/booking');
    
    // Wait for services to load
    cy.wait('@getServices');
    
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
    
    // Verify specific error message is displayed
    cy.contains('Your card has insufficient funds').should('be.visible');
    
    // Verify user can try again
    cy.contains('Try Again').should('be.visible');
  });
});
