import sinon from 'sinon';
import * as PaymentCodeController from '../../src/server/controllers/paymentCode.controller';

describe('Payment Code Controller', () => {
  describe('redirects to home page with validation error', () => {
    const id = 'id123';
    const query = {
      invalidPaymentCode: 'invalidPaymentCode',
      type: 'overdue',
      id,
    };
    let renderSpy;
    before(() => {
      renderSpy = sinon.spy();
    });
    it('should redirect to enter reference page with invalid payment code error type', async () => {
      const req = {
        query: {
          ...query,
          type: 'invalid',
        },
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'invalid' });
    });
    it('should redirect to enter reference page with overdue payment code error type', async () => {
      const req = {
        query,
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'overdue', id });
    });
    it('should redirect to payment index page with no payment code error', async () => {
      const req = {
        query: {},
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index');
    });
    it('send the payment ID to the payment page validation message', async () => {
      const req = {
        query,
      };
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'overdue', id });
    });
    it('does not send the payment ID if none is provided', async () => {
      const req = {
        query,
      };
      delete req.query.id;
      const resp = { render: renderSpy };
      await PaymentCodeController.index(req, resp);
      sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'overdue' });
    });
  });
});
