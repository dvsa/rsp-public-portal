context('Cookies', () => {
    beforeEach(() => {
        cy.visit('http://localhost:3000/payment-code');
    });

    describe('Cookie preferences have not been set', () => {
        it('displays the cookie banner', () => {
            cy.get('#global-cookie-banner').should('not.have.class', 'hidden');
        });

        it('does not set any non essential cookies', () => {
            const cookies = cy.getCookies();
            cookies.should('have.length', 0);
        });

        it('displays the correct buttons', () => {
            cy.contains('Accept all cookies').should('exist');
            cy.contains('Set cookie preferences').should('exist');
        });
    });

    describe('All cookies are accepted via the cookie banner', () => {
        beforeEach(() => {
            cy.clearCookies();
            cy.get('#global-cookie-banner').find('button').click();
        });

        it('should create the preferences cookie with the correct values', () => {
            const preferencesCookie = cy.getCookie('cm-user-preferences');
            preferencesCookie.should('exist');
            preferencesCookie.should('have.property', 'value', '%7B%22analytics%22%3A%22on%22%7D');
        });

        it('should hide the cookie banner', () => {
            cy.get('#global-cookie-banner').should('have.class', 'hidden');
        })
    });

    describe('Set cookie preferences via the cookie banner or footer link', () => {
        beforeEach(() => {
            cy.clearCookies();
        });

        it('should navigate to the cookie preferences page', () => {
            cy.get('#global-cookie-banner').find('.cookie-banner__buttons a').click();
            cy.url().should('include', '/cookie-preferences');
        })

        it('should navigate to the cookie preferences page when the cookies link is clicked', () => {
            cy.visit('http://localhost:3000');
            cy.get('#cookies-link').click();
            cy.url().should('include', '/cookie-preferences');
        })
    });
});
