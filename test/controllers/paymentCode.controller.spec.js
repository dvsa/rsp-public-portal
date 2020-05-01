import sinon from 'sinon';
import {
  describe, it, after, before,
} from 'mocha';
import { expect } from 'chai';
import * as PaymentCodeController from '../../src/server/controllers/paymentCode.controller';
import * as logger from '../../src/server/utils/logger';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import parsedSinglePenalties from '../data/parsedSinglePenalties';
import parsedMultiPenalties from '../data/parsedMultiPenalties';
import * as pendingPayments from '../../src/server/utils/pending-payments';
import {
  index,
  normalizePaymentcode,
  validatePaymentCode,
  getPaymentDetails,
  warnPendingPayment,
  getMultiPenaltyPaymentSummary,
} from '../../src/server/controllers/paymentCode.controller';

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

describe('Payment Code Controller', () => {
  let req;
  let res;
  let nextSpy;
  let renderSpy;
  let redirectSpy;
  let logErrorSpy;
  let logInfoSpy;

  let mockPenaltySvc;
  let mockPenaltyGroupSvc;
  let mockIsGroupPaymentPending;
  let mockPenaltyGroupSvcPayments;
  const validationErrors = [{
    location: 'body',
    param: 'payment_code',
    value: 'scode',
    msg: 'Invalid value',
    isEmpty: false,
  }];

  before(() => {
    // Express
    renderSpy = sinon.spy();
    nextSpy = sinon.spy();
    redirectSpy = sinon.spy();
    res = {
      render: renderSpy,
      redirect: redirectSpy,
    };

    // Services
    mockPenaltySvc = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
    mockPenaltyGroupSvc = sinon.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode');
    mockPenaltyGroupSvcPayments = sinon.stub(PenaltyGroupService.prototype, 'getPaymentsByCodeAndType');

    // Logging
    logErrorSpy = sinon.spy(logger, 'logError');
    logInfoSpy = sinon.spy(logger, 'logInfo');

    // Utils
    mockIsGroupPaymentPending = sinon.stub(pendingPayments, 'isGroupPaymentPending');
  });

  after(() => {
    mockPenaltySvc.restore();
    mockPenaltyGroupSvc.restore();
    mockIsGroupPaymentPending.restore();
    mockPenaltyGroupSvcPayments.restore();
  });

  afterEach(() => {
    renderSpy.resetHistory();
    nextSpy.resetHistory();
    redirectSpy.resetHistory();
    logErrorSpy.resetHistory();
    logInfoSpy.resetHistory();
    mockPenaltySvc.resetHistory();
    mockPenaltyGroupSvc.resetHistory();
    mockPenaltyGroupSvcPayments.resetHistory();
  });

  describe('Index route', () => {
    context('when the payment code is valid', () => {
      it('should render the payment index page', () => {
        req = { query: { test: true } };
        index(req, res);
        sinon.assert.calledWith(renderSpy, 'payment/index');
      });
    });

    context('when the payment code is invalid', () => {
      it('should render the payment index page with invalid payment code message', () => {
        req = { query: { invalidPaymentCode: true } };
        index(req, res);
        sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true });
      });
    });
  });

  describe('Normalize payment code', () => {
    context('when there is a payment code', () => {
      it('should normalize and set to lowercase', () => {
        req = { body: { payment_code: 'Abcd_1234_Fghi_5678' } };
        normalizePaymentcode(req, res, nextSpy);
        expect(req.body.payment_code).to.equal('abcd1234fghi5678');
        sinon.assert.called(nextSpy);
      });
    });

    context('when there is not a payment code', () => {
      it('should only call next', () => {
        req = { body: { test: true } };
        normalizePaymentcode(req, res, nextSpy);
        sinon.assert.called(nextSpy);
      });
    });
  });

  describe('Validate payment code', () => {
    context('when the payment code is valid', () => {
      it('should redirect to the payment code page', () => {
        req = { body: { payment_code: 'abcd1234fghi5678' } };
        validatePaymentCode[2](req, res);
        sinon.assert.calledWith(redirectSpy, 'payment-code/abcd1234fghi5678');
      });
    });

    context('when the payment code is invalid', () => {
      it('should render the payment page with an invalid payment code message', () => {
        req = { body: { payment_code: 'scode' } };
        validatePaymentCode[2]({ ...req, _validationErrors: validationErrors }, res);
        sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true });
      });

      it('should log the error', () => {
        req = { body: { payment_code: 'scode' } };
        validatePaymentCode[2]({ ...req, _validationErrors: validationErrors }, res);
        sinon.assert.calledWith(logErrorSpy, 'ValidatePaymentCodeError', { payment_code: validationErrors[0] });
      });
    });
  });

  describe('Get payment details', () => {
    context('when the payment code is valid', () => {
      context('for a single penalty', () => {
        let clock;

        beforeEach(() => {
          clock = sinon.useFakeTimers(new Date(2018, 2, 15));

          mockPenaltySvc
            .callsFake((paymentCode) => Promise.resolve(parsedSinglePenalties.find((p) => p.paymentCode === paymentCode)));
        });

        afterEach(() => {
          clock.restore();
        });

        it('should render the payment details page', async () => {
          req = { params: { payment_code: '5e7a4c97c260e699' } };
          await getPaymentDetails[1](req, res);
          sinon.assert.calledWith(renderSpy, 'payment/paymentDetails', {
            ...parsedSinglePenalties[1],
            location: 'Cuerden(M65 J1a - SE of Preston)',
            paymentPending: true,
            pendingMinutes: 15,
          });
        });

        context('not enabled', () => {
          it('should redirect to the invalid payment code page', async () => {
            req = { params: { payment_code: '5ef305b89435c670' } };
            await getPaymentDetails[1](req, res);
            sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
          });
        });

        context('older than 28 days', () => {
          it('should redirect to the invalid payment code page', async () => {
            clock.tick(5184000000); // advance 60 days
            req = { params: { payment_code: '5e7a4c97c260e699' } };
            await getPaymentDetails[1](req, res);
            sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
          });

          it('should log the info', async () => {
            clock.tick(5184000000); // advance 60 days
            req = { params: { payment_code: '5e7a4c97c260e699' } };
            await getPaymentDetails[1](req, res);
            sinon.assert.calledWith(
              logInfoSpy,
              'OldPenaltyAccessAttempt',
              {
                paymentCode: '5e7a4c97c260e699',
                ageDays: 54,
              },
            );
          });
        });

        context('when the penalty service fails', () => {
          it('should redirect to the invalid payment code page', async () => {
            mockPenaltySvc.rejects(new Error({ status: 500, message: 'Internal server error' }));
            req = { params: { payment_code: '5e7a4c97c260e699' } };
            try {
              await getPaymentDetails[1](req, res);
            } catch (error) {
              sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
            }
          });
        });
      });

      context('for a group penalty', () => {
        let clock;

        beforeEach(() => {
          clock = sinon.useFakeTimers(new Date(2018, 2, 15));

          mockPenaltyGroupSvc
            .callsFake((paymentCode) => Promise.resolve(parsedMultiPenalties.find((p) => p.paymentCode === paymentCode)));
        });

        afterEach(() => {
          clock.restore();
        });

        it('should render the multi payment info page', async () => {
          req = { params: { payment_code: '47hsqs103i0' } };
          await getPaymentDetails[1](req, res);
          sinon.assert.calledWith(renderSpy, 'payment/multiPaymentInfo');
        });
      });
    });

    context('when the payment code is invalid', () => {
      it('should render the payment page with an invalid payment code message', async () => {
        req = { body: { payment_code: 'scode' } };
        await getPaymentDetails[1]({ ...req, _validationErrors: validationErrors }, res);
        sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
      });

      it('should log the error', async () => {
        req = { body: { payment_code: 'scode' } };
        await getPaymentDetails[1]({ ...req, _validationErrors: validationErrors }, res);
        sinon.assert.calledWith(logErrorSpy, 'ValidatePaymentCodeError', { payment_code: validationErrors[0] });
      });
    });
  });

  describe('Warn pending payment', () => {
    context('when the payment code is valid', () => {
      context('for a single penalty', () => {
        beforeEach(() => {
          mockPenaltySvc
            .callsFake((paymentCode) => Promise.resolve(parsedSinglePenalties.find((p) => p.paymentCode === paymentCode)));
        });

        it('should render the pending payment page', async () => {
          req = { params: { payment_code: '5e7a4c97c260e699' } };
          await warnPendingPayment[1](req, res);
          sinon.assert.calledWith(renderSpy, 'payment/pendingPayment', {
            ...parsedSinglePenalties[1],
            location: 'Cuerden(M65 J1a - SE of Preston)',
            cancelUrl: '/payment-code/5e7a4c97c260e699',
          });
        });

        context('not enabled', () => {
          it('should redirect to the invalid payment code page', async () => {
            req = { params: { payment_code: '5ef305b89435c670' } };
            await warnPendingPayment[1](req, res);
            sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
          });
        });

        context('when the penalty service fails', () => {
          it('should redirect to the invalid payment code page', async () => {
            mockPenaltySvc.rejects(new Error({ status: 500, message: 'Internal server error' }));
            req = { params: { payment_code: '5e7a4c97c260e699' } };
            await warnPendingPayment[1](req, res);
            sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
          });
        });
      });

      context('for a group penalty', () => {
        beforeEach(() => {
          mockPenaltyGroupSvc
            .callsFake((paymentCode) => Promise.resolve(parsedMultiPenalties.find((p) => p.paymentCode === paymentCode)));
        });

        it('should render the pending payment page', async () => {
          req = { params: { payment_code: '47hsqs103i0' } };
          await warnPendingPayment[1](req, res);
          sinon.assert.calledWith(renderSpy, 'payment/pendingPayment');
        });
      });
    });

    context('when the payment code is invalid', () => {
      it('should redirect to the payment code page with invalid payment code message', () => {
        req = { params: { payment_code: 'scode' } };
        warnPendingPayment[1]({ ...req, _validationErrors: validationErrors }, res);
        sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
      });

      it.only('should log the error', () => {
        req = { params: { payment_code: 'code' } };
        warnPendingPayment[1]({ ...req, _validationErrors: validationErrors, errors: validationErrors }, res);
        sinon.assert.calledWith(logErrorSpy, 'ValidatePaymentCodeError', { payment_code: validationErrors[0] });
      });
    });
  });

  describe('getMultiPenaltyPaymentSummary', () => {
    beforeEach(() => {
      mockPenaltyGroupSvc
        .callsFake((paymentCode) => Promise.resolve(parsedMultiPenalties.find((p) => p.paymentCode === paymentCode)));

      mockPenaltyGroupSvcPayments
        .callsFake((paymentCode) => Promise.resolve(parsedMultiPenalties.find((p) => p.paymentCode === paymentCode)));
    });

    it('should render the multi payment summary page', async () => {
      req = { params: { payment_code: '47hsqs103i0' }, type: 'FPN' };
      await getMultiPenaltyPaymentSummary[0](req, res);
      sinon.assert.calledWith(renderSpy, 'payment/multiPaymentSummary');
    });

    context('when the payment is pending', () => {
      it('should log the info', async () => {
        mockIsGroupPaymentPending.returns(true);
        req = { params: { payment_code: '47hsqs103i0' }, type: 'FPN' };
        await getMultiPenaltyPaymentSummary[0](req, res);
        sinon.assert.calledWith(logInfoSpy, 'PaymentPending');
      });
    });

    context('when the penalty service fails', () => {
      it('should redirect to the invalid payment code page', async () => {
        mockPenaltyGroupSvc.rejects(new Error({ status: 500, message: 'Internal server error' }));
        req = { params: { payment_code: '47hsqs103i0' } };
        await getMultiPenaltyPaymentSummary[0](req, res);
        sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
      });
    });
  });
});
