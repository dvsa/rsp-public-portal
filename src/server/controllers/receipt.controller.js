// @ts-check
import moment from 'moment-timezone';

import config from '../config';
import PenaltyGroupService from '../services/penaltyGroup.service';
import PaymentService from '../services/payment.service';
import PenaltyService from '../services/penalty.service';

const TIMEZONE_ID = 'Europe/London';

const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());
const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const paymentService = new PaymentService(config.paymentServiceUrl());

function addFormattedPaymentDateTime(payment) {
  const timestamp = payment.PaymentDate * 1000;
  const dateTime = moment.tz(timestamp, TIMEZONE_ID);
  return {
    FormattedDate: dateTime.format('DD/MM/YYYY'),
    FormattedTime: dateTime.format('h:mma'),
    ...payment,
  };
}

function paymentDetailsFromPenalty(penalty, payment) {
  let paymentDetail = {
    PaymentAmount: penalty.amount,
    PaymentStatus: penalty.status,
    ...payment.PaymentDetail,
  };

  paymentDetail = addFormattedPaymentDateTime(paymentDetail);

  return {
    Payments: { [penalty.type]: paymentDetail },
  };
}

function isValidPaymentPaymentType(type) {
  return ['FPN', 'CDN', 'IM'].includes(type);
}

function addFormattedPaymentDateTimes(paymentDetails) {
  const newPaymentDetails = { ...paymentDetails };
  newPaymentDetails.Payments = Object.keys(newPaymentDetails.Payments).reduce((acc, type) => {
    acc[type] = addFormattedPaymentDateTime(newPaymentDetails.Payments[type]);
    return acc;
  }, {});
  return newPaymentDetails;
}

export const singlePaymentReceipt = async (req, res) => {
  const paymentCode = req.params.payment_code;
  try {
    const penalty = await penaltyService.getByPaymentCode(paymentCode);
    const paymentId = `${penalty.reference}_${penalty.type}`;
    const { payment } = (await paymentService.getPayment(paymentId)).data;
    const paymentDetails = paymentDetailsFromPenalty(penalty, payment);

    const resp = {
      paymentType: penalty.type,
      paymentStatus: penalty.status,
      paymentDetails,
      registrationNumber: penalty.vehicleReg,
      location: penalty.location,
      date: penalty.issueDate,
      penaltyDetails: [{ type: penalty.type, penalties: [penalty] }],
      paymentCode,
    };
    return res.render('payment/multiPaymentReceipt', resp);
  } catch (error) {
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

export const multiPaymentReceipt = async (req, res) => {
  try {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;

    if (!isValidPaymentPaymentType(type)) {
      return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
    }

    const penaltyGroup = await penaltyGroupService.getByPenaltyGroupPaymentCode(paymentCode);
    const { location } = penaltyGroup.penaltyDetails[0].penalties[0];
    const paymentDetails = (await paymentService.getGroupPayment(paymentCode)).data;
    const enrichedPaymentDetails = addFormattedPaymentDateTimes(paymentDetails);

    const { penaltyGroupDetails, ...penaltyGroupData } = penaltyGroup;

    const resp = {
      paymentType: req.params.type,
      paymentDetails: enrichedPaymentDetails,
      ...penaltyGroupData,
      ...penaltyGroupDetails,
      location,
    };

    return res.render('payment/multiPaymentReceipt', resp);
  } catch (error) {
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};
