// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  
  // Wait for login to complete and redirect
  cy.url().should('include', '/dashboard');
});

// Custom command to create a booking
Cypress.Commands.add('createBooking', (serviceType, date, time, address, paymentMethod) => {
  cy.visit('/booking');
  
  // Step 1: Select service type
  cy.contains(serviceType).click();
  
  // Step 2: Select date
  cy.contains(date).click();
  
  // Step 3: Select time
  cy.contains(time).click();
  
  // Step 4: Confirm address
  cy.contains('Current Address').click();
  
  // Step 5: Select one-time service
  cy.contains('No, one-time only').click();
  
  // Step 6: Select payment method
  cy.contains(paymentMethod).click();
  
  // Step 7: Confirm booking
  cy.contains('Confirm Booking').click();
  
  // Wait for booking confirmation
  cy.contains('Booking Confirmed').should('be.visible');
});

// Custom command to add a payment method
Cypress.Commands.add('addPaymentMethod', (cardNumber, expiryDate, cvc, cardholderName) => {
  cy.visit('/profile');
  cy.contains('Payment Methods').click();
  cy.contains('Add New Credit/Debit Card').click();
  
  // Fill in card details
  cy.get('input[name="cardholderName"]').type(cardholderName);
  
  // Use Stripe test card
  cy.get('iframe[name^="__privateStripeFrame"]').then($iframe => {
    const $body = $iframe.contents().find('body');
    cy.wrap($body).find('input[name="cardnumber"]').type(cardNumber);
    cy.wrap($body).find('input[name="exp-date"]').type(expiryDate);
    cy.wrap($body).find('input[name="cvc"]').type(cvc);
  });
  
  cy.contains('Save Card').click();
  cy.contains('Payment method added successfully').should('be.visible');
});

// Custom command to check network status
Cypress.Commands.add('setNetworkStatus', (online) => {
  if (online) {
    cy.window().then((win) => {
      win.navigator.onLine = true;
      win.dispatchEvent(new Event('online'));
    });
  } else {
    cy.window().then((win) => {
      win.navigator.onLine = false;
      win.dispatchEvent(new Event('offline'));
    });
  }
});

// Custom command to intercept Stripe API calls
Cypress.Commands.add('mockStripeAPI', (fixture) => {
  cy.intercept('POST', '**/functions/v1/stripe-api', { fixture }).as('stripeAPI');
});

// Custom command to intercept Supabase API calls
Cypress.Commands.add('mockSupabaseAPI', (route, fixture) => {
  cy.intercept('POST', `**/rest/v1/${route}*`, { fixture }).as(`supabase${route}`);
});
