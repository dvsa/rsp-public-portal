import { Given, When, And } from "cypress-cucumber-preprocessor/steps";

Given('I am on the {string} page', (pageName) => {
    cy.contains(pageName);
});

And('I see the success banner notification', () => {
    const buttonSavePrefs = cy.contains('Save changes');
    buttonSavePrefs.click();
    cy.get('#cookie-preferences-confirmation').should('not.have.class', 'hidden');
});

When('I click the link to go back to the previous page', () => {
    const backLink = cy.contains('Go back to the page you were looking at');
    backLink.click();
});
