import { When } from "cypress-cucumber-preprocessor/steps";

When('I want to display the {string} page in {string}', (pageName) => {
    cy.fixture('urls.json').then(urls => cy.visit(urls[pageName], { qs: { clang: 'vl' } }));
});
