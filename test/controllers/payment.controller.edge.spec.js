import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import config from '../../src/server/config';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import CpmsService from '../../src/server/services/cpms.service';
import PaymentService from '../../src/server/services/payment.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import PenaltyService from '../../src/server/services/penalty.service';

const singlePaymentCode = 'synth00000000001';
const singlePenalty = {
  status: 'UNPAID',
  paymentStatus: 'UNPAID',
  paymentCode: singlePaymentCode,
  paymentStartTime: undefined,
  penaltyId: 'SYNTHETIC-PENALTY-001',
  vehicleReg: 'SYNTHETIC',
  formattedReference: 'SYNTHETIC-REFERENCE',
  reference: 'SYNTHETIC-REFERENCE',
  type: 'FPN',
  amount: 123,
};

function paymentRequest(paymentCode = singlePaymentCode) {
  return {
    params: { payment_code: paymentCode },
    query: { receipt_reference: 'SYNTHETIC-RECEIPT-001' },
  };
}

describe('Payment controller failure and edge paths', () => {
  let sandbox;
  let penaltyGet;
  let penaltyUpdate;
  let groupGet;
  let groupUpdate;
  let cpmsSingle;
  let cpmsGroup;
  let cpmsConfirm;
  let paymentMake;
  let response;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(config, 'urlRoot').returns('');
    sandbox.stub(config, 'redirectUrl').returns('http://127.0.0.1/portal');
    sandbox.stub(config, 'pendingPaymentTimeMilliseconds').returns(900000);
    sandbox.stub(console, 'log');
    sandbox.stub(console, 'error');

    penaltyGet = sandbox.stub(PenaltyService.prototype, 'getByPaymentCode');
    penaltyUpdate = sandbox.stub(PenaltyService.prototype, 'updateWithPaymentStartTime');
    groupGet = sandbox.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode');
    groupUpdate = sandbox.stub(PenaltyGroupService.prototype, 'updateWithPaymentStartTime');
    cpmsSingle = sandbox.stub(CpmsService.prototype, 'createCardPaymentTransaction');
    cpmsGroup = sandbox.stub(CpmsService.prototype, 'createGroupCardPaymentTransaction');
    cpmsConfirm = sandbox.stub(CpmsService.prototype, 'confirmPayment');
    paymentMake = sandbox.stub(PaymentService.prototype, 'makePayment');
    response = {
      redirect: sandbox.spy(),
      render: sandbox.spy(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('redirects a pending single payment without starting another transaction', async () => {
    penaltyGet.resolves({
      ...singlePenalty,
      paymentStartTime: Math.floor(Date.now() / 1000),
    });

    await PaymentController.redirectToPaymentPageUnlessPending(paymentRequest(), response);

    sinon.assert.calledOnce(penaltyGet);
    sinon.assert.calledWith(response.redirect, `/payment-code/${singlePaymentCode}`);
    sinon.assert.notCalled(cpmsSingle);
  });

  it('skips pending checks and redirects when a single penalty is already paid', async () => {
    penaltyGet.resolves({ ...singlePenalty, status: 'PAID' });

    await PaymentController.redirectToPaymentPageUnlessPending(paymentRequest(), response);

    sinon.assert.calledTwice(penaltyGet);
    sinon.assert.calledWith(response.redirect, `/payment-code/${singlePaymentCode}`);
    sinon.assert.notCalled(penaltyUpdate);
    sinon.assert.notCalled(cpmsSingle);
  });

  it('falls back to the invalid-code page when the initial lookup fails', async () => {
    penaltyGet.rejects(new Error('synthetic lookup failure'));

    await PaymentController.redirectToPaymentPageUnlessPending(paymentRequest(), response);

    sinon.assert.calledWith(response.redirect, '/?invalidPaymentCode');
    sinon.assert.notCalled(cpmsSingle);
  });

  it('continues single payment initiation when updating its start time fails', async () => {
    penaltyGet.resolves(singlePenalty);
    penaltyUpdate.rejects(new Error('synthetic update failure'));
    cpmsSingle.resolves({ data: { gateway_url: 'http://127.0.0.1/gateway' } });

    await PaymentController.redirectToPaymentPage(paymentRequest(), response);

    sinon.assert.calledWith(penaltyUpdate, singlePenalty.penaltyId);
    sinon.assert.called(cpmsSingle);
    sinon.assert.calledWith(response.redirect, 'http://127.0.0.1/gateway');
  });

  it('continues group payment initiation when updating its start time fails', async () => {
    const group = {
      isPenaltyGroup: true,
      paymentCode: 'synthetic-group-code',
      status: 'UNPAID',
      paymentStatus: 'UNPAID',
      penaltyGroupDetails: {
        registrationNumber: 'SYNTHETIC',
        fpnPaymentStartTime: undefined,
      },
      penaltyDetails: [{
        type: 'FPN',
        penalties: [{ amount: 90, formattedReference: 'SYNTHETIC-REF', vehicleReg: 'SYNTHETIC' }],
      }],
    };
    const request = paymentRequest(group.paymentCode);
    request.params.type = 'FPN';
    groupGet.resolves(group);
    groupUpdate.rejects(new Error('synthetic group update failure'));
    cpmsGroup.resolves({ data: { gateway_url: 'http://127.0.0.1/group-gateway' } });

    await PaymentController.redirectToPaymentPageUnlessPending(request, response);

    sinon.assert.calledWith(groupUpdate, group.paymentCode, 'FPN');
    sinon.assert.called(cpmsGroup);
    sinon.assert.calledWith(response.redirect, 'http://127.0.0.1/group-gateway');
  });

  it('renders a failure page when CPMS reports cancellation for a single payment', async () => {
    penaltyGet.resolves(singlePenalty);
    cpmsConfirm.resolves({ data: { code: 807 } });

    await PaymentController.confirmPayment(paymentRequest(), response);

    sinon.assert.calledWith(response.render, 'payment/failedPayment', { paymentCode: singlePaymentCode });
    sinon.assert.notCalled(paymentMake);
  });

  it('renders a failure page for an unhandled single-payment confirmation code', async () => {
    penaltyGet.resolves(singlePenalty);
    cpmsConfirm.resolves({ data: { code: 999 } });

    await PaymentController.confirmPayment(paymentRequest(), response);

    sinon.assert.calledWith(response.render, 'payment/failedPayment', { paymentCode: singlePaymentCode });
    sinon.assert.notCalled(paymentMake);
  });

  it('renders a failure page when CPMS confirmation rejects', async () => {
    penaltyGet.resolves(singlePenalty);
    cpmsConfirm.rejects(new Error('synthetic CPMS failure'));

    await PaymentController.confirmPayment(paymentRequest(), response);

    sinon.assert.calledWith(response.render, 'payment/failedPayment', { paymentCode: singlePaymentCode });
    sinon.assert.notCalled(paymentMake);
  });

  it('returns to payment details when recording a confirmed payment fails', async () => {
    penaltyGet.resolves(singlePenalty);
    cpmsConfirm.resolves({
      data: { code: 801, receipt_reference: 'SYNTHETIC-RECEIPT-001', auth_code: 'SYNTHETIC-AUTH' },
    });
    paymentMake.rejects(new Error('synthetic payment record failure'));

    await PaymentController.confirmPayment(paymentRequest(), response);

    sinon.assert.called(paymentMake);
    sinon.assert.calledWith(response.redirect, `/payment-code/${singlePaymentCode}`);
  });

  it('redirects to the invalid-code page when penalty lookup fails during confirmation', async () => {
    penaltyGet.rejects(new Error('synthetic lookup failure'));

    await PaymentController.confirmPayment(paymentRequest(), response);

    sinon.assert.calledWith(response.redirect, '/?invalidPaymentCode');
    sinon.assert.notCalled(cpmsConfirm);
  });
});
