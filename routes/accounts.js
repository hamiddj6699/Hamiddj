const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { auth } = require('../middleware/auth');
const {
  validateAccountCreation,
  validateTransaction
} = require('../middleware/validation');

// All routes require authentication
router.use(auth);

// Account management
router.post('/', validateAccountCreation, accountController.createAccount);
router.get('/', accountController.getUserAccounts);
router.get('/:accountId', accountController.getAccountDetails);
router.get('/:accountId/balance', accountController.getAccountBalance);
router.delete('/:accountId', accountController.closeAccount);

// Transactions
router.post('/transfer', validateTransaction, accountController.transferMoney);
router.get('/:accountId/transactions', accountController.getAccountTransactions);

module.exports = router;