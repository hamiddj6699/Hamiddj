const express = require('express');
const authRouter = require('./auth');
const authenticateToken = require('../utils/authMiddleware');

const router = express.Router();

// Access the shared in-memory users array from auth router
const users = authRouter.users;

// Apply JWT middleware to all banking routes
router.use(authenticateToken);

// Get account balance
router.get('/balance', (req, res) => {
  const user = users.find(u => u.username === req.user.username);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json({ balance: user.balance });
});

// Transfer funds between users
router.post('/transfer', (req, res) => {
  const { toUsername, amount } = req.body;
  const fromUser = users.find(u => u.username === req.user.username);
  const toUser = users.find(u => u.username === toUsername);

  if (!fromUser || !toUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  if (fromUser.balance < numAmount) {
    return res.status(400).json({ message: 'Insufficient funds' });
  }

  fromUser.balance -= numAmount;
  toUser.balance += numAmount;

  return res.json({ message: 'Transfer successful', balance: fromUser.balance });
});

module.exports = router;