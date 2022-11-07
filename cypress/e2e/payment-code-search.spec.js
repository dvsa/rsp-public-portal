const INVALID_CODE_TOO_MANY_CHARS = '1234567890123456';
const ERROR_HEADER = 'There was a problem';
const ERROR_BODY = 'The payment code you entered was not recognised';
const VALIDATION_FAILED_MESSAGE = 'Enter a valid payment code';

function displaysError() {
  cy.contains(ERROR_HEADER);
  cy.contains(ERROR_BODY);
  cy.contains(VALIDATION_FAILED_MESSAGE);
}

context('enter payment code page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/payment-code');
  });

  it('display the title', () => {
    cy.contains('Enter payment code');
  });

  it('submits an invalid payment code', () => {
    cy.get('#payment_code').type(INVALID_CODE_TOO_MANY_CHARS);
    cy.contains('Continue').click();
    cy.url().should('include', '?invalidPaymentCode');
    displaysError();
  });

  it('display an error when an empty payment code is submitted', () => {
    cy.contains('Continue').click();
    cy.url().should('not.include', '?invalidPaymentCode');
    displaysError();
  });

  it('submits a valid payment code', () => {
    const paymentCode = Cypress.env('paymentCode');
    cy.get('#payment_code').type(paymentCode);
    cy.contains('Continue').click();
    cy.url().should('include', paymentCode);
  });

  it('displays help details when summary clicked', () => {
    cy.contains('Find out about call charges').should('not.be.visible');
    cy.contains("If you don't have a payment code").click();
    cy.contains('Find out about call charges').should('be.visible');
  });

  it('links to the call charges page', () => {
    cy.contains('Find out about call charges').should('have.attr', 'href', 'https://www.gov.uk/call-charges');
  });

  it('navigates to home page when breadcrumb is clicked', () => {
    cy.contains('Home').click();
    cy.url().should('equal', Cypress.config().baseUrl);
  });
});
