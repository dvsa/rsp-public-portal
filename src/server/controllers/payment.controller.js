/* eslint-disable no-use-before-define */
import PaymentService from './../services/payment.service';
import PenaltyService from './../services/penalty.service';
import CpmsService from './../services/cpms.service';
import config from './../config';
import { logInfo, logError } from './../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';

const paymentService = new PaymentService(config.paymentServiceUrl());
const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());
const cpmsService = new CpmsService(config.cpmsServiceUrl());

const getPenaltyOrGroupDetails = (req) => {
  const paymentCode = req.params.payment_code;
  if (paymentCode) {
    return paymentCode.length === 16 ?
      penaltyService.getByPaymentCode(paymentCode)
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
    .find(grouping => grouping.type === penaltyType).penalties;
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
  logInfo('redirectToPaymentPageUnlessPending', { params: req.params });
  try {
    const entityForCode = await getPenaltyOrGroupDetails(req);
    logInfo('EntityForCode', entityForCode);
    if (entityForCode.status !== 'PAID') {
      if (req.params.type) {
        // penaltyGroup
        if (isGroupPaymentPending(entityForCode, req.params.type)) {
          logInfo('PaymentPending', {
            paymentCode: entityForCode.paymentCode,
            penaltyType: req.params.type,
          });
          return res.redirect(`${config.urlRoot()}/payment-code/${entityForCode.paymentCode}/${req.params.type}/pending`);
        }
      } else if (isPaymentPending(entityForCode.paymentStartTime)) {
        logInfo('PaymentPending', {
          paymentCode: entityForCode.paymentCode,
        });
        return res.redirect(`${config.urlRoot()}/payment-code/${entityForCode.paymentCode}/pending`);
      }
    }
    return redirectToPaymentPage(req, res);
  } catch (err) {
    logError('RedirectToPaymentPageUnlessPendingError', {
      err: err.message,
      params: req.params,
    });
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

/** 60 minutes */
const PAYMENT_PENDING_TIMEOUT = 1000 * 60 * 60;

function isPaymentPending(lastPaymentAttemptTime) {
  if (!lastPaymentAttemptTime) {
    return false;
  }
  return (new Date() - (lastPaymentAttemptTime * 1000)) < PAYMENT_PENDING_TIMEOUT;
}

const paymentStartTimeField = {
  FPN: 'fpnPaymentStartTime',
  IM: 'imPaymentStartTime',
  CDN: 'cdnPaymentStartTime',
};

function isGroupPaymentPending(penaltyGroup, penaltyType) {
  return isPaymentPending(penaltyGroup.penaltyGroupDetails[paymentStartTimeField[penaltyType]]);
}

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
  const receiptReference = req.query.receipt_reference;
  const paymentCode = req.params.payment_code;
  let penaltyDetails;
  const logMessage = { receiptReference, paymentCode };

  try {
    penaltyDetails = await getPenaltyOrGroupDetails(req);

    await cpmsService.confirmPayment(
      receiptReference,
      penaltyDetails.type,
    ).then(async (response) => {
      if (response.data.code === 801) {
        logInfo('PaymentConfirmed', logMessage);
        // Payment successful
        const details = {
          PaymentCode: penaltyDetails.paymentCode,
          PenaltyStatus: 'PAID',
          PenaltyType: penaltyDetails.type,
          PenaltyReference: penaltyDetails.reference,
          PaymentDetail: {
            PaymentMethod: 'CARD',
            PaymentRef: response.data.receipt_reference,
            AuthCode: response.data.auth_code,
            PaymentAmount: penaltyDetails.amount,
            PaymentDate: Math.round((new Date()).getTime() / 1000),
          },
        };
        await paymentService.makePayment(details)
          .then(() => {
            logInfo('RecordPaymentSuccess', logMessage);
            res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}/receipt`);
          })
          .catch((error) => {
            logError('RecordPaymentError', { ...logMessage, error: error.message });
            res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
          });
      } else {
        if (response.data.code === 807) {
          logInfo('UserCancelledPayment', {
            ...logMessage,
            statusCode: 807,
          });
        } else {
          logError('ConfirmPaymentNon801', {
            ...logMessage,
            responseData: response.data,
          });
        }
        res.render('payment/failedPayment', { paymentCode });
      }
    }).catch((error) => {
      logError('CPMSConfirmPaymentError', {
        ...logMessage,
        error: error.message,
      });
      res.render('payment/failedPayment', { paymentCode });
    });
  } catch (error) {
    logError('ConfirmPaymentPageError', {
      ...logMessage,
      error: error.message,
    });
    res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
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
    .find(a => a.type === type).amount;
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
      .find(penaltiesOfType => penaltiesOfType.type === type).penalties
      .map(penalties => `${penalties.reference}_${type}`),
  };
}
