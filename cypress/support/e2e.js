// ***********************************************************
// This file is used to load plugins and extend Cypress commands
// ***********************************************************

import './commands';

// Custom Cypress configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on uncaught exceptions from the application
  // This is useful for testing applications that might have expected errors
  console.log('Uncaught exception:', err.message);
  return false;
});

// Before each test
beforeEach(() => {
  // Clear localStorage and sessionStorage for clean test runs
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up viewport
  cy.viewport(1280, 720);
  
  // Wait for application to be ready
  cy.window().should('have.property', 'document');
});

// Placeholder for visual regression commands (disabled for now)
Cypress.Commands.add('matchImageSnapshot', (name, options = {}) => {
  cy.log(`Would take image snapshot: ${name}`);
  cy.takeNamedScreenshot(name, options);
});

Cypress.Commands.add('compareSnapshot', (name, options = {}) => {
  cy.log(`Would compare snapshot: ${name}`);
  cy.takeNamedScreenshot(name, options);
});
