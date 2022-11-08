import SignedHttpClient from '../utils/httpclient';
import { ServiceName } from '../utils/logger';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.Payments);
  }

  makePayment(details) {
    return this.httpClient.post('payments/', details, 0, 'RecordPayment');
  }

  async getPayment(paymentCode) {
    return this.httpClient.get(`payments/${paymentCode}`, 'GetPayment');
  }

  async recordGroupPayment(details) {
    return this.httpClient.post('groupPayments/', details, 0, 'RecordGroupPayment');
  }

  async getGroupPayment(paymentCode) {
    return this.httpClient.get(`groupPayments/${paymentCode}`, 'GetGroupPayment');
  }
}
