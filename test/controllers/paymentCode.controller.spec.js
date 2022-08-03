import { describe } from 'mocha';
import forEach from 'mocha-each';
import moment from 'moment';
import { expect } from 'chai';
import sinon from 'sinon';
import * as paymentCodeController from '../../src/server/controllers/paymentCode.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';

describe('Payment Code Controller', () => {
  let mockPenaltySvc;
  let mockPenaltyGrpSvc;
  let renderSpy;
  let redirectSpy;
  let response;
  let clock;

  before(() => {
    renderSpy = sinon.spy();
    redirectSpy = sinon.spy();
    mockPenaltySvc = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
    mockPenaltyGrpSvc = sinon.stub(PenaltyGroupService.prototype, 'getByPenaltyGroupPaymentCode');
    response = { redirect: redirectSpy, render: renderSpy };

    clock = date => sinon.useFakeTimers(new Date(date));
  });

  afterEach(() => {
    renderSpy.resetHistory();
    redirectSpy.resetHistory();
    mockPenaltySvc.resetHistory();
    mockPenaltyGrpSvc.resetHistory();
  });

  after(() => {
    PenaltyService.prototype.getByPaymentCode.restore();
    PenaltyGroupService.prototype.getByPenaltyGroupPaymentCode.restore();
  });

  forEach([
    [
      {
        paymentCode: '13274',
        referenceCode: '12374_FPN',
        enabled: true,
        location: 'location',
        dateTime: '1652179320', //  Tuesday, 10 May 2022 10:42:00
        issueDate: '10/05/2022', // formatted in penalty service: moment.unix(rawPenalty.dateTime).format('DD/MM/YYYY')
        penaltyDetails: [{ penalties: [{ location: 'location' }] }],
      },
      '../payment-code?invalidPaymentCode',
      'Mon Jul 11 2022 15:00:00 GMT+0000 (Greenwich Mean Time)',
    ],
    [
      {
        paymentCode: '1546',
        referenceCode: '1546_FPN',
        enabled: true,
        location: 'location',
        dateTime: '1647302400', // Tuesday, 15 March 2022 00:00:00
        issueDate: '15/03/2022', // formatted in penalty service: moment.unix(rawPenalty.dateTime).format('DD/MM/YYYY')
        penaltyDetails: [{ penalties: [{ location: 'location' }] }],
      },
      '../payment-code?invalidPaymentCode',
      'Wed Jun 16 2022  14:53:20 GMT+0000 (Greenwich Mean Time)',
    ],
    [
      {
        paymentCode: '15867',
        referenceCode: '15867_FPN',
        enabled: true,
        location: 'location',
        dateTime: '1643280120', // Tuesday, 15 March 2022 00:00:00
        issueDate: '27/01/2022', // formatted in penalty service: moment.unix(rawPenalty.dateTime).format('DD/MM/YYYY')
        penaltyDetails: [{ penalties: [{ location: 'location' }] }],
      },
      '../payment-code?invalidPaymentCode',
      'Fri Jun 24 2022  14:53:20 GMT+0000 (Greenwich Mean Time)',
    ],
  ]).it('should return invalid payment code page when issue date has exceeded 28 days', async (mockPenalty, redirectUrl, dateNow) => {
    const getPaymentDetailsRoute = paymentCodeController.getPaymentDetails;
    const req = { params: { payment_code: mockPenalty.paymentCode } };
    mockPenaltySvc.resolves(mockPenalty);
    mockPenaltyGrpSvc.resolves(mockPenalty);
    clock(dateNow);
    expect(mockPenalty.issueDate).equal(moment.unix(mockPenalty.dateTime).format('DD/MM/YYYY'));
    await getPaymentDetailsRoute[1](req, response);
    sinon.assert.calledWith(redirectSpy, redirectUrl);
  });

  forEach([
    [{
      paymentCode: '132222_FPN',
      enabled: true,
      location: 'Dover Docks',
      dateTime: '1657449720', // Sunday, 10 July 2022 10:42:00
      issueDate: '10/07/2022', // formatted in penalty service: moment.unix(rawPenalty.dateTime).format('DD/MM/YYYY')
      paymentStartTime: '',
      penaltyDetails: [{ penalties: [{ location: 'location' }] }],
    },
    'payment/multiPaymentInfo',
    'Mon Jul 11 2022 15:00:00 GMT+0000 (Greenwich Mean Time)',
    ],
  ]).it.skip('should return payment page successfully when given valid payment code', async (mockPenalty, renderPage, dateNow) => {
    const getPaymentDetailsRoute = paymentCodeController.getPaymentDetails;
    const req = { params: { payment_code: mockPenalty.paymentCode } };
    mockPenaltySvc.resolves(mockPenalty);
    mockPenaltyGrpSvc.resolves(mockPenalty);
    clock(dateNow);
    await getPaymentDetailsRoute[1](req, response);
    sinon.assert.calledWith(renderSpy, renderPage, {
      ...mockPenalty,
      location: 'location',
      paymentPending: false,
      pendingMinutes: NaN,
    });
  });
});
