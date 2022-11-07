import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I should see {string} in the title', (title) => {
    const heading = cy.get('.heading');
    heading.contains(title);
});
