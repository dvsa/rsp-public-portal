import { Given, Then, But } from "cypress-cucumber-preprocessor/steps";

Given('I am on the {string} page', (pageName) => {
    cy.contains(pageName);
});

Then('I should see the on radio button checked', () => {
    const radioAnalyticsOff = cy.get('#analytics-on');
    radioAnalyticsOff.should('be.checked');
});

And('I see the success banner notification', () => {
    const buttonSavePrefs = cy.contains('Save changes');
    buttonSavePrefs.click();
    cy.get('#cookie-preferences-confirmation').should('not.have.class', 'hidden');
});

But('I will not see the cookie banner', () => {
    cy.get('#global-cookie-banner').should('have.class', 'hidden');
});