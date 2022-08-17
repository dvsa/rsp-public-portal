import { find, isEmpty, uniq } from 'lodash';
import moment from 'moment';
import SignedHttpClient from '../utils/httpclient';
import PenaltyService from './penalty.service';
import { ServiceName } from '../utils/logger';

export default class PenaltyGroupService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.Documents);
  }

  getByPenaltyGroupPaymentCode(paymentCode) {
    return this.httpClient.get(`penaltyGroup/${paymentCode}`, 'GetByPenaltyGroupPaymentCode').then((response) => {
      if (isEmpty(response.data) || !response.data.ID) {
        throw new Error('Payment code not found');
      }
      const {
        Payments,
        ID,
        PaymentStatus,
        VehicleRegistration,
        Location,
        Timestamp,
        TotalAmount,
        Enabled,
        imPaymentStartTime,
        fpnPaymentStartTime,
        cdnPaymentStartTime,
      } = response.data;
      const {
        splitAmounts,
        parsedPenalties,
        nextPayment,
      } = PenaltyGroupService.parsePayments(Payments);
      return {
        isPenaltyGroup: true,
        enabled: Enabled,
        penaltyGroupDetails: {
          registrationNumber: VehicleRegistration,
          location: Location,
          date: moment.unix(Timestamp).format('DD/MM/YYYY'),
          dateTime: Timestamp,
          amount: TotalAmount,
          splitAmounts,
          imPaymentStartTime,
          fpnPaymentStartTime,
          cdnPaymentStartTime,
        },
        paymentCode: ID,
        penaltyDetails: parsedPenalties,
        paymentStatus: PaymentStatus,
        nextPayment,
      };
    });
  }

  getPaymentsByCodeAndType(paymentCode, type) {
    return this.httpClient.get(`penaltyGroup/${paymentCode}`, 'GetPaymentsByCodeAndType').then((response) => {
      if (isEmpty(response.data) || !response.data.ID) {
        throw new Error('Payment code not found');
      }
      const { Payments } = response.data;
      const pensOfType = Payments.filter((p) => p.PaymentCategory === type)[0].Penalties;
      return {
        penaltyDetails: pensOfType.map((p) => PenaltyService.parsePenalty(p)),
        penaltyType: type,
        totalAmount: pensOfType.reduce((total, pen) => total + pen.Value.penaltyAmount, 0),
      };
    });
  }

  updateWithPaymentStartTime(id, penaltyType) {
    return this.httpClient.put('penaltyGroup/updateWithPaymentStartTime', { id, penaltyType }, 3, 'UpdateGroupWithPaymentStartTime');
  }

  static getNextPayment(unpaidPayments) {
    const FPNPayment = find(unpaidPayments, ['PaymentCategory', 'FPN']);
    const CDNPayment = find(unpaidPayments, ['PaymentCategory', 'CDN']);
    const IMPayment = find(unpaidPayments, ['PaymentCategory', 'IM']);
    return IMPayment || FPNPayment || CDNPayment;
  }

  static parsePayments(paymentsArr) {
    const splitAmounts = paymentsArr.map((payment) => { // eslint-disable-line arrow-body-style
      return {
        type: payment.PaymentCategory,
        amount: payment.TotalAmount,
        status: payment.PaymentStatus,
      };
    });
    const types = uniq(paymentsArr.map((payment) => payment.PaymentCategory));
    const parsedPenalties = types.map((type) => {
      const penalties = paymentsArr.filter((p) => p.PaymentCategory === type)[0].Penalties;
      return {
        type,
        penalties: penalties.map((p) => PenaltyService.parsePenalty(p)),
      };
    });
    const unpaidPayments = paymentsArr.filter((payment) => payment.PaymentStatus === 'UNPAID');
    const nextPayment = PenaltyGroupService.getNextPayment(unpaidPayments);
    return { splitAmounts, parsedPenalties, nextPayment };
  }
}
