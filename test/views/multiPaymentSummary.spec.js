const path = require('path');
const { expect } = require('chai');
const nunjucks = require('nunjucks');
const translations = require('../../src/server/i18n/en.json');

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader([
  path.resolve(__dirname, '../../src/server/views'),
  path.resolve(__dirname, '../../node_modules/govuk-frontend/dist'),
]), { autoescape: false });

const renderSummary = (overrides = {}) => env.render('payment/multiPaymentSummary.njk', {
  t: translations,
  paymentCode: 'testgroup',
  penaltyType: 'FPN',
  paymentStatus: 'UNPAID',
  paymentPending: false,
  pendingMinutes: 15,
  totalAmount: 200,
  penaltyDetails: [
    { formattedReference: 'TEST-REFERENCE-1', amount: 100, status: 'UNPAID' },
    { formattedReference: 'TEST-REFERENCE-2', amount: 100, status: 'PAID' },
  ],
  ...overrides,
});

describe('Group payment summary template', () => {
  [
    ['FPN', translations.penalty_details_page.pay_fixed_penalties_text],
    ['CDN', translations.penalty_details_page.pay_court_deposits_text],
    ['IM', translations.penalty_details_page.pay_immobilisation_fee_text],
  ].forEach(([penaltyType, title]) => {
    it(`renders ${penaltyType} with the correct heading and payment action`, () => {
      const html = renderSummary({ penaltyType });

      expect(html).to.include(`<h1 class="govuk-heading-xl">${title}</h1>`);
      expect(html).to.include(`action="/payment-code/testgroup/${penaltyType}/payment" method="post"`);
      expect(html).to.match(/<button\b[^>]*type="submit"[^>]*>/);
      expect(html).not.to.match(/<button\b[^>]*disabled/);
      expect(html).to.include('TEST-REFERENCE-1');
      expect(html).to.include('TEST-REFERENCE-2');
      expect(html).to.include(translations.penalty_details.status_unpaid);
      expect(html).to.include(translations.penalty_details.status_paid);
      expect(html).to.include('&pound;200');
      expect(html).to.include('href="/payment-code/testgroup"');
      expect(html).to.include(translations.penalty_details_page.gdpr_notification);
      expect(html).to.include(translations.penalty_details_page.payment_assistance_panel_title);
    });
  });

  it('disables payment and displays the waiting time when a payment is pending', () => {
    const html = renderSummary({ paymentPending: true });

    expect(html).to.match(/<button\b[^>]*disabled/);
    expect(html).to.include(translations.payment_pending_page.pending_notice.replace('MINUTES', '15'));
  });

  it('omits payment controls and guidance when the group payment type is paid', () => {
    const html = renderSummary({ paymentStatus: 'PAID' });

    expect(html).to.include('TEST-REFERENCE-1');
    expect(html).not.to.match(/<button\b[^>]*type="submit"/);
    expect(html).not.to.include(translations.penalty_details_page.gdpr_notification);
    expect(html).not.to.include(translations.penalty_details_page.payment_assistance_panel_title);
  });

  it('does not show a total row for a single penalty', () => {
    const html = renderSummary({
      penaltyDetails: [{ formattedReference: 'TEST-REFERENCE-1', amount: 100, status: 'UNPAID' }],
      totalAmount: 100,
    });

    expect(html).to.include('TEST-REFERENCE-1');
    expect(html).not.to.include(translations.penalty_details_page.amount_due);
  });
});
