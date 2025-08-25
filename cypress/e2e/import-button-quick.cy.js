describe('Import Job Button Quick Test', () => {
  beforeEach(() => {
    cy.visit('/jobs-new.html');
    cy.wait(3000); // Wait for app to fully load
  });

  it('should click Import Job button and verify modal opens', () => {
    // Clear any existing API keys to test the fix
    cy.window().then((win) => {
      win.localStorage.removeItem('claude_api_key');
      win.localStorage.removeItem('openai_api_key');
    });
    
    // Click the Import Job button
    cy.get('#import-job-btn').should('be.visible').click();

    // Verify modal opened (our bug fix - modal should open even without API keys)
    cy.get('#import-job-modal').should('exist').and('not.have.class', 'hidden');
    
    // Take screenshot showing the fix works
    cy.screenshot('import-job-modal-opened-without-api');
    
    // Verify the API warning appears inside the modal (part of our fix)
    cy.get('#import-api-warning').should('be.visible');
    
    cy.log('✅ Import Job button fix verified: Modal opens and shows API warning');
  });

  it('should allow form filling even without API keys', () => {
    cy.window().then((win) => {
      win.localStorage.removeItem('claude_api_key');
      win.localStorage.removeItem('openai_api_key');
    });
    
    cy.get('#import-job-btn').click();
    cy.get('#import-job-modal').should('not.have.class', 'hidden');

    // Try to fill the manual import description (no API keys path)
    cy.get('#import-job-description').should('exist').clear().type('Test Company - Software Engineer');
    
    cy.screenshot('import-job-form-fillable');
    
    cy.log('✅ Manual job form entry works without API keys');
  });
});
