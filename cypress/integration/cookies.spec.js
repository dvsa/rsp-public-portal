context('Cookie Preferences page', () => {

    beforeEach(() => {
        cy.visit('http://localhost:3000/cookie-preferences');
    });

    describe('Change cookie preferences', () => {

        it('displays the Cookie Preferences title', () => {
            cy.contains('Cookies on GOV.UK');
        });

        it('sets optional cookies to off by default', () => {
            cy.clearCookies();
            const radioAnalyticsOff = cy.get('#analytics-off');
            radioAnalyticsOff.should('be.checked');
        });

        it('changes preferences to ON', () => {
            cy.clearCookies();
            const radioAnalyticsOn = cy.get('#analytics-on');
            radioAnalyticsOn.check();
            radioAnalyticsOn.should('be.checked');

            const buttonSavePrefs = cy.contains('Save changes');
            buttonSavePrefs.click();

            const preferencesCookie = cy.getCookie('cm-user-preferences');
            preferencesCookie.should('exist');
            preferencesCookie.should('have.property', 'value', '%7B%22analytics%22%3A%22on%22%7D');
        });

        it('changes preferences to OFF', () => {
            const radioAnalyticsOff = cy.get('#cookie-preferences-form').find('#analytics-off');
            radioAnalyticsOff.check();
            radioAnalyticsOff.should('be.checked');

            const buttonSavePrefs = cy.contains('Save changes');
            buttonSavePrefs.click();

            const preferencesCookie = cy.getCookie('cm-user-preferences');
            preferencesCookie.should('exist');
            preferencesCookie.should('have.property', 'value', '%7B%22analytics%22%3A%22off%22%7D');
        });

        it('displays confirmation when preferences are saved', () => {
            cy.clearCookies();
            const buttonSavePrefs = cy.contains('Save changes');
            buttonSavePrefs.click();
            cy.get('#cookie-preferences-confirmation').should('not.have.class', 'hidden');
        });
    });
});
