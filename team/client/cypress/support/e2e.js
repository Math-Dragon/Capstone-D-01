import './commands';
import '@cypress-audit/lighthouse/commands';

Cypress.on('uncaught:exception', () => false);
