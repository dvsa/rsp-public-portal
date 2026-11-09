const path = require('path');
const { expect } = require('chai');
const nunjucks = require('nunjucks');
const translations = require('../../src/server/i18n/en.json');

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader([
  path.resolve(__dirname, '../../src/server/views'),
  path.resolve(__dirname, '../../node_modules/govuk-frontend/dist'),
]), { autoescape: false });

describe('Payment code template', () => {
  it('explains an expired code and restores the existing assistance and contact information', () => {
    const html = env.render('payment/index.njk', {
      t: translations,
      invalidPaymentCode: true,
      type: 'overdue',
      id: 'testgroup',
    });

    expect(html).to.include(translations.payment_code_page.overdue_error.description);
    expect(html).to.include(translations.payment_code_page.overdue_error.invalid_code);
    expect(html).to.include(translations.payment_code_page.overdue_error.assistance_intro);
    expect(html).to.include(translations.payment_code_page.overdue_error.assistance_instructions);
    expect(html).to.include(translations.payment_code_page.overdue_error.contact);
    expect(html).to.include('testgroup');
    expect(html).to.include(`href="mailto:${translations.payment_code_page.contact_email}"`);
    expect(html).to.include(translations.payment_code_page.contact_phone);
    expect(html).to.include(translations.payment_code_page.contact_opening_hours);
    expect(html).not.to.include(translations.payment_code_page.error.description);
  });

  it('renders expired-code guidance without requiring a code in the URL', () => {
    const html = env.render('payment/index.njk', {
      t: translations,
      invalidPaymentCode: true,
      type: 'overdue',
    });

    expect(html).to.include(translations.payment_code_page.overdue_error.description);
    expect(html).not.to.include(translations.payment_code_page.overdue_error.payment_code_colon);
  });

  it('escapes the code displayed in the expiry guidance', () => {
    const html = env.render('payment/index.njk', {
      t: translations,
      invalidPaymentCode: true,
      type: 'overdue',
      id: '<em>testgroup</em>',
    });

    expect(html).to.include('&lt;em&gt;testgroup&lt;/em&gt;');
    expect(html).not.to.include('<em>testgroup</em>');
  });

  it('keeps invalid-code errors separate from expired-code guidance', () => {
    const html = env.render('payment/index.njk', {
      t: translations,
      invalidPaymentCode: true,
      type: 'invalid',
    });

    expect(html).to.include(translations.payment_code_page.error.invalid_code);
    expect(html).to.include(translations.payment_code_page.error.description);
    expect(html).not.to.include(translations.payment_code_page.overdue_error.assistance_intro);
  });

  it('does not show an error on the initial payment-code page', () => {
    const html = env.render('payment/index.njk', { t: translations });

    expect(html).not.to.include('class="govuk-error-summary"');
    expect(html).not.to.include(translations.payment_code_page.error.description);
    expect(html).not.to.include(translations.payment_code_page.overdue_error.description);
  });
});

describe('Cookie preferences template', () => {
  it('initially hides the save confirmation using the class removed by the save callback', () => {
    const html = env.render('cookies/index.njk', { t: translations });

    expect(html).to.match(/id="cookie-preferences-confirmation" class="cookie-preferences-confirmation govuk-!-display-none"/);
    expect(html).to.include(translations.cookie_preferences_page.confirmation_title);
    expect(html).to.include('id="cookie-preferences-form"');
  });

  it('renders the saved message as a success notification banner with its return link', () => {
    const html = env.render('cookies/index.njk', { t: translations });

    expect(html).to.include('govuk-notification-banner--success');
    expect(html).to.include('role="alert"');
    expect(html).to.include('data-disable-auto-focus="true"');
    expect(html).to.match(/class="govuk-notification-banner__title"[^>]*>\s*Success\s*<\/h2>/);
    expect(html).to.include(`<h3 class="govuk-notification-banner__heading">${translations.cookie_preferences_page.confirmation_title}</h3>`);
    expect(html).to.include(translations.cookie_preferences_page.confirmation_text);
    expect(html).to.include('id="confirmation-go-back" href="/" class="govuk-notification-banner__link"');
  });
});
