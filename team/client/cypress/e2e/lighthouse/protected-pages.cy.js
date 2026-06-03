before(() => {
  cy.loginAsLighthouseUser();
  cy.visit('/');
});

describe('Lighthouse — Protected Pages', () => {
  it('dashboard page', () => {
    cy.visit('/');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });

  it('goals page', () => {
    cy.visit('/goals');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });

  it('calendar page', () => {
    cy.visit('/calendar');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });

  it('progress page', () => {
    cy.visit('/progress');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });

  it('coach page', () => {
    cy.visit('/coach');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });
});
