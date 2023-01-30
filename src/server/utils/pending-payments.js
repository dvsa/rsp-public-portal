import config from '../config';

const paymentStartTimeField = {
  FPN: 'fpnPaymentStartTime',
  IM: 'imPaymentStartTime',
  CDN: 'cdnPaymentStartTime',
};

export const isPaymentPending = (lastPaymentAttemptTime) => {
  if (!lastPaymentAttemptTime) {
    return false;
  }
  return (new Date() - (lastPaymentAttemptTime * 1000)) < config.pendingPaymentTimeMilliseconds();
};

export const isGroupPaymentPending = (penaltyGroup, penaltyType) => isPaymentPending(penaltyGroup.penaltyGroupDetails[paymentStartTimeField[penaltyType]]);
