import sinon from 'sinon';
import {
  describe, it, after, before,
} from 'mocha';
import { expect } from 'chai';
import config from '../../src/server/config';
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
      sinon.spy(logger, 'logError');
      sinon.spy(logger, 'logInfo');
    });
    after(() => {
      renderSpy.resetHistory();
      logger.logError.restore();
      logger.logInfo.restore();
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
    logger.logError.restore();
    logger.logInfo.restore();
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
        sinon.assert.calledWith(renderSpy, 'payment/index', { invalidPaymentCode: true, type: 'invalid' });
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
  });

  describe('Get payment details', () => {
    context('when the payment code is valid', () => {
      context('for a single penalty', () => {
        let clock;
        let configMock;

        beforeEach(() => {
          configMock = sinon.stub(config, 'pendingPaymentTimeMilliseconds').returns(900000);
          clock = sinon.useFakeTimers(new Date(2018, 2, 15, 9, 35));

          mockPenaltySvc
            .callsFake((paymentCode) => Promise.resolve(parsedSinglePenalties.find((p) => p.paymentCode === paymentCode)));
        });

        afterEach(() => {
          clock.restore();
          mockPenaltySvc.resetHistory();
          configMock.restore();
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
            const paymentCode = '5e7a4c97c260e699';
            req = { params: { payment_code: paymentCode } };
            await getPaymentDetails[1](req, res);
            sinon.assert.calledWith(redirectSpy, `../payment-code?invalidPaymentCode&type=overdue&id=${paymentCode}`);
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

        context('no vehicle details', () => {
          it('should redirect to the invalid payment code page', async () => {
            req = { params: { payment_code: '5e7a4c97c260e688' } };
            await getPaymentDetails[1](req, res);
            sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode&vrm=false');
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
          mockPenaltyGroupSvc.restore();
        });

        it('should render the multi payment info page', async () => {
          req = { params: { payment_code: '47hsqs103i0' } };
          await getPaymentDetails[1](req, res);
          sinon.assert.calledWith(renderSpy, 'payment/multiPaymentInfo');
        });
      });
    });
  });
});

describe('getMultiPenaltyPaymentSummary', () => {
  let mockIsGroupPaymentPending;
  let mockPenaltyGroupSvc;
  let mockPenaltyGroupSvcPayments;
  let logInfoSpy;
  let renderSpy;
  let redirectSpy;
  let res;
  beforeEach(() => {
    mockIsGroupPaymentPending = sinon.stub(pendingPayments, 'isGroupPaymentPending');
    mockPenaltyGroupSvc = sinon.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode');
    mockPenaltyGroupSvcPayments = sinon.stub(PenaltyGroupService.prototype, 'getPaymentsByCodeAndType');

    mockPenaltyGroupSvc.callsFake((paymentCode) => Promise.resolve(parsedMultiPenalties.find((p) => p.paymentCode === paymentCode)));
    mockPenaltyGroupSvcPayments.callsFake((paymentCode) => Promise.resolve(parsedMultiPenalties.find((p) => p.paymentCode === paymentCode)));

    logInfoSpy = sinon.spy(logger, 'logInfo');
    renderSpy = sinon.spy();
    redirectSpy = sinon.spy();
    res = {
      render: renderSpy,
      redirect: redirectSpy,
    };
  });

  afterEach(() => {
    mockIsGroupPaymentPending.restore();
    mockPenaltyGroupSvc.restore();
    mockPenaltyGroupSvcPayments.restore();
    logInfoSpy.restore();
    renderSpy.resetHistory();
    redirectSpy.resetHistory();
  });

  it('should render the multi payment summary page', async () => {
    const req = { params: { payment_code: '47hsqs103i0' }, type: 'FPN' };
    await getMultiPenaltyPaymentSummary[0](req, res);
    sinon.assert.calledWith(renderSpy, 'payment/multiPaymentSummary');
  });

  context('when the payment is pending', () => {
    it('should log the info', async () => {
      mockIsGroupPaymentPending.returns(true);
      const req = { params: { payment_code: '47hsqs103i0' }, type: 'FPN' };
      await getMultiPenaltyPaymentSummary[0](req, res);
      sinon.assert.calledWith(logInfoSpy, 'PaymentPending');
    });
  });

  context('when the penalty service fails', () => {
    it('should redirect to the invalid payment code page', async () => {
      mockPenaltyGroupSvc.rejects(new Error({ status: 500, message: 'Internal server error' }));
      const req = { params: { payment_code: '47hsqs103i0' } };
      await getMultiPenaltyPaymentSummary[0](req, res);
      sinon.assert.calledWith(redirectSpy, '../payment-code?invalidPaymentCode');
    });
  });
});
