import sinon from 'sinon';
import * as PaymentCodeController from '../../src/server/controllers/paymentCode.controller';

describe('Payment Code Controller', () => {
  describe('redirects to home page with validation error', () => {
    let redirectSpy;
    let renderSpy;
    before(() => {
      redirectSpy = sinon.spy({ redirect: () => { } }, 'redirect');
      renderSpy = sinon.spy();
    });
    it('should redirect to enter reference page with invalid payment code error type', async () => {
      const req = {
        query: {
          invalidPaymentCode: 'invalidPaymentCode',
          type: 'invalid',
        },
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'invalid' });
    });
    it('should redirect to enter reference page with overdue payment code error type', async () => {
      const req = {
        query: {
          invalidPaymentCode: 'invalidPaymentCode',
          type: 'overdue',
        },
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'overdue' });
    });
    it('should redirect to payment index page with no payment code error', async () => {
      const req = {
        query: {},
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index');
    });
  });
});
