Cypress.Commands.add('login', (email) => {
  cy.readFile('../server/seeds/data/lighthouse-tokens.json').then((tokens) => {
    const token = tokens[email];
    if (!token) {
      throw new Error(`No token for ${email}`);
    }
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('lastCheckIn', new Date().toISOString().slice(0, 10));
  });
});

Cypress.Commands.add('loginAsLighthouseUser', () => {
  cy.login('lighthouse@test.local');
});

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin123@example.com');
});
