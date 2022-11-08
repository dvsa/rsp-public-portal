import { Given, When, And, Then } from "cypress-cucumber-preprocessor/steps";

Given('I am on the {string} page', (pageName) => {
  cy.contains(pageName);
});

And('I have not set my Cookie preferences before', () => {
  cy.clearCookies();
});

When('I choose to accept all cookies', () => {
  const buttonAcceptAll = cy.contains('Accept all cookies');
  buttonAcceptAll.click();
});

Then('All cookies should be set to on', () => {
  cy.getCookie('cm-user-preferences').should('have.property', 'value', '%7B%22analytics%22%3A%22on%22%7D');
});

And('I will not see the cookie banner', () => {
  cy.get('#global-cookie-banner').should('have.class', 'hidden');
});


Given('I am on the {string} page', (pageName) => {
  cy.contains(pageName);
});

And('I have not set my Cookie preferences before', () => {
  cy.clearCookies();
});

When('I choose to set my Cookie preferences', () => {
  const buttonSetPreferences = cy.contains('Set cookie preferences');
  buttonSetPreferences.click();
});

Then('I should be taken to the Cookie preferences page', () => {
  cy.url().should('include', '/cookie-preferences');
});
