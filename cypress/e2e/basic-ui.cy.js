describe('Basic UI Functionality', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    cy.visitJobsApp('new');
    cy.waitForStore();
    cy.checkConsoleErrors();
  });

  it('should load the application successfully', () => {
    cy.get('body').should('be.visible');
    // Check for global-store element (not migrated version)
    cy.get('global-store').should('exist');
    cy.get('.sidebar-nav').should('be.visible');
    
    // Take screenshot of initial load
    cy.takeNamedScreenshot('app-initial-load');
    
    // Measure page load performance
    cy.measurePageLoad('Jobs Application');
  });

  it('should navigate between sections', () => {
    const sections = ['jobs', 'resumes', 'settings'];
    
    sections.forEach((section) => {
      cy.navigateToSection(section);
      cy.takeNamedScreenshot(`section-${section}`);
      cy.wait(500); // Allow section to fully load
    });
  });

  it('should display job list interface correctly', () => {
    // Check that the job list interface is visible and functional
    cy.get('#items-list').should('be.visible');
    cy.get('#items-header').should('contain.text', 'Jobs');
    
    // The list should be empty by default (no jobs seeded)
    cy.get('.empty-state').should('be.visible');
    
    cy.takeNamedScreenshot('job-list-interface');
  });

  it('should handle empty state properly', () => {
    cy.get('#items-list').should('be.visible');
    cy.get('.empty-state').should('be.visible');
    
    cy.takeNamedScreenshot('empty-state');
  });

  it('should display settings section', () => {
    // Click settings nav item
    cy.get('[data-section="settings"]').click();
    // Settings section doesn't use title like other sections, just verify panel is visible
    cy.get('#settings-panel').should('be.visible');

    cy.takeNamedScreenshot('settings-section');
  });

  it('should be responsive on different viewports', () => {
    const viewports = [
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    viewports.forEach((viewport) => {
      cy.viewport(viewport.width, viewport.height);
      cy.wait(500);
      cy.takeNamedScreenshot(`responsive-${viewport.name}`);
      
      // Check that key elements are still visible and accessible
      cy.get('.sidebar-nav').should('be.visible');
      cy.get('#section-title').should('be.visible');
    });
  });

  it('should maintain application state across page reloads', () => {
    // Reload the page and verify it still works
    cy.reload();
    cy.waitForStore();
    
    // Check that the application still loads properly
    cy.get('.sidebar-nav').should('be.visible');
    cy.get('#items-list').should('be.visible');
    cy.get('#section-title').should('contain.text', 'Jobs');
    
    cy.takeNamedScreenshot('page-reload-test');
  });

  it('should perform basic accessibility checks', () => {
    cy.checkA11y();
    cy.takeNamedScreenshot('accessibility-check');
  });
});