const express = require('express');
const router = express.Router();
const repo = require('../db/repo');
const { adminRequired } = require('../middleware/auth');

// Apply admin guard
router.use(adminRequired);

// Dashboard overview stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await repo.getAdminStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin stats' });
  }
});

// Bulk upload stock
router.post('/upload-stock', async (req, res) => {
  try {
    const { productId, rawData } = req.body;
    if (!productId || !rawData) {
      return res.status(400).json({ error: 'Product ID and raw data are required' });
    }

    const result = await repo.insertBulkStock(productId, rawData);
    res.json({
      success: true,
      message: `Successfully imported ${result.addedCount} accounts for ${result.productName}`,
      addedCount: result.addedCount,
      errors: result.errors
    });
  } catch (err) {
    console.error('Upload stock error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload stock' });
  }
});

// Manage products (Add/Edit)
router.post('/products', async (req, res) => {
  try {
    const { id, name, description, price, category, imap_host, imap_port, imap_tls } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    if (id) {
      await repo.updateProduct(id, { name, description, price, category, imap_host, imap_port, imap_tls });
      return res.json({ success: true, message: 'Product updated successfully' });
    } else {
      const created = await repo.createProduct({ name, description, price, category, imap_host, imap_port, imap_tls });
      return res.json({ success: true, message: 'Product created successfully', id: created.id });
    }
  } catch (err) {
    console.error('Product save error:', err);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// List stock with optional filters
router.get('/stock', async (req, res) => {
  try {
    const { status, productId } = req.query;
    const stock = await repo.getStockList({ status, productId });
    res.json({ success: true, stock });
  } catch (err) {
    console.error('Fetch stock error:', err);
    res.status(500).json({ error: 'Failed to retrieve stock list' });
  }
});

// Top up user balance
router.post('/topup', async (req, res) => {
  try {
    const { username, amount } = req.body;
    const addAmt = Number(amount);
    if (!username || isNaN(addAmt) || addAmt <= 0) {
      return res.status(400).json({ error: 'Valid username and positive amount required' });
    }

    const user = await repo.getUserByUsername(username.trim());
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await repo.updateUserBalance(user.id, addAmt);
    res.json({
      success: true,
      message: `Added $${addAmt.toFixed(2)} to ${user.username}`,
      user: updatedUser
    });
  } catch (err) {
    console.error('Topup error:', err);
    res.status(500).json({ error: 'Failed to topup user balance' });
  }
});

module.exports = router;
