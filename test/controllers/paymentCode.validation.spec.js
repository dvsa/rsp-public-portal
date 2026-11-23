import { afterEach, describe, it } from 'mocha';
import sinon from 'sinon';
import config from '../../src/server/config';
import * as PaymentCodeController from '../../src/server/controllers/paymentCode.controller';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import PenaltyService from '../../src/server/services/penalty.service';
import paymentCodeValidation from '../../src/server/validation/paymentCode';

const paymentCode = 'synth00000000001';

describe('Payment code controller validation boundaries', () => {
  let sandbox;
  let response;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(console, 'error');
    response = {
      render: sandbox.spy(),
      redirect: sandbox.spy(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('renders an error when the submitted payment code is invalid', async () => {
    const request = { body: { payment_code: 'x' } };
    PaymentCodeController.validatePaymentCode[0](request, response, () => {});
    await paymentCodeValidation[0].run(request);
    PaymentCodeController.validatePaymentCode[2](request, response);

    sinon.assert.calledWith(response.render, 'payment/index', { invalidPaymentCode: true });
    sinon.assert.notCalled(response.redirect);
  });

  it('redirects an invalid payment-code path before looking up a penalty', async () => {
    const penaltyLookup = sandbox.stub(PenaltyService.prototype, 'getByPaymentCode');
    const request = { params: { payment_code: 'x' } };
    await paymentCodeValidation[0].run(request);
    await PaymentCodeController.getPaymentDetails[1](request, response);

    sinon.assert.calledWith(response.redirect, '../payment-code?invalidPaymentCode');
    sinon.assert.notCalled(penaltyLookup);
  });

  it('renders valid single-penalty data when no issue date is supplied', async () => {
    const penaltyLookup = sandbox.stub(PenaltyService.prototype, 'getByPaymentCode').resolves({
      paymentCode,
      enabled: true,
      status: 'UNPAID',
      type: 'FPN',
      vehicleReg: 'SYNTHETIC',
      location: 'Synthetic location',
      amount: 100,
    });
    sandbox.stub(config, 'pendingPaymentTimeMilliseconds').returns(900000);
    const request = { params: { payment_code: paymentCode } };
    await paymentCodeValidation[0].run(request);
    await PaymentCodeController.getPaymentDetails[1](request, response);
    await new Promise((resolve) => setImmediate(resolve));

    sinon.assert.calledWith(penaltyLookup, paymentCode);
    sinon.assert.calledWith(response.render, 'payment/paymentDetails');
    sinon.assert.notCalled(response.redirect);
  });

  it('reports a fully paid group summary as paid', async () => {
    const paymentLookup = sandbox.stub(PenaltyGroupService.prototype, 'getPaymentsByCodeAndType')
      .resolves({ penaltyDetails: [{ status: 'PAID' }], totalAmount: 100, penaltyType: 'FPN' });
    sandbox.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode').resolves({
      paymentCode: 'synthetic-group-code',
      penaltyGroupDetails: { fpnPaymentStartTime: undefined },
    });
    sandbox.stub(config, 'pendingPaymentTimeMilliseconds').returns(900000);

    await PaymentCodeController.getMultiPenaltyPaymentSummary[0]({
      params: { payment_code: 'synthetic-group-code', type: 'FPN' },
    }, response);

    sinon.assert.calledWith(paymentLookup, 'synthetic-group-code', 'FPN');
    sinon.assert.calledWithMatch(response.render, 'payment/multiPaymentSummary', sinon.match({
      paymentStatus: 'PAID',
      paymentPending: false,
    }));
  });
});
