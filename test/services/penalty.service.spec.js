import { describe, it, afterEach } from 'mocha';
import sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import PenaltyService from '../../src/server/services/penalty.service';
import SignedHttpClient from '../../src/server/utils/httpclient';
import MockedBackendAPI from '../utils/mockedBackendAPI';
import penalties from '../data/penalties';
import penaltyGroups from '../data/penaltyGroups';

use(chaiAsPromised);

const httpClient = new SignedHttpClient('');
const penaltyService = new PenaltyService();

describe('Penalty Service', () => {
  const mockedBackendAPI = new MockedBackendAPI(penalties, penaltyGroups);

  let mockedHttpClient;

  beforeEach(() => {
    mockedHttpClient = sinon.stub(httpClient, 'get');
  });

  afterEach(() => {
    mockedHttpClient.restore();
  });

  describe('Get the penalty type description', () => {
    it('Should return the correct description for CDN', () => {
      const result = PenaltyService.getPenaltyTypeDescription('CDN');
      expect(result).to.equal('Court Deposit Notice');
    });

    it('Should return the correct description for FPN', () => {
      const result = PenaltyService.getPenaltyTypeDescription('FPN');
      expect(result).to.equal('Fixed Penalty Notice');
    });

    it('Should return the correct description for IM', () => {
      const result = PenaltyService.getPenaltyTypeDescription('IM');
      expect(result).to.equal('Immobilisation');
    });

    it('Should return the correct description for an invalid type', () => {
      const result = PenaltyService.getPenaltyTypeDescription('ABC');
      expect(result).to.equal('Unknown');
    });
  });

  describe('Retrieves a penalty by payment code', () => {
    it('Should retrieve the correct penalty [WHEN] a valid single penalty payment code is provided', async () => {
      // Arrange
      const singlePenaltyPaymentCode = '1111111111111111';

      mockedHttpClient.callsFake(code => mockedBackendAPI.getPenaltyByPaymentCode(code));
      penaltyService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = await penaltyService.getByPaymentCode(singlePenaltyPaymentCode);

      // Assert
      expect(result.paymentCode).to.equal(singlePenaltyPaymentCode);
      sinon.assert.calledWith(mockedHttpClient, 'documents/tokens/1111111111111111');
    });

    it('Should return a rejected promise [WHEN] an invalid payment code is provided', () => {
      // Arrange
      const invalidPaymentCode = 'zzxzxzxasdqawsdaszxcwqesd$"£%$£$"%';

      mockedHttpClient.callsFake(code => mockedBackendAPI.getPenaltyByPaymentCode(code));
      penaltyService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = penaltyService.getByPaymentCode(invalidPaymentCode);

      // Assert
      return expect(result).to.be.rejected;
    });

    it('Should throw an error when it fails to retrieve the payment code', async () => {
      mockedHttpClient.resolves({ data: '' });
      penaltyService.httpClient = mockedHttpClient.rootObj;
      await expect(penaltyService.getByPaymentCode('1111111111111111')).rejectedWith(Error, 'Payment code not found');
    });
  });
});
