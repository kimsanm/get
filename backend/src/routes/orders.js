const express = require('express');
const router = express.Router();
const repo = require('../db/repo');
const { authRequired } = require('../middleware/auth');

// Get user orders and purchased mail items
router.get('/', authRequired, async (req, res) => {
  try {
    const orders = await repo.getUserOrders(req.user.id);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

module.exports = router;
