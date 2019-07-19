import { Router } from 'express';

import * as mainController from './controllers/main.controller';
import * as paymentCodeController from './controllers/paymentCode.controller';
import * as paymentController from './controllers/payment.controller';
import { multiPaymentReceipt, singlePaymentReceipt } from './controllers/receipt.controller';

const router = Router();

router.get('/robots.txt', mainController.robots);

// Landing Page
router.get('/', mainController.index);

// Payment Code
router.get('/payment-code', paymentCodeController.index);
router.post('/payment-code', paymentCodeController.validatePaymentCode);
router.get('/payment-code/:payment_code', paymentCodeController.getPaymentDetails);
router.get('/payment-code/:payment_code/receipt', singlePaymentReceipt);
router.get('/payment-code/:payment_code/:type/details', paymentCodeController.getMultiPenaltyPaymentSummary);

router.get('/payment-code/:payment_code/pending', paymentCodeController.warnPendingPayment);
router.get('/payment-code/:payment_code/:type/pending', paymentCodeController.warnPendingPayment);

router.post('/payment-code/:payment_code/payment', paymentController.redirectToPaymentPageUnlessPending);
router.post('/payment-code/:payment_code/:type/payment', paymentController.redirectToPaymentPageUnlessPending);
router.get('/payment-code/:payment_code/confirmPayment', paymentController.confirmPayment);
router.get('/payment-code/:payment_code/:type/confirmGroupPayment', paymentController.confirmGroupPayment);
router.get('/payment-code/:payment_code/:type/receipt', multiPaymentReceipt);

export default router;
