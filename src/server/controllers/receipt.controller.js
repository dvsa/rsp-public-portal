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

// DEV OVERRIDE: Render receipt page with mock data for UI testing
export const singlePaymentReceipt = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const resp = {
    paymentType: 'FPN',
    paymentStatus: 'PAID',
    paymentDetails: {
      Payments: {
        FPN: {
          PaymentAmount: 100,
          PaymentStatus: 'PAID',
          FormattedDate: '25/09/2025',
          FormattedTime: '10:00am',
        }
      }
    },
    registrationNumber: 'TEST123',
    location: 'Test Location',
    date: '25/09/2025',
    penaltyDetails: [{ type: 'FPN', penalties: [{ reference: 'REF123', type: 'FPN', amount: 100 }] }],
    paymentCode,
  };
  return res.render('payment/multiPaymentReceipt', resp);
};

// DEV OVERRIDE: Render multi-payment receipt page with mock data for UI testing
export const multiPaymentReceipt = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const resp = {
    paymentType: req.params.type || 'FPN',
    paymentDetails: {
      Payments: {
        FPN: {
          PaymentAmount: 200,
          PaymentStatus: 'PAID',
          FormattedDate: '25/09/2025',
          FormattedTime: '10:00am',
        }
      }
    },
    registrationNumber: 'TESTGROUP',
    location: 'Test Group Location',
    date: '25/09/2025',
    penaltyDetails: [{ type: 'FPN', penalties: [{ reference: 'GROUPREF', type: 'FPN', amount: 200 }] }],
    paymentCode,
  };
  return res.render('payment/multiPaymentReceipt', resp);
};
