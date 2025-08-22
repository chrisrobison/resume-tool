describe('Simple Application Test', () => {
  beforeEach(() => {
    cy.visit('/jobs-new.html');
    cy.wait(2000); // Wait for app to load
  });

  it('should load the application', () => {
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
  });

  it('should find the Import Job button', () => {
    cy.get('#import-job-btn').should('be.visible');
  });

  it('should open import job modal when clicked', () => {
    // Click the Import Job button
    cy.get('#import-job-btn').click();
    
    // Check if a modal appears (look for common modal selectors)
    cy.get('#import-job-modal, .modal, [id*="import"], [class*="modal"]')
      .should('exist')
      .and('be.visible');
  });

  it('should have basic navigation elements', () => {
    cy.get('#main-nav, nav, [id*="nav"]').should('exist');
  });
});