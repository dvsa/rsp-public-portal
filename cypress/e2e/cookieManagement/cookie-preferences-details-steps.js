import { Given, When, And } from "cypress-cucumber-preprocessor/steps";

Given('I am on the {string} page', (pageName) => {
  cy.contains(pageName);
});

When('I click the Cookie Details link', () => {
  cy.contains('Find out more about cookies on Roadside Payments').click();
});

Given('I am on the {string} page', (pageName) => {
  cy.contains(pageName);
});

When('I click the Cookie preferences link', () => {
  cy.contains('change which cookies you’re happy for us to use.').click();
});
