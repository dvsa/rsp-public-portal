import { When } from "cypress-cucumber-preprocessor/steps";

When('I want to display the page in {string}', (language) => {
    const languageLink = cy.contains(language);
    languageLink.click();
});
