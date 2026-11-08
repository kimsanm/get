const express = require('express');
const router = express.Router();
const repo = require('../db/repo');
const { authRequired } = require('../middleware/auth');
const { notifyAdminNewOrder } = require('../services/botService');

// Get all products with stock
router.get('/', async (req, res) => {
  try {
    const products = await repo.getAllProductsWithStock();
    res.json({ success: true, products });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Buy product
router.post('/buy', authRequired, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = parseInt(quantity, 10);

    if (!productId || qty <= 0) {
      return res.status(400).json({ error: 'Valid product ID and quantity required' });
    }

    const result = await repo.processOrderPurchase({
      userId: req.user.id,
      productId,
      quantity: qty
    });

    // Notify Telegram Admin
    notifyAdminNewOrder({
      orderCode: result.orderCode,
      username: req.user.username,
      productName: result.productName,
      price: result.totalPrice,
      email: `${result.items[0].email}${qty > 1 ? ` (+${qty - 1} more)` : ''}`
    });

    res.json({
      success: true,
      orderCode: result.orderCode,
      totalPrice: result.totalPrice,
      items: result.items.map(item => ({
        id: item.id,
        email: item.email,
        password: item.password,
        recovery_email: item.recovery_email,
        extra_info: item.extra_info
      }))
    });
  } catch (err) {
    console.error('Buy error:', err);
    res.status(400).json({ error: err.message || 'Purchase failed' });
  }
});

module.exports = router;
