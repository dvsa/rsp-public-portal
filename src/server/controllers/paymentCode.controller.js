import { validationResult } from 'express-validator';
import moment from 'moment';
import paymentCodeValidation from '../validation/paymentCode';
import PenaltyService from '../services/penalty.service';
import PenaltyGroupService from '../services/penaltyGroup.service';
import config from '../config';
import { logError, logInfo } from '../utils/logger';
import { isPaymentPending, isGroupPaymentPending } from '../utils/pending-payments';

const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());

// Index Route
export const index = (req, res) => {
  if (Object.keys(req.query).some((param) => param === 'invalidPaymentCode')) {
    if (Object.keys(req.query).some((param) => param === 'type' && req.query.type === 'overdue')) {
      const viewData = {
        invalidPaymentCode: true,
        type: 'overdue',
      };
      if (Object.keys(req.query).some((param) => param === 'id')) {
        return res.render('payment/index', { ...viewData, id: req.query.id });
      }
      return res.render('payment/index', viewData);
    }
    return res.render('payment/index', { invalidPaymentCode: true, type: 'invalid' });
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
  (req, res) => {
    // Mock data for single penalty
    const mockEntityData = {
      enabled: true,
      location: 'Test Location',
      vehicleReg: 'TEST123',
      paymentStartTime: null,
      penaltyDetails: [
        {
          penalties: [
            { location: 'Test Location' }
          ]
        }
      ],
      // ...add any other fields your template expects
    };
    const isSinglePenalty = true;
    const template = isSinglePenalty ? 'paymentDetails' : 'multiPaymentInfo';
    const paymentPending = false;
    const pendingMinutes = 15;
    res.render(`payment/${template}`, {
      ...mockEntityData,
      location: mockEntityData.location,
      paymentPending,
      pendingMinutes,
    });
  },
];
export const getMultiPenaltyPaymentSummary = [
  async (req, res) => {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;
    try {
      const penaltiesForType = await penaltyGroupService.getPaymentsByCodeAndType(paymentCode, type);
      const paymentStatus = penaltiesForType.penaltyDetails.every((p) => p.status === 'PAID') ? 'PAID' : 'UNPAID';
      const penaltyGroup = await penaltyGroupService.getByPenaltyGroupPaymentCode(paymentCode);
      const paymentPending = isGroupPaymentPending(penaltyGroup, type);
      const pendingMinutes = Math.round(config.pendingPaymentTimeMilliseconds() / 60000);
      if (paymentPending) {
        logInfo('PaymentPending');
      }
      res.render('payment/multiPaymentSummary', {
        paymentCode, paymentStatus, ...penaltiesForType, paymentPending, pendingMinutes,
      });
    } catch (err) {
      res.redirect('../payment-code?invalidPaymentCode');
    }
  },
];
