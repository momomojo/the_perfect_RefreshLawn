describe('Authentication', () => {
  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should allow a user to sign up', () => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'testPassword123';

    cy.visit('/signup');
    
    // Fill out the sign-up form
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);
    cy.get('input[name="name"]').type('Test User');
    cy.get('input[name="phone"]').type('555-123-4567');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify successful sign-up
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome').should('be.visible');
  });

  it('should allow a user to log in', () => {
    const email = Cypress.env('testUserEmail');
    const password = Cypress.env('testUserPassword');

    cy.visit('/login');
    
    // Fill out the login form
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify successful login
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome').should('be.visible');
  });

  it('should show an error for invalid login credentials', () => {
    cy.visit('/login');
    
    // Fill out the login form with invalid credentials
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify error message
    cy.contains('Invalid login credentials').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('should allow a user to log out', () => {
    const email = Cypress.env('testUserEmail');
    const password = Cypress.env('testUserPassword');

    // Log in first
    cy.login(email, password);
    
    // Click on the profile menu
    cy.get('[data-testid="profile-menu"]').click();
    
    // Click on the logout button
    cy.contains('Log Out').click();
    
    // Verify successful logout
    cy.url().should('include', '/login');
    cy.contains('Sign in to your account').should('be.visible');
  });

  it('should redirect to login page for protected routes when not authenticated', () => {
    cy.visit('/dashboard');
    
    // Verify redirect to login page
    cy.url().should('include', '/login');
    
    cy.visit('/profile');
    
    // Verify redirect to login page
    cy.url().should('include', '/login');
    
    cy.visit('/booking');
    
    // Verify redirect to login page
    cy.url().should('include', '/login');
  });
});
