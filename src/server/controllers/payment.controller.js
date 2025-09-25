/* eslint-disable no-use-before-define */
import PaymentService from '../services/payment.service';
import PenaltyService from '../services/penalty.service';
import CpmsService from '../services/cpms.service';
import config from '../config';
import { logInfo, logError } from '../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';
import { isGroupPaymentPending, isPaymentPending } from '../utils/pending-payments';

const paymentService = new PaymentService(config.paymentServiceUrl());
const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());
const cpmsService = new CpmsService(config.cpmsServiceUrl());

const getPenaltyOrGroupDetails = (req) => {
  const paymentCode = req.params.payment_code;
  if (paymentCode) {
    return paymentCode.length === 16
      ? penaltyService.getByPaymentCode(paymentCode)
      : penaltyGroupService.getByPenaltyGroupPaymentCode(paymentCode);
  }
  return penaltyService.getById(req.params.penalty_id);
};

const redirectForSinglePenalty = (req, res, penaltyDetails, redirectHost) => {
  const { paymentCode } = penaltyDetails;
  const redirectUrl = `${redirectHost}/payment-code/${paymentCode}/confirmPayment`;
  return cpmsService.createCardPaymentTransaction(
    paymentCode,
    penaltyDetails.vehicleReg,
    penaltyDetails.formattedReference,
    penaltyDetails.type,
    penaltyDetails.amount,
    redirectUrl,
    penaltyDetails.reference,
  ).then((response) => {
    logInfo('RedirectPaymentPage', {
      paymentCode,
      redirectUrl: response.data.gateway_url,
    });
    res.redirect(response.data.gateway_url);
  }).catch(() => {
    res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
  });
};

const redirectForPenaltyGroup = (req, res, penaltyGroupDetails, penaltyType, redirectHost) => {
  const redirectUrl = `${redirectHost}/payment-code/${penaltyGroupDetails.paymentCode}/${penaltyType}/confirmGroupPayment`;
  const penaltyOverviewsForType = penaltyGroupDetails.penaltyDetails
    .find((grouping) => grouping.type === penaltyType).penalties;
  const amountForType = penaltyOverviewsForType.reduce((total, pen) => total + pen.amount, 0);

  return cpmsService.createGroupCardPaymentTransaction(
    penaltyGroupDetails.paymentCode,
    amountForType,
    penaltyGroupDetails.penaltyGroupDetails.registrationNumber,
    penaltyType,
    penaltyOverviewsForType,
    redirectUrl,
  ).then((response) => {
    logInfo('RedirectPaymentPage', {
      paymentCode: penaltyGroupDetails.paymentCode,
      penaltyType,
      redirectUrl: response.data.gateway_url,
    });
    return res.redirect(response.data.gateway_url);
  })
    .catch(() => {
      logError('RedirectPaymentPageError', {
        paymentCode: penaltyGroupDetails.paymentCode,
        penaltyType,
      });
      res.redirect(`${config.urlRoot()}/payment-code/${penaltyGroupDetails.paymentCode}`);
    });
};

export const redirectToPaymentPageUnlessPending = async (req, res) => {
  // DEV OVERRIDE: Always redirect to a mock confirmation page for UI testing
  return res.redirect(`/payment-code/${req.params.payment_code}/confirmPayment`);
};

export const redirectToPaymentPage = async (req, res) => {
  let entityForCode;
  try {
    entityForCode = await getPenaltyOrGroupDetails(req);

    if (entityForCode.status === 'PAID' || entityForCode.paymentStatus === 'PAID') {
      const redirectUrl = `${config.urlRoot()}/payment-code/${entityForCode.paymentCode}`;
      logInfo('RedirectAlreadyPaid', {
        paymentCode: entityForCode.paymentCode,
      });
      return res.redirect(redirectUrl);
    }

    if (entityForCode.isPenaltyGroup) {
      const penaltyGroupType = req.params.type;
      const redirectUrl = config.redirectUrl();

      try {
        await penaltyGroupService.updateWithPaymentStartTime(
          entityForCode.paymentCode,
          req.params.type,
        );
      } catch (err) {
        logError('UpdateWithPaymentStartTime', {
          err: err.message,
          id: entityForCode.paymentCode,
          type: req.params.type,
        });
      }

      return redirectForPenaltyGroup(req, res, entityForCode, penaltyGroupType, redirectUrl);
    }

    try {
      await penaltyService.updateWithPaymentStartTime(entityForCode.penaltyId);
    } catch (err) {
      logError('UpdateWithPaymentStartTime', {
        err: err.message,
        id: entityForCode.penaltyId,
      });
    }
    return redirectForSinglePenalty(req, res, entityForCode, config.redirectUrl());
  } catch (err) {
    logError('RedirectPaymentPageError', {
      paymentCode: req.params.payment_code,
      penaltyDocumentId: req.params.penalty_id,
      error: err.message,
    });
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

export const confirmPayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  // DEV OVERRIDE: Immediately redirect to the receipt page for UI testing
  res.redirect(`/payment-code/${paymentCode}/receipt`);
};

export const confirmGroupPayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const receiptReference = req.query.receipt_reference;
  const logMessage = { paymentCode, receiptReference };
  try {
    const { type } = req.params;
    const confirmPromise = cpmsService.confirmPayment(receiptReference, type);
    const groupDetailsPromise = getPenaltyOrGroupDetails(req);
    const [groupDetails, confirmResp] = await Promise.all([groupDetailsPromise, confirmPromise]);

    const cpmsCode = confirmResp.data.code;

    if (cpmsCode === 801) {
      logInfo('CPMSConfirmSuccess', logMessage);
      const payload = buildGroupPaymentPayload(
        paymentCode,
        receiptReference,
        type,
        groupDetails,
        confirmResp,
      );
      await paymentService.recordGroupPayment(payload);
      logInfo('RecordGroupPaymentSuccess', logMessage);
      res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}/${type}/receipt`);
    } else if (cpmsCode === 807) {
      logInfo('UserCancelledPayment', {
        statusCode: 807,
        receiptReference,
        paymentCode,
      });
      res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
    } else {
      logError('ConfirmGroupPaymentUnhandlerCode', confirmResp.data);
      res.render('payment/failedPayment', { paymentCode });
    }
  } catch (error) {
    logError('ConfirmGroupPaymentPageError', {
      ...logMessage,
      error: error.message,
    });
    res.render('payment/failedPayment', { paymentCode });
  }
};

function buildGroupPaymentPayload(paymentCode, receiptReference, type, penaltyGroup, confirmResp) {
  const amountForType = penaltyGroup.penaltyGroupDetails.splitAmounts
    .find((a) => a.type === type).amount;
  return {
    PaymentCode: paymentCode,
    PenaltyType: type,
    PaymentDetail: {
      PaymentMethod: 'CARD',
      PaymentRef: receiptReference,
      AuthCode: confirmResp.data.auth_code,
      PaymentAmount: amountForType,
      PaymentDate: Math.floor(Date.now() / 1000),
    },
    PenaltyIds: penaltyGroup.penaltyDetails
      .find((penaltiesOfType) => penaltiesOfType.type === type).penalties
      .map((penalties) => `${penalties.reference}_${type}`),
  };
}
