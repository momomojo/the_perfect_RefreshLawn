describe('Network Resilience', () => {
  beforeEach(() => {
    // Log in before each test
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
  });

  it('should show offline warning when network is disconnected', () => {
    cy.visit('/booking');
    
    // Simulate offline status
    cy.setNetworkStatus(false);
    
    // Verify offline warning is displayed
    cy.contains('You are currently offline').should('be.visible');
    
    // Restore online status
    cy.setNetworkStatus(true);
    
    // Verify offline warning is no longer displayed
    cy.contains('You are currently offline').should('not.exist');
  });

  it('should disable payment-related actions when offline', () => {
    cy.visit('/profile');
    
    // Navigate to payment methods section
    cy.contains('Payment Methods').click();
    
    // Simulate offline status
    cy.setNetworkStatus(false);
    
    // Verify offline warning is displayed
    cy.contains('You are currently offline').should('be.visible');
    
    // Verify add payment method button is disabled
    cy.contains('Add New Credit/Debit Card').should('be.disabled');
    
    // Restore online status
    cy.setNetworkStatus(true);
    
    // Verify add payment method button is enabled
    cy.contains('Add New Credit/Debit Card').should('not.be.disabled');
  });

  it('should retry failed API calls when network is restored', () => {
    cy.visit('/booking');
    
    // Intercept services API call and make it fail
    cy.intercept('GET', '**/rest/v1/services*', {
      statusCode: 500,
      body: { error: 'Network error' }
    }).as('failedServicesRequest');
    
    // Wait for failed request
    cy.wait('@failedServicesRequest');
    
    // Verify error message is displayed
    cy.contains('Failed to load services').should('be.visible');
    
    // Intercept services API call again but make it succeed this time
    cy.intercept('GET', '**/rest/v1/services*', { fixture: 'services.json' }).as('successfulServicesRequest');
    
    // Click retry button
    cy.contains('Retry').click();
    
    // Wait for successful request
    cy.wait('@successfulServicesRequest');
    
    // Verify services are displayed
    cy.contains('Lawn Mowing').should('be.visible');
    cy.contains('Lawn Fertilization').should('be.visible');
    cy.contains('Weed Control').should('be.visible');
  });

  it('should queue operations when offline and execute them when online', () => {
    cy.visit('/profile');
    
    // Wait for profile data to load
    cy.intercept('GET', '**/rest/v1/profiles*', { fixture: 'user-profile.json' }).as('getProfile');
    cy.wait('@getProfile');
    
    // Click edit button
    cy.contains('Edit').click();
    
    // Update profile information
    cy.get('input[name="name"]').clear().type('Offline Update');
    cy.get('input[name="phone"]').clear().type('555-999-8888');
    
    // Simulate offline status
    cy.setNetworkStatus(false);
    
    // Verify offline warning is displayed
    cy.contains('You are currently offline').should('be.visible');
    
    // Save changes
    cy.contains('Save Changes').click();
    
    // Verify offline queue message
    cy.contains('Changes will be saved when you reconnect').should('be.visible');
    
    // Restore online status
    cy.setNetworkStatus(true);
    
    // Mock the update profile API
    cy.intercept('PATCH', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: {
        data: {
          id: 'test-user-id',
          name: 'Offline Update',
          phone: '555-999-8888'
        }
      }
    }).as('updateProfile');
    
    // Wait for profile update
    cy.wait('@updateProfile');
    
    // Verify success message
    cy.contains('Profile updated successfully').should('be.visible');
    
    // Verify updated information is displayed
    cy.contains('Offline Update').should('be.visible');
    cy.contains('555-999-8888').should('be.visible');
  });

  it('should handle slow network conditions gracefully', () => {
    // Simulate slow network
    cy.intercept('GET', '**/rest/v1/services*', (req) => {
      // Delay the response by 3 seconds
      req.on('response', (res) => {
        res.setDelay(3000);
      });
    }).as('slowServicesRequest');
    
    cy.visit('/booking');
    
    // Verify loading indicator is displayed
    cy.contains('Loading services...').should('be.visible');
    
    // Wait for slow request to complete
    cy.wait('@slowServicesRequest');
    
    // Verify services are displayed after loading
    cy.contains('Loading services...').should('not.exist');
    cy.contains('Select Service Type').should('be.visible');
  });
});
