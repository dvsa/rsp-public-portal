const path = require('path');
const { expect } = require('chai');
const nunjucks = require('nunjucks');
const translations = require('../../src/server/i18n/en.json');

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader([
  path.resolve(__dirname, '../../src/server/views'),
  path.resolve(__dirname, '../../node_modules/govuk-frontend/dist'),
]), { autoescape: false });

describe('Group penalty details template', () => {
  const context = {
    t: translations,
    paymentCode: 'testgroup',
    paymentStatus: 'UNPAID',
    location: 'Test site',
    penaltyGroupDetails: {
      registrationNumber: 'TEST123',
      date: '09/11/2026',
      splitAmounts: [{ type: 'FPN', amount: 100, status: 'UNPAID' }],
    },
    penaltyDetails: [{
      type: 'FPN',
      penalties: [{ formattedReference: 'TEST-REFERENCE', amount: 100, status: 'UNPAID' }],
    }],
  };

  it('aligns summary rows across four columns and bolds their labels like individual penalties', () => {
    const html = env.render('payment/multiPaymentInfo.njk', context);

    const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g).slice(0, 6);

    expect(rows).to.have.lengthOf(6);
    expect(rows[1]).to.include('TEST123');
    rows.forEach((row) => {
      const cells = row.match(/<td\b[^>]*>/g);
      expect(cells[0]).to.include('govuk-!-font-weight-bold');
      const columnCount = cells.reduce((count, cell) => {
        const colspan = cell.match(/colspan="(\d+)"/);
        return count + (colspan ? Number(colspan[1]) : 1);
      }, 0);

      expect(columnCount).to.equal(4);
    });
  });

  it('keeps the payment link in its table row and bolds the outstanding-fines message', () => {
    const html = env.render('payment/multiPaymentInfo.njk', context);
    const tableEnd = html.lastIndexOf('</table>');
    const paymentLink = html.indexOf('href="/payment-code/testgroup/FPN/details"');

    expect(tableEnd).to.be.greaterThan(-1);
    expect(paymentLink).to.be.greaterThan(html.indexOf('<table'));
    expect(paymentLink).to.be.lessThan(tableEnd);
    const buttonRow = html.match(/<tr\b[^>]*>\s*<td\b[^>]*payment-button-cell[^>]*>[\s\S]*?<\/tr>/)[0];
    expect(buttonRow).to.include('colspan="4"');
    expect(buttonRow).to.include('href="/payment-code/testgroup/FPN/details"');
    expect(html).to.include(`<p class="govuk-body govuk-!-font-weight-bold">${translations.penalty_details_page.intro_part_paid}</p>`);
  });

  it('keeps each unpaid type button in its section with the original text and preserves paid receipts', () => {
    const html = env.render('payment/multiPaymentInfo.njk', {
      ...context,
      penaltyGroupDetails: {
        ...context.penaltyGroupDetails,
        splitAmounts: [
          { type: 'FPN', amount: 100, status: 'UNPAID' },
          { type: 'IM', amount: 80, status: 'UNPAID' },
          { type: 'CDN', amount: 50, status: 'PAID' },
        ],
      },
    });

    expect(html).to.include('href="/payment-code/testgroup/FPN/details"');
    expect(html).to.include('href="/payment-code/testgroup/IM/details"');
    const buttons = html.match(/<a\b[^>]*href="\/payment-code\/testgroup\/(?:FPN|IM)\/details"[^>]*>[\s\S]*?<\/a>/g);
    expect(buttons).to.have.lengthOf(2);
    buttons.forEach((button) => {
      expect(button.replace(/<[^>]*>/g, '').trim()).to.equal(translations.penalty_details_page.continue_to_payment_button);
    });
    expect(html.indexOf('href="/payment-code/testgroup/IM/details"')).to.be.lessThan(html.indexOf('data-testid="type_fpn"'));
    expect(html.indexOf('href="/payment-code/testgroup/FPN/details"')).to.be.lessThan(html.indexOf('data-testid="type_cdn"'));
    expect(html).not.to.include('href="/payment-code/testgroup/CDN/details"');
    expect(html).to.include('href="testgroup/CDN/receipt"');
  });

  it('does not show payment buttons or a non-payment warning for a fully paid group', () => {
    const html = env.render('payment/multiPaymentInfo.njk', {
      ...context,
      paymentStatus: 'PAID',
      penaltyGroupDetails: {
        ...context.penaltyGroupDetails,
        splitAmounts: [{ type: 'FPN', amount: 100, status: 'PAID' }],
      },
    });

    expect(html).not.to.include('href="/payment-code/testgroup/FPN/details"');
    expect(html).not.to.include('class="govuk-warning-text"');
    expect(html).to.include('href="testgroup/FPN/receipt"');
  });

  it('removes extra bottom spacing from the multi-penalty disclosure without losing its references', () => {
    const html = env.render('payment/multiPaymentInfo.njk', {
      ...context,
      penaltyDetails: [{
        type: 'FPN',
        penalties: [
          { formattedReference: 'TEST-REFERENCE-1', amount: 40 },
          { formattedReference: 'TEST-REFERENCE-2', amount: 60 },
        ],
      }],
    });

    expect(html).to.match(/<details\b[^>]*class="govuk-details govuk-!-margin-bottom-0"/);
    expect(html).to.include('TEST-REFERENCE-1');
    expect(html).to.include('TEST-REFERENCE-2');
  });
});
