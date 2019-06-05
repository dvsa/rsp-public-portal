import { validationResult } from 'express-validator/check';
import paymentCodeValidation from './../validation/paymentCode';
import PenaltyService from '../services/penalty.service';
import PenaltyGroupService from '../services/penaltyGroup.service';
import config from '../config';
import { logError } from './../utils/logger';

const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());

// Index Route
export const index = (req, res) => {
  if (Object.keys(req.query).some(param => param === 'invalidPaymentCode')) {
    return res.render('payment/index', { invalidPaymentCode: true });
  }
  return res.render('payment/index');
};

// Removes all non-alphanumeric characters and converts to lowercase
export const normalizePaymentcode = (req, res, next) => {
  if (req.body.payment_code) {
    req.body.payment_code = req.body.payment_code.replace(/\W|_/g, '').toLowerCase();
  }
  next();
};

export const validatePaymentCode = [
  normalizePaymentcode,
  paymentCodeValidation,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logError('ValidatePaymentCodeError', errors.mapped());

      const viewData = {
        invalidPaymentCode: true,
      };
      res.render('payment/index', viewData);
    } else {
      res.redirect(`payment-code/${req.body.payment_code}`);
    }
  },
];

export const getPaymentDetails = [
  paymentCodeValidation,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logError('ValidatePaymentCodeError', errors.mapped());
      res.redirect('../payment-code?invalidPaymentCode');
    } else {
      const paymentCode = req.params.payment_code;
      const isSinglePenalty = paymentCode.length === 16;
      const { service, getMethod, template } = isSinglePenalty ? {
        service: penaltyService,
        getMethod: 'getByPaymentCode',
        template: 'paymentDetails',
      } : {
        service: penaltyGroupService,
        getMethod: 'getByPenaltyGroupPaymentCode',
        template: 'multiPaymentInfo',
      };
      service[getMethod](paymentCode).then((entityData) => {
        const { enabled, location } = entityData;
        if (enabled || typeof enabled === 'undefined') {
          // Detailed location stored in single penalty for multi-penalties
          const locationText = isSinglePenalty ?
            location : entityData.penaltyDetails[0].penalties[0].location;
          res.render(`payment/${template}`, {
            ...entityData,
            location: locationText,
          });
        } else {
          res.redirect('../payment-code?invalidPaymentCode');
        }
      }).catch(() => {
        res.redirect('../payment-code?invalidPaymentCode');
      });
    }
  },
];

export const warnPendingPayment = [
  paymentCodeValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logError('ValidatePaymentCodeError', errors.mapped());
      res.redirect('../payment-code?invalidPaymentCode');
      return;
    }
    const paymentCode = req.params.payment_code;
    const isSinglePenalty = paymentCode.length === 16;
    const redirectUrl = isSinglePenalty ?
      `/payment-code/${paymentCode}/payment/confirmed` :
      `/payment-code/${paymentCode}/${req.params.type}/payment/confirmed`;

    const { service, getMethod, template } = isSinglePenalty ? {
      service: penaltyService,
      getMethod: 'getByPaymentCode',
      template: 'pendingPayment',
    } : {
      service: penaltyGroupService,
      getMethod: 'getByPenaltyGroupPaymentCode',
      template: 'pendingPayment',
    };

    try {
      const entityData = await service[getMethod](paymentCode);
      const { enabled, location } = entityData;
      if (enabled || typeof enabled === 'undefined') {
        // Detailed location stored in single penalty for multi-penalties
        const locationText = isSinglePenalty ?
          location : entityData.penaltyDetails[0].penalties[0].location;
        res.render(`payment/${template}`, {
          ...entityData,
          location: locationText,
          redirectUrl,
        });
      } else {
        res.redirect('../payment-code?invalidPaymentCode');
      }
    } catch (err) {
      res.redirect('../payment-code?invalidPaymentCode');
    }
  },
];

export const getMultiPenaltyPaymentSummary = [
  (req, res) => {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;
    penaltyGroupService.getPaymentsByCodeAndType(paymentCode, type).then((penaltiesForType) => {
      const paymentStatus = penaltiesForType.penaltyDetails.every(p => p.status === 'PAID') ? 'PAID' : 'UNPAID';
      res.render('payment/multiPaymentSummary', { paymentCode, paymentStatus, ...penaltiesForType });
    }).catch(() => {
      res.redirect('../payment-code?invalidPaymentCode');
    });
  },
];
