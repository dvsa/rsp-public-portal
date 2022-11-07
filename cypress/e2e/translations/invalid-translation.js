import { Given, When, Then, And } from "cypress-cucumber-preprocessor/steps";


Given('I am on the {string} page', (pageName) => {
    cy.contains(pageName);
});

When('The malicious content is injected to the {string} page', (pageName) => {
    cy.fixture('urls.json').then(urls => cy.visit(urls[pageName], { qs: { clang: '>malicious' } }));
});

Then('I should see the {string} page remain in the {string} language', (pageName, language) => {
    cy.fixture('translations.json').then(translations => cy.get('h1').contains(translations[language]));
});

Then('I should see no change to the {string} page', () => {
    cy.fixture('translations.json').then(translations => cy.get('h1').contains(translations.English));
});

And('a locale cookie will not be set', () => {
    cy.getCookie('locale').should('not.exist');
});
