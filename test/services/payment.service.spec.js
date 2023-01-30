import { describe, it, after, before } from 'mocha';
import sinon from 'sinon';
import PaymentService from '../../src/server/services/payment.service';
import SignedHttpClient from '../../src/server/utils/httpclient';
import axios from 'axios';

describe('Payment service', () => {

  const mockDetails = {
    PaymentCode: '5ef305b89435c670',
    PenaltyStatus: 'PAID',
    PenaltyType: 'FPN',
    PenaltyReference: 'pen ref',
    PaymentDetail: {
      PaymentMethod: 'CARD',
      PaymentRef: 'payment ref',
      AuthCode: 'auth code',
      PaymentAmount: 50,
      PaymentDate: Math.round((new Date()).getTime() / 1000),
    },
  };

  const mockPaymentCode = '5ef305b89435c670';

  const paymentService = new PaymentService('https://testurl');

  let httpClientGetSpy;
  let httpClientPostSpy;
  let axiosPostMock;
  let axiosGetMock;

  beforeEach(() => {
    httpClientGetSpy = sinon.spy(SignedHttpClient.prototype, 'get');
    httpClientPostSpy = sinon.spy(SignedHttpClient.prototype, 'post');
    axiosPostMock = sinon.stub(axios, 'post').resolves();
    axiosGetMock = sinon.stub(axios, 'get').resolves();

  });

  afterEach(() => {
    httpClientGetSpy.restore();
    httpClientPostSpy.restore();
    axiosPostMock.restore();
    axiosGetMock.restore();
  })

  context('make a payment', () => {
    it('should POST the request with the correct parameters', async () => {
      await paymentService.makePayment(mockDetails);
      sinon.assert.calledWith(httpClientPostSpy, 'payments/', mockDetails, 0, 'RecordPayment');
    });
  });

  context('get a payment', () => {
    it('should GET the request with the correct parameters', async () => {
      await paymentService.getPayment(mockPaymentCode);
      sinon.assert.calledWith(httpClientGetSpy, 'payments/5ef305b89435c670', 'GetPayment');
    });
  });

  context('record a group payment', () => {
    it('should POST the request with the correct parameters', async () => {
      await paymentService.recordGroupPayment(mockDetails);
      sinon.assert.calledWith(httpClientPostSpy, 'groupPayments/', mockDetails, 0, 'RecordGroupPayment');
    });
  });

  context('get a group payment', () => {
    it('should GET the request with the correct parameters', async () => {
      await paymentService.getGroupPayment(mockPaymentCode);
      sinon.assert.calledWith(httpClientGetSpy, 'groupPayments/5ef305b89435c670', 'GetGroupPayment');
    });
  });
});
