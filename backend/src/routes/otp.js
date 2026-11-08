const express = require('express');
const router = express.Router();
const repo = require('../db/repo');
const { authRequired } = require('../middleware/auth');
const { fetchLatestOtp } = require('../services/imapService');

// Fetch latest OTP via IMAP
router.post('/fetch', authRequired, async (req, res) => {
  try {
    const { mailId } = req.body;
    if (!mailId) {
      return res.status(400).json({ error: 'Mail ID is required' });
    }

    const isAdmin = req.user.role === 'admin';
    const mail = await repo.getMailForOtp(mailId, req.user.id, isAdmin);

    if (!mail) {
      return res.status(403).json({ error: 'Mail not found or does not belong to your account' });
    }

    const result = await fetchLatestOtp({
      email: mail.email,
      password: mail.password,
      imapHost: mail.imap_host,
      imapPort: mail.imap_port,
      imapTls: mail.imap_tls
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

    // If OTP detected, log into database
    if (result.latestOtp) {
      const topMsg = result.messages?.[0] || {};
      await repo.logOtp({
        mailId: mail.id,
        userId: req.user.id,
        otpCode: result.latestOtp,
        sender: topMsg.from || '',
        subject: topMsg.subject || '',
        fullMessage: topMsg.snippet || ''
      });
    }

    res.json({
      success: true,
      email: mail.email,
      latestOtp: result.latestOtp,
      count: result.count,
      messages: result.messages || []
    });
  } catch (err) {
    console.error('Fetch OTP error:', err);
    res.status(500).json({ error: 'Error processing IMAP OTP request' });
  }
});

module.exports = router;
