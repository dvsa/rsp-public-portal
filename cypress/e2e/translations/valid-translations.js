import { Given, Then, And } from "cypress-cucumber-preprocessor/steps";

Given('I am on the {string} page', (pageName) => {
    cy.contains(pageName);
});

Then('I should see the page change to the {string} language', (language) => {
    cy.fixture('translations.json').then(translations => cy.get('h1').contains(translations[language]));
});

And('a cookie will be set with the {string} language code', (languageCode) => {
    cy.getCookie('locale').should('have.property', 'value', languageCode);
});
