import { Given } from "cypress-cucumber-preprocessor/steps";

Given('The entry point is the {string} page', () => {
    cy.visit('/');
});
