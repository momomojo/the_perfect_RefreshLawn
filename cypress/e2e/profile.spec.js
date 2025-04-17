describe('Profile Management', () => {
  beforeEach(() => {
    // Log in before each test
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
    
    // Mock the profile API
    cy.intercept('GET', '**/rest/v1/profiles*', { fixture: 'user-profile.json' }).as('getProfile');
    
    // Mock the payment methods API
    cy.mockStripeAPI('payment-methods.json');
  });

  it('should display user profile information', () => {
    cy.visit('/profile');
    
    // Wait for profile data to load
    cy.wait('@getProfile');
    
    // Verify profile information is displayed
    cy.contains('Test User').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
    cy.contains('555-123-4567').should('be.visible');
    cy.contains('123 Test Street').should('be.visible');
  });

  it('should allow editing profile information', () => {
    cy.visit('/profile');
    
    // Wait for profile data to load
    cy.wait('@getProfile');
    
    // Click edit button
    cy.contains('Edit').click();
    
    // Update profile information
    cy.get('input[name="name"]').clear().type('Updated Name');
    cy.get('input[name="phone"]').clear().type('555-987-6543');
    
    // Save changes
    cy.contains('Save Changes').click();
    
    // Mock the update profile API
    cy.intercept('PATCH', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: {
        data: {
          id: 'test-user-id',
          name: 'Updated Name',
          phone: '555-987-6543'
        }
      }
    }).as('updateProfile');
    
    // Wait for profile update
    cy.wait('@updateProfile');
    
    // Verify success message
    cy.contains('Profile updated successfully').should('be.visible');
    
    // Verify updated information is displayed
    cy.contains('Updated Name').should('be.visible');
    cy.contains('555-987-6543').should('be.visible');
  });

  it('should display payment methods', () => {
    cy.visit('/profile');
    
    // Navigate to payment methods section
    cy.contains('Payment Methods').click();
    
    // Wait for payment methods to load
    cy.wait('@stripeAPI');
    
    // Verify payment methods are displayed
    cy.contains('Visa ending in 4242').should('be.visible');
    cy.contains('Mastercard ending in 5555').should('be.visible');
  });

  it('should allow adding a new payment method', () => {
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
    
    // Mock the attach payment method API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'attach-payment-method') {
        req.reply({
          statusCode: 200,
          body: { success: true }
        });
      }
    }).as('attachPaymentMethod');
    
    // Save card
    cy.contains('Save Card').click();
    
    // Wait for payment method to be attached
    cy.wait('@attachPaymentMethod');
    
    // Verify success message
    cy.contains('Payment method added successfully').should('be.visible');
  });

  it('should allow setting a default payment method', () => {
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
    
    // Mock the set default payment method API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'set-default-payment') {
        req.reply({
          statusCode: 200,
          body: { success: true }
        });
      }
    }).as('setDefaultPaymentMethod');
    
    // Wait for default payment method to be set
    cy.wait('@setDefaultPaymentMethod');
    
    // Verify success message
    cy.contains('Default payment method updated').should('be.visible');
  });

  it('should allow removing a payment method', () => {
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
    
    // Mock the detach payment method API
    cy.intercept('POST', '**/functions/v1/stripe-api', (req) => {
      if (req.body && req.body.action === 'detach-payment-method') {
        req.reply({
          statusCode: 200,
          body: { success: true }
        });
      }
    }).as('detachPaymentMethod');
    
    // Wait for payment method to be detached
    cy.wait('@detachPaymentMethod');
    
    // Verify success message
    cy.contains('Payment method removed').should('be.visible');
    
    // Verify card is no longer displayed
    cy.contains('Mastercard ending in 5555').should('not.exist');
  });
});
