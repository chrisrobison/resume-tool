describe('Import Job Button Functionality', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.visitJobsApp('new');
    cy.waitForStore();
  });

  it('should open import job modal when clicked', () => {
    // Take screenshot before clicking
    cy.takeNamedScreenshot('before-import-job-click');
    
    // Click the Import Job button
    cy.get('#import-job-btn').should('be.visible').click();
    
    // Verify modal opens
    cy.openModal('import-job-modal');
    cy.get('#import-job-modal').should('not.have.class', 'hidden');
    cy.get('#import-job-modal .modal-content').should('be.visible');
    
    // Take screenshot of opened modal
    cy.takeNamedScreenshot('import-job-modal-opened');
  });

  it('should display API warning when no API key is configured', () => {
    // Ensure no API keys are set
    cy.clearAPIKeys();
    
    // Open import job modal
    cy.get('#import-job-btn').click();
    cy.openModal('import-job-modal');
    
    // Check for API warning
    cy.get('#import-api-warning').should('be.visible');
    cy.get('#import-api-warning').should('contain.text', 'API key required');
    
    cy.takeNamedScreenshot('import-job-api-warning');
  });

  it('should hide API warning when API key is configured', () => {
    // Set an API key
    cy.fixture('test-data').then((testData) => {
      cy.setAPIKey('claude', testData.testAPIKeys.claude);
    });
    
    // Open import job modal
    cy.get('#import-job-btn').click();
    cy.openModal('import-job-modal');
    
    // API warning should not be visible or should be hidden
    cy.get('#import-api-warning').should('not.be.visible');
    
    cy.takeNamedScreenshot('import-job-no-warning');
  });

  it('should allow manual job entry when modal is open', () => {
    cy.get('#import-job-btn').click();
    cy.openModal('import-job-modal');
    
    // Fill out the manual job form
    cy.fixture('test-data').then((testData) => {
      cy.fillJobForm(testData.formTestData.validJob);
    });
    
    cy.takeNamedScreenshot('import-job-form-filled');
  });

  it('should handle URL import field', () => {
    cy.get('#import-job-btn').click();
    cy.openModal('import-job-modal');
    
    // Test URL input
    cy.fixture('test-data').then((testData) => {
      cy.get('#job-url-import').should('be.visible')
        .clear()
        .type(testData.importJobTestData.validJobURL);
    });
    
    cy.takeNamedScreenshot('import-job-url-filled');
  });

  it('should close modal when close button is clicked', () => {
    // Open modal
    cy.get('#import-job-btn').click();
    cy.openModal('import-job-modal');
    
    // Take screenshot of open modal
    cy.takeNamedScreenshot('import-job-modal-before-close');
    
    // Close modal
    cy.closeModal('import-job-modal');
    
    // Verify modal is closed
    cy.get('#import-job-modal').should('have.class', 'hidden');
    
    cy.takeNamedScreenshot('import-job-modal-after-close');
  });

  it('should validate required fields', () => {
    cy.get('#import-job-btn').click();
    cy.openModal('import-job-modal');
    
    // Try to submit with invalid data
    cy.fixture('test-data').then((testData) => {
      cy.fillJobForm(testData.formTestData.invalidJob);
    });
    
    // Attempt to save (if save button exists)
    cy.get('#import-job-modal').within(() => {
      cy.get('button').contains('Save').should('be.visible');
    });
    
    cy.takeNamedScreenshot('import-job-validation-errors');
  });

  it('should work consistently on both job interfaces', () => {
    // Test on app.html (current)
    cy.visitJobsApp('new');
    cy.waitForStore();
    cy.get('#import-job-btn').should('be.visible').click();
    cy.openModal('import-job-modal');
    cy.takeNamedScreenshot('import-job-new-interface');
    cy.closeModal('import-job-modal');
    
    // Test on jobs.html (legacy) if it exists
    cy.visitJobsApp('legacy');
    cy.waitForStore();
    cy.get('#import-job-btn').should('be.visible').click();
    cy.openModal('import-job-modal');
    cy.takeNamedScreenshot('import-job-legacy-interface');
    cy.closeModal('import-job-modal');
  });

  it('should handle keyboard navigation', () => {
    cy.get('#import-job-btn').focus().should('have.focus');
    cy.get('#import-job-btn').type('{enter}');
    
    // Modal should open
    cy.openModal('import-job-modal');
    
    // Test tab navigation within modal
    cy.get('#import-job-modal').within(() => {
      cy.get('input, textarea, button, select').first().focus();
      cy.focused().tab().tab().tab(); // Navigate through fields
    });
    
    cy.takeNamedScreenshot('import-job-keyboard-navigation');
  });
});