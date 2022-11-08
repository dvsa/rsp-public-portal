context('Home page', () => {
  beforeEach(() => {
    cy.visit('');
  });

  it('displays the payment title', () => {
    cy.contains('Pay a DVSA roadside fine');
  });

  it('displays the info text', () => {
    cy.contains("If you don't pay a fine on time, your vehicle could be immobilised, you might have to pay more, or you could be taken to court.");
  });

  it('links to the French page from English', () => {
    cy.contains('Français').click();
    cy.url().should('include', 'clang=fr');
    cy.contains('Payer une pénalité DVSA');
  });

  it('visits the payment code page', () => {
    cy.contains('Start now').click();
    cy.url().should('include', '/payment-code');
  });

  it('opens the feedback page in a new tab', () => {
    const feedbackLink = cy.contains('feedback');

    feedbackLink.should('have.attr', 'target', '_blank');
    feedbackLink.should('have.attr', 'href', 'https://www.smartsurvey.co.uk/s/roadsidepayments/');
  });

  it('links to the gov.uk call charges page', () => {
    const callChargesLink = cy.contains('Find out about call charges');
    callChargesLink.should('have.attr', 'href', 'https://www.gov.uk/call-charges');
  });
});
