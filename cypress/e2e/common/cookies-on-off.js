import { When } from "cypress-cucumber-preprocessor/steps";

When('I turn Cookies {string}', (radioValue) => {
    cy.clearCookies();
    cy.visit('/cookie-preferences');
    const radioAnalytics = cy.get(`#analytics-${radioValue}`);
    radioAnalytics.check();
});
