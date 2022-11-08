import SignedHttpClient from '../utils/httpclient';
import { ServiceName } from '../utils/logger';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.CPMS);
  }

  createCardPaymentTransaction(
    paymentCode,
    reg,
    penaltyRef,
    penaltyType,
    amount,
    redirectUrl,
    penaltyId,
  ) {
    return this.httpClient.post('cardPayment/', {
      payment_code: paymentCode,
      penalty_reference: penaltyRef,
      penalty_id: penaltyId,
      penalty_type: penaltyType,
      penalty_amount: amount,
      redirect_url: redirectUrl,
      vehicle_reg: reg,
    }, 3, 'CardPayment');
  }

  createGroupCardPaymentTransaction(penGrpId, amount, vehicleReg, type, penOverviews, redirectUrl) {
    return this.httpClient.post('groupPayment/', {
      PenaltyGroupId: penGrpId,
      TotalAmount: amount,
      VehicleRegistration: vehicleReg,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      Penalties: penOverviews.map(PaymentService.sanitisePenaltyForCpmsGroupCall),
    }, 3, 'GroupCardPayment');
  }

  static sanitisePenaltyForCpmsGroupCall(penalty) {
    return {
      PenaltyReference: penalty.formattedReference,
      PenaltyAmount: penalty.amount,
      VehicleRegistration: penalty.vehicleReg,
    };
  }

  confirmPayment(receiptReference, penaltyType) {
    return this.httpClient.post('confirm/', {
      receipt_reference: receiptReference,
      penalty_type: penaltyType,
    }, 3, 'ConfirmPayment');
  }

  makePayment(details) {
    return this.httpClient.post('payments/', details, 0, 'MakePayment');
  }
}
