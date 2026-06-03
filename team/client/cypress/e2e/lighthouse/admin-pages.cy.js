before(() => {
  cy.loginAsAdmin();
  cy.visit('/admin');
});

describe('Lighthouse — Admin Page', () => {
  it('admin page', () => {
    cy.visit('/admin');
    cy.lighthouse({
      performance: 40,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });
});
