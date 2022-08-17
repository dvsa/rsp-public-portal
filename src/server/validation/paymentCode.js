import { check } from 'express-validator';

export default [
  check('payment_code').isLength({ min: 5, max: 18 }),
  // check('payment_code').trim().isHexadecimal(),
];
