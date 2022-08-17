import { isEmpty, has } from 'lodash';
import moment from 'moment';
import SignedHttpClient from '../utils/httpclient';
import { ServiceName } from '../utils/logger';

export default class PenaltyService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.Documents);
  }

  static getPenaltyTypeDescription(penaltyType) {
    switch (penaltyType.toUpperCase()) {
      case 'CDN':
        return 'Court Deposit Notice';
      case 'FPN':
        return 'Fixed Penalty Notice';
      case 'IM':
        return 'Immobilisation';
      default:
        return 'Unknown';
    }
  }

  static parsePenalty(data) {
    const penaltyId = data.ID;
    const reference = penaltyId.split('_').shift();
    const rawPenalty = data.Value;
    const complete = has(rawPenalty, 'vehicleDetails') && !isEmpty(rawPenalty);
    const penaltyDetails = {
      complete,
      penaltyId,
      reference,
      enabled: data.Enabled,
      paymentCode: rawPenalty.paymentToken,
      issueDate: complete && moment.unix(rawPenalty.dateTime).format('DD/MM/YYYY'),
      dateTime: rawPenalty.dateTime,
      vehicleReg: complete && rawPenalty.vehicleDetails.regNo,
      formattedReference: rawPenalty.referenceNo,
      location: complete && rawPenalty.placeWhereIssued,
      amount: rawPenalty.penaltyAmount,
      status: rawPenalty.paymentStatus,
      type: rawPenalty.penaltyType,
      typeDescription: PenaltyService.getPenaltyTypeDescription(rawPenalty.penaltyType),
      paymentDate: rawPenalty.paymentDate ? moment.unix(rawPenalty.paymentDate).format('DD/MM/YYYY') : undefined,
      paymentAuthCode: rawPenalty.paymentAuthCode,
      paymentRef: rawPenalty.paymentRef,
      paymentStartTime: rawPenalty.paymentStartTime,
    };
    return penaltyDetails;
  }

  async getByPaymentCode(paymentCode) {
    const response = await this.httpClient.get(`documents/tokens/${paymentCode}`, 'GetByPaymentCode');

    if (isEmpty(response.data)) {
      throw new Error('Payment code not found');
    }
    return Promise.resolve(PenaltyService.parsePenalty(response.data));
  }

  updateWithPaymentStartTime(penaltyId) {
    return this.httpClient.put('documents/updateWithPaymentStartTime/', { id: penaltyId }, 3, 'UpdateWithStartTime');
  }
}
