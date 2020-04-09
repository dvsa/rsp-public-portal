import { And } from "cypress-cucumber-preprocessor/steps";

And('The user navigates to the {string} page', (pageName) => {
  cy.fixture('urls.json').then(urls => cy.visit(urls[pageName]));
});
