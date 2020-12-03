import { expect } from 'chai';
import sinon from 'sinon';
import CpmsService from '../../src/server/services/cpms.service';
import SignedHttpClient from '../../src/server/utils/httpclient';
import parsedMultiPenalties from '../data/parsedMultiPenalties';

describe('Payment Service', () => {

  let mockHttpClient;
  let cpmsService;

  beforeEach(() => {
    mockHttpClient = sinon.stub(SignedHttpClient.prototype, 'post');
    cpmsService = new CpmsService('testurl');
  });

  afterEach(() => {
    mockHttpClient.restore();
  });

  describe('createCardPaymentTransaction', () => {
    const mockTransactionData = {
      payment_code: '5ef305b89435c670',
      penalty_reference: '123456',
      penalty_id: 'ID',
      penalty_type: 'FPN',
      penalty_amount: 80,
      redirect_url: 'https://test',
      vehicle_reg: 'TESTREG',
    };

    it('should POST the card payment transaction request with the correct parameters', () => {
      cpmsService.createCardPaymentTransaction('5ef305b89435c670', 'TESTREG', '123456', 'FPN', 80, 'https://test', 'ID');
      sinon.assert.calledWith(mockHttpClient, 'cardPayment/', mockTransactionData, 3, 'CardPayment');
    });
  });

  describe('groupCardPaymentTransaction', () => {
    it('returns a promise from POSTing payment details to the cardPaymentGroup endpoint', () => {
      const httpPromise = Promise.resolve('resp');
      mockHttpClient
        .returns(httpPromise);

      const expectedPenalties = parsedMultiPenalties
        .find(p => p.paymentCode === '47hsqs103i0')
        .penaltyDetails[1]
        .penalties;
      const returned = cpmsService.createGroupCardPaymentTransaction('47hsqs103i0', 190, '17FFA,17FFB,17FFC', 'FPN', expectedPenalties, 'http://redirect');

      sinon.assert.calledWith(mockHttpClient, 'groupPayment/', {
        PenaltyGroupId: '47hsqs103i0',
        TotalAmount: 190,
        VehicleRegistration: '17FFA,17FFB,17FFC',
        PenaltyType: 'FPN',
        RedirectUrl: 'http://redirect',
        Penalties: [
          {
            PenaltyReference: '3254849651302',
            PenaltyAmount: 100,
            VehicleRegistration: '17FFB',
          },
          {
            PenaltyReference: '320158795420',
            PenaltyAmount: 190,
            VehicleRegistration: '17FFC',
          },
        ],
      });
      expect(returned).to.be.equal(httpPromise);
    });

    it('sends the correct penalty reference to CPMS', () => {
      const httpPromise = Promise.resolve('resp');
      mockHttpClient.returns(httpPromise);

      const expectedPenalties = parsedMultiPenalties
        .find(p => p.paymentCode === '47hsqs103i0')
        .penaltyDetails[0]
        .penalties;
      const returned = cpmsService.createGroupCardPaymentTransaction('47hsqs103i0', 190, '17FFA,17FFB,17FFC', 'IM', expectedPenalties, 'http://redirect');

      sinon.assert.calledWith(mockHttpClient, 'groupPayment/', {
        PenaltyGroupId: '47hsqs103i0',
        TotalAmount: 190,
        VehicleRegistration: '17FFA,17FFB,17FFC',
        PenaltyType: 'IM',
        RedirectUrl: 'http://redirect',
        Penalties: [
          {
            PenaltyReference: '24685-0-551-IM',
            PenaltyAmount: 80,
            VehicleRegistration: '17FFA',
          },
        ],
      });
      expect(returned).to.be.equal(httpPromise);
    });
  });

  describe('confirmPayment', () => {
    const mockConfirmData = {
      receipt_reference: '12345',
      penalty_type: 'FPN',
    };

    it('should POST the confirm payment request with the correct parameters', () => {
      cpmsService.confirmPayment('12345', 'FPN');
      sinon.assert.calledWith(mockHttpClient, 'confirm/', mockConfirmData, 3, 'ConfirmPayment');
    });
  });

  describe('makePayment', () => {
    it('should POST the make payment request with the correct parameters', () => {
      cpmsService.makePayment('details');
      sinon.assert.calledWith(mockHttpClient, 'payments/', 'details', 0, 'MakePayment');
    });
  });
});
