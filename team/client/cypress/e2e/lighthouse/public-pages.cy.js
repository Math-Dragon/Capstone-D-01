describe('Lighthouse — Public Pages', () => {
  it('home page', () => {
    cy.visit('/');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });

  it('login page', () => {
    cy.visit('/login');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });

  it('register page', () => {
    cy.visit('/register');
    cy.lighthouse({
      performance: 50,
      accessibility: 90,
      'best-practices': 80,
      seo: 80,
    });
  });
});
