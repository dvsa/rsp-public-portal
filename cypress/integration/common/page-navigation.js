import { And } from "cypress-cucumber-preprocessor/steps";

const urlMap = {
  home: '/',
  cookiePreferences: '/cookie-preferences'
}

And('The user navigates to the {string} page', (pageName) => {
  cy.visit(urlMap[pageName]);
});
