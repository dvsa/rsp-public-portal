import {
  describe, it, after, afterEach, before,
} from 'mocha';
import sinon from 'sinon';

import config from '../../src/server/config';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import CpmsService from '../../src/server/services/cpms.service';
import PaymentService from '../../src/server/services/payment.service';
import parsedMultiPenalties from '../data/parsedMultiPenalties';
import parsedSinglePenalties from '../data/parsedSinglePenalties';

function requestForPaymentCode(paymentCode) {
  return {
    params: {
      payment_code: paymentCode,
      type: 'FPN',
    },
    get: (key) => {
      const gettables = {
        host: 'localhost',
      };
      return gettables[key];
    },
  };
}

sinon.stub(config, 'redirectUrl').returns('https://localhost');

describe('Payment Controller', () => {
  describe('redirects to payment page for penalty groups', () => {
    const mockDateNow = () => 1587025800; // 16th April 2020 08:30
    let mockPenaltySvc;
    let mockPenaltyGroupSvc;
    let mockCpmsSvcSingle;
    let mockCpmsSvcGroup;
    let redirectSpy;
    let responseHandle;
    let originalDateNow;

    before(() => {
      mockPenaltySvc = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
      mockPenaltyGroupSvc = sinon.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode');
      mockCpmsSvcSingle = sinon.stub(CpmsService.prototype, 'createCardPaymentTransaction');
      mockCpmsSvcGroup = sinon.stub(CpmsService.prototype, 'createGroupCardPaymentTransaction');
      redirectSpy = sinon.spy({ redirect: () => { } }, 'redirect');
      responseHandle = { redirect: redirectSpy };
    });

    after(() => {
      PenaltyService.prototype.getByPaymentCode.restore();
      PenaltyGroupService.prototype.getByPenaltyGroupPaymentCode.restore();
      CpmsService.prototype.createCardPaymentTransaction.restore();
      CpmsService.prototype.createGroupCardPaymentTransaction.restore();
    });

    afterEach(() => {
      mockPenaltySvc.resetHistory();
      mockPenaltyGroupSvc.resetHistory();
      mockCpmsSvcSingle.resetHistory();
      mockCpmsSvcGroup.resetHistory();
      redirectSpy.resetHistory();
    });

    describe('for single penalty payment codes', () => {
      beforeEach(() => {
        originalDateNow = Date.now;
        Date.now = mockDateNow;
        mockPenaltySvc
          .callsFake((paymentCode) => parsedSinglePenalties.find((p) => p.paymentCode === paymentCode));
      });

      afterEach(() => {
        Date.now = originalDateNow;
      });

      it('should redirect to the payment code URL when status is paid', async () => {
        await PaymentController.redirectToPaymentPage({ params: { payment_code: '5ef305b89435c670' } }, responseHandle);
        sinon.assert.calledWith(redirectSpy, '/payment-code/5ef305b89435c670');
      });

      it('should redirect to the CPMS gateway URL returned when CPMS Service creates a transaction', async () => {
        mockCpmsSvcSingle
          .withArgs('5e7a4c97c260e699', 'GHIYIN', '425782-0-253535-IM', 'IM', 50, 'https://localhost/payment-code/5e7a4c97c260e699/confirmPayment', '4257820253535')
          .resolves({ data: { gateway_url: 'http://cpms.gateway' } });

        await PaymentController.redirectToPaymentPage(requestForPaymentCode('5e7a4c97c260e699'), responseHandle);

        sinon.assert.calledWith(redirectSpy, 'http://cpms.gateway');
      });

      it('should redirect to the payment page when CPMS Service transaction fails', async () => {
        mockCpmsSvcSingle
          .withArgs('5e7a4c97c260e699', 'GHIYIN', '425782-0-253535-IM', 'IM', 50, 'https://localhost/payment-code/5e7a4c97c260e699/confirmPayment', '4257820253535')
          .rejects();

        await PaymentController.redirectToPaymentPage(requestForPaymentCode('5e7a4c97c260e699'), responseHandle);

        sinon.assert.calledWith(redirectSpy, '/payment-code/5e7a4c97c260e699');
      });

      it('should redirect to the invalid payment code page for invalid codes', async () => {
        await PaymentController.redirectToPaymentPage(requestForPaymentCode('invalidcode'), responseHandle);
        sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
      });

      context('when payment is pending', () => {
        it('should redirect to the payment code page', async () => {
          await PaymentController.redirectToPaymentPageUnlessPending({ params: { payment_code: '5e7a4c97c260e699' } }, responseHandle);
          sinon.assert.calledWith(redirectSpy, '/payment-code/5e7a4c97c260e699');
        });

        it('should redirect to the invalid payment code page', async () => {
          await PaymentController.redirectToPaymentPageUnlessPending({ params: { payment_code: 'invalidcode' } }, responseHandle);
          sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
        });
      });

      context('when CPMS confirms single payment', () => {
        const req = {
          params: {
            payment_code: '5ef305b89435c670',
          },
          query: {
            receipt_reference: 'ref',
          },
        };
        const expectedPaymentPayload = {
          PaymentCode: '5ef305b89435c670',
          PaymentDetail: {
            AuthCode: '111',
            PaymentAmount: 145,
            PaymentDate: sinon.match.number,
            PaymentMethod: 'CARD',
            PaymentRef: 'ref',
          },
          PenaltyReference: '0122451124578',
          PenaltyStatus: 'PAID',
          PenaltyType: 'IM',
        };
        let resp;
        let mockPaymentSvc;
        let mockCpmsConfirm;
        before(() => {
          resp = { redirect: redirectSpy };
          // Other mocks are formed in parent beforeEaches
          mockPaymentSvc = sinon.stub(PaymentService.prototype, 'makePayment');
          mockPaymentSvc.resolves();
          mockCpmsConfirm = sinon.stub(CpmsService.prototype, 'confirmPayment');
          mockCpmsConfirm
            .withArgs('ref', 'IM')
            .resolves({ data: { code: 801, auth_code: '111', receipt_reference: 'ref' } });
        });

        after(() => {
          PaymentService.prototype.makePayment.restore();
          CpmsService.prototype.confirmPayment.restore();
        });

        it('should redirect to the receipt page', async () => {
          await PaymentController.confirmPayment(req, resp);
          // sinon.assert.calledWith(mockCpmsSvcSingle, 'ref');
          sinon.assert.calledWith(mockPaymentSvc, expectedPaymentPayload);
          sinon.assert.calledWith(redirectSpy, '/payment-code/5ef305b89435c670/receipt');
        });
      });
    });

    describe('for multiple penalty payment codes', () => {
      beforeEach(() => {
        mockPenaltyGroupSvc
          .callsFake((paymentCode) => parsedMultiPenalties.find((p) => p.paymentCode === paymentCode));
      });

      it('should redirect to the CPMS gateway URL returned when CPMS Service creates a transaction', async () => {
        mockCpmsSvcGroup
          .withArgs(
            '47hsqs103i0',
            290,
            '17FFA,17FFB,17FFC',
            'FPN',
            parsedMultiPenalties[0].penaltyDetails[1].penalties,
            'https://localhost/payment-code/47hsqs103i0/FPN/confirmGroupPayment',
          )
          .resolves({ data: { gateway_url: 'http://cpms.gateway' } });

        await PaymentController.redirectToPaymentPage(requestForPaymentCode('47hsqs103i0'), responseHandle);

        sinon.assert.calledWith(redirectSpy, 'http://cpms.gateway');
      });

      it('should redirect to the payment page when CPMS Service transaction fails', async () => {
        mockCpmsSvcGroup
          .withArgs(
            '47hsqs103i0',
            290,
            '17FFA,17FFB,17FFC',
            'FPN',
            parsedMultiPenalties[0].penaltyDetails[1].penalties,
            'https://localhost/payment-code/47hsqs103i0/FPN/confirmGroupPayment',
          )
          .rejects();

        await PaymentController.redirectToPaymentPage(requestForPaymentCode('47hsqs103i0'), responseHandle);

        sinon.assert.calledWith(redirectSpy, '/payment-code/47hsqs103i0');
      });

      context('when payment is pending', () => {
        it('should redirect to the payment details page', async () => {
          await PaymentController.redirectToPaymentPageUnlessPending(requestForPaymentCode('47hsqs103i0'), responseHandle);
          sinon.assert.calledWith(redirectSpy, '/payment-code/47hsqs103i0/FPN/details');
        });
      });
    });
  });

  describe('confirmGroupPayment', () => {
    let mockCpmsSvc;
    let mockPenaltyGrpSvc;
    let mockPaymentSvc;
    let redirectSpy;
    let renderSpy;
    let resp;
    const req = {
      params: {
        payment_code: 'codenotlength16',
        type: 'FPN',
      },
      query: {
        receipt_reference: 'ref',
      },
    };
    const penaltyGroupDetails = {
      paymentCode: 'codenotlength16',
      penaltyGroupDetails: {
        splitAmounts: [
          {
            type: 'FPN',
            amount: 150,
            status: 'PAID',
          },
        ],
      },
      penaltyDetails: [
        {
          type: 'FPN',
          penalties: [
            {
              reference: '111111111111',
            },
            {
              reference: '222222222222',
            },
          ],
        },
      ],
    };
    const expectedPaymentPayload = {
      PaymentCode: 'codenotlength16',
      PenaltyType: 'FPN',
      PaymentDetail: {
        PaymentMethod: 'CARD',
        PaymentRef: 'ref',
        AuthCode: '111',
        PaymentAmount: 150,
        PaymentDate: sinon.match.number,
      },
      PenaltyIds: [
        '111111111111_FPN',
        '222222222222_FPN',
      ],
    };

    before(() => {
      mockPenaltyGrpSvc = sinon.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode');
      mockCpmsSvc = sinon.stub(CpmsService.prototype, 'confirmPayment');
      mockPaymentSvc = sinon.stub(PaymentService.prototype, 'recordGroupPayment');

      redirectSpy = sinon.spy();
      renderSpy = sinon.spy();
      resp = { redirect: redirectSpy, render: renderSpy };
    });

    beforeEach(() => {
      mockPenaltyGrpSvc
        .withArgs('codenotlength16')
        .resolves(penaltyGroupDetails);

      mockCpmsSvc
        .withArgs('ref', 'FPN')
        .resolves({ data: { code: 801, auth_code: '111' } });
      mockPaymentSvc
        .withArgs(expectedPaymentPayload)
        .resolves(true);
    });

    afterEach(() => {
      mockPenaltyGrpSvc.resetHistory();
      mockCpmsSvc.resetHistory();
      mockPaymentSvc.resetHistory();
      redirectSpy.resetHistory();
      renderSpy.resetHistory();
    });

    after(() => {
      CpmsService.prototype.confirmPayment.restore();
      PenaltyGroupService.prototype.getByPenaltyGroupPaymentCode.restore();
      PaymentService.prototype.recordGroupPayment.restore();
    });

    context('when CPMS confirms payment with response code 801', () => {
      it('should redirect to the receipt page', async () => {
        await PaymentController.confirmGroupPayment(req, resp);
        sinon.assert.calledWith(mockCpmsSvc, 'ref', 'FPN');
        sinon.assert.calledWith(mockPaymentSvc, expectedPaymentPayload);
        sinon.assert.calledWith(redirectSpy, '/payment-code/codenotlength16/FPN/receipt');
      });
    });

    context('when the payment cannot be confirmed', () => {
      beforeEach(() => {
        mockCpmsSvc.reset();
        mockCpmsSvc
          .rejects('call failed');
      });

      it('should render the payment declined page', async () => {
        await PaymentController.confirmGroupPayment(req, resp);
        sinon.assert.called(mockCpmsSvc);
        sinon.assert.calledWith(renderSpy, 'payment/failedPayment', { paymentCode: 'codenotlength16' });
      });
    });

    context('when CPMS respond indicating that the user cancelled out of the payment', () => {
      beforeEach(() => {
        mockCpmsSvc.reset();
        mockCpmsSvc
          .resolves({ data: { code: 807 } });
      });
      it('should redirect back to the payment code summary', async () => {
        await PaymentController.confirmGroupPayment(req, resp);
        sinon.assert.called(mockCpmsSvc);
        sinon.assert.calledWith(redirectSpy, '/payment-code/codenotlength16');
      });
    });

    context('when CPMS respond with an unhandled code', () => {
      beforeEach(() => {
        mockCpmsSvc.reset();
        mockCpmsSvc
          .resolves({ data: { code: 999 } });
      });
      it('render the payment declined page', async () => {
        await PaymentController.confirmGroupPayment(req, resp);
        sinon.assert.called(mockCpmsSvc);
        sinon.assert.calledWith(renderSpy, 'payment/failedPayment', { paymentCode: 'codenotlength16' });
      });
    });

    context('when recording group payment record fails', () => {
      beforeEach(() => {
        mockPaymentSvc.reset();
        mockPaymentSvc.rejects('payment service call failed');
      });
      it('should render the payment declined page', async () => {
        await PaymentController.confirmGroupPayment(req, resp);
        sinon.assert.called(mockCpmsSvc);
        sinon.assert.called(mockPaymentSvc);
        sinon.assert.calledWith(renderSpy, 'payment/failedPayment', { paymentCode: 'codenotlength16' });
      });
    });
  });
});
