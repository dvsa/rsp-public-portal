import config from '../config';

const paymentStartTimeField = {
  FPN: 'fpnPaymentStartTime',
  IM: 'imPaymentStartTime',
  CDN: 'cdnPaymentStartTime',
};

export function isPaymentPending(lastPaymentAttemptTime) {
  if (!lastPaymentAttemptTime) {
    return false;
  }
  return (new Date() - (lastPaymentAttemptTime * 1000)) < config.pendingPaymentTimeMilliseconds();
}

export function isGroupPaymentPending(penaltyGroup, penaltyType) {
  return isPaymentPending(penaltyGroup.penaltyGroupDetails[paymentStartTimeField[penaltyType]]);
}
