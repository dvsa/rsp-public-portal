import { describe, it, afterEach } from 'mocha';
import sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import SignedHttpClient from '../../src/server/utils/httpclient';
import MockedBackendAPI from '../utils/mockedBackendAPI';
import penalties from '../data/penalties';
import penaltyGroups from '../data/penaltyGroups';

use(chaiAsPromised);

const httpClient = new SignedHttpClient('');
const penaltyGroupService = new PenaltyGroupService();

describe('Penalty Group Service', () => {
  const mockedBackendAPI = new MockedBackendAPI(penalties, penaltyGroups);

  let mockedHttpClient;

  beforeEach(() => {
    mockedHttpClient = sinon.stub(httpClient, 'get');
  });

  afterEach(() => {
    mockedHttpClient.restore();
  });

  describe('Retrieves a penalty group by payment code', () => {
    it('Should retrieve the correct penalty group [WHEN] a valid multiple penalty payment code is provided', async () => {
      // Arrange
      const multiplePenaltyPaymentCode = '47hsqs103i0';

      mockedHttpClient.callsFake(code => mockedBackendAPI.getPenaltyGroupByPaymentCode(code));
      penaltyGroupService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = await penaltyGroupService.getByPenaltyGroupPaymentCode(multiplePenaltyPaymentCode);

      // Assert
      expect(result.paymentCode).to.equal(multiplePenaltyPaymentCode);
      sinon.assert.calledWith(mockedHttpClient, 'penaltyGroup/47hsqs103i0');
    });

    it('Should return a rejected promise [WHEN] an invalid payment code is provided', () => {
      // Arrange
      const invalidPaymentCode = 'abc12345678';

      mockedHttpClient.callsFake(code => mockedBackendAPI.getPenaltyByPaymentCode(code));
      penaltyGroupService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = penaltyGroupService.getByPenaltyGroupPaymentCode(invalidPaymentCode);

      // Assert
      return expect(result).to.be.rejected;
    });

    it('Should throw an error when it fails to retrieve the group payment code', () => {
      // Arrange
      mockedHttpClient.resolves({ data: '' });
      // penaltyGroupService = new PenaltyGroupService();
      penaltyGroupService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = penaltyGroupService.getByPenaltyGroupPaymentCode('47hsqs103i0');

      // Assert
      return expect(result).rejectedWith(Error, 'Payment code not found');
    });
  });

  describe('Retrieves payments by code and type', () => {

    it('Should retrieve the correct payments [WHEN] a valid multiple penalty payment code is provided', async () => {
      // Arrange
      mockedHttpClient.resolves({ data: penaltyGroups[0] });

      const penaltyDetails = [{
        complete: true,
        penaltyId: '1245853256893_FPN',
        reference: '1245853256893',
        enabled: true,
        paymentCode: 'fd7c1abd93c4c074',
        issueDate: '27/02/2018',
        dateTime: 1519689600,
        vehicleReg: 'AA',
        formattedReference: '1245853256893',
        location: 'Abingdon (A34/41 interchange - South of Oxford)',
        amount: 100,
        status: 'UNPAID',
        type: 'FPN',
        typeDescription: 'Fixed Penalty Notice',
        paymentDate: undefined,
        paymentAuthCode: '1234TBD',
        paymentRef: '12345678',
        paymentStartTime: 1519689600
      }]

      // Act
      const result = await penaltyGroupService.getPaymentsByCodeAndType('47hsqs103i0', 'FPN');

      // Assert
      expect(result).to.eql({
        penaltyDetails,
        penaltyType: 'FPN',
        totalAmount: 100
      });

    });

    it('Should throw an error when it fails to retrieve the group payment code', () => {
      // Arrange
      mockedHttpClient.resolves({ data: '' });

      // Act
      const result = penaltyGroupService.getPaymentsByCodeAndType('47hsqs103i0', 'FPN');

      // Assert
      return expect(result).rejectedWith(Error, 'Payment code not found');
    });
  });
});
