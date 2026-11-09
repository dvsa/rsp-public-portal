const path = require('path');
const { expect } = require('chai');
const nunjucks = require('nunjucks');
const translations = require('../../src/server/i18n/en.json');

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader([
  path.resolve(__dirname, '../../src/server/views'),
  path.resolve(__dirname, '../../node_modules/govuk-frontend/dist'),
]), { autoescape: false });

describe('Individual penalty details template', () => {
  ['UNPAID', 'PAID'].forEach((status) => {
    it(`aligns all ${status.toLowerCase()} penalty rows across four columns`, () => {
      const html = env.render('payment/paymentDetails.njk', {
        t: translations,
        paymentCode: '0123456789abcdef',
        complete: true,
        vehicleReg: 'TEST123',
        issueDate: '09/11/2026',
        location: 'Test site',
        type: 'FPN',
        amount: 100,
        formattedReference: 'TEST-REFERENCE',
        status,
        paymentAuthCode: status === 'PAID' ? 'TEST-AUTH' : undefined,
        paymentDate: status === 'PAID' ? '09/11/2026' : undefined,
      });

      const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g);
      expect(html).to.include(`<h1 class="govuk-heading-l">${translations.penalty_details_page.penalty_details_title}</h1>`);
      if (status === 'UNPAID') {
        expect(html).to.include(`<p class="govuk-body govuk-!-font-weight-bold">${translations.penalty_details_page.intro_part_paid}</p>`);
      } else {
        expect(html).to.include(`<p class="govuk-body">${translations.penalty_details_page.intro_paid}</p>`);
      }
      expect(rows).to.have.lengthOf(status === 'PAID' ? 8 : 6);
      expect(rows[1]).to.include('TEST123');
      rows.forEach((row) => {
        const cells = row.match(/<td\b[^>]*>/g);
        const columnCount = cells.reduce((count, cell) => {
          const colspan = cell.match(/colspan="(\d+)"/);
          return count + (colspan ? Number(colspan[1]) : 1);
        }, 0);

        expect(columnCount).to.equal(4);
      });
    });
  });
});
