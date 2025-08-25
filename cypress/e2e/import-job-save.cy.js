describe('Import Job and Save (AI stub)', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.visitJobsApp('new');
    cy.waitForStore();
  });

  it('stubs AI proxy, imports job and saves it', () => {
    // Prepare a fake parsed job response from the server-side AI proxy
    const parsedJob = {
      title: 'Software Engineering Director - Mobile',
      company: 'Samsara',
      location: 'Remote - US',
      description: 'Lead and scale mobile development teams at Samsara.',
      requirements: '10+ years experience; React Native; GraphQL',
      skills: 'Leadership, React Native, GraphQL',
      applyUrl: 'https://samsara.example/apply'
    };

    // Intercept proxy call and return structured result
    cy.intercept('POST', '**/ai-proxy.php', (req) => {
      req.reply({
        statusCode: 200,
        body: { result: parsedJob }
      });
    }).as('aiProxy');

    // Ensure an API key is present so the import flow uses AI
    cy.setAPIKey('openai', 'test-key');

    // Open import modal
    cy.get('#import-job-btn').should('be.visible').click();
    cy.openModal('import-job-modal');

    // Fill URL method and submit
    cy.get('#import-method-url').check();
    cy.get('#import-job-url').clear().type('https://example.com/job/123');
    cy.get('#import-job-submit').click();

    // Wait for AI proxy to be called
    cy.wait('@aiProxy');

    // The form modal should open with pre-filled values
    cy.openModal('form-modal');

    // Verify the form fields were populated from the parsed job
    cy.get('#job-company').should('have.value', 'Samsara');
    cy.get('#job-position').should('have.value', 'Software Engineering Director - Mobile');
    cy.get('#job-location').should('have.value', 'Remote - US');

    // Save the job
    cy.get('#form-save').click();

    // Verify the job was persisted to localStorage
    cy.window().then((win) => {
      const data = JSON.parse(win.localStorage.getItem('jobHuntData') || '{}');
      expect(data).to.have.property('jobs');
      const found = (data.jobs || []).some(j => j.company === 'Samsara' && (j.position || j.title || j.position === 'Software Engineering Director - Mobile' || (j.position && j.position.includes && j.position.includes('Software Engineering Director'))));
      expect(found).to.equal(true);
    });
  });
});

