import { describe, it, afterEach } from 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import * as PendingPayments from '../../src/server/utils/pending-payments';
import config from '../../src/server/config';

const mockDateNow = () => 1587025800; // 16th April 2020 08:30
let originalDateNow;

const mockPenaltyGroup = {
  isPenaltyGroup: true,
  enabled: true,
  penaltyGroupDetails: {
    registrationNumber: 'TEST',
    date: '01//04/2020',
    dateTime: 1587016800,
    amount: 20,
    imPaymentStartTime: 7898372400,
    fpnPaymentStartTime: 7898372400,
    cdnPaymentStartTime: 7898372400,
  },
};

describe('isPaymentPending', () => {
  before(() => {
    sinon.stub(config, 'pendingPaymentTimeMilliseconds').returns(900000); // 15 minutes
  });
  after(() => {
    config.pendingPaymentTimeMilliseconds.restore();
  });

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = mockDateNow;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  context('when a payment attempt has NOT been made', () => {
    it('should return false', () => {
      const result = PendingPayments.isPaymentPending('');
      expect(result).to.equal(false);
    });
  });

  context('when the payment attempt is less than pending payment time', () => {
    it('should return false', () => {
      const result = PendingPayments.isPaymentPending(7898372400); // 16th April 2020 08:20
      expect(result).to.equal(true);
    });
  });

  context('when the payment attempt is more than pending payment time', () => {
    it('should return false', () => {
      const result = PendingPayments.isPaymentPending(1587016800); // 16th April 2020 06:00
      expect(result).to.equal(false);
    });
  });

  context('when a group payment is pending', () => {
    it('should return true', () => {
      const result = PendingPayments.isGroupPaymentPending(mockPenaltyGroup, 'FPN');
      expect(result).to.equal(true);
    });
  });
});
