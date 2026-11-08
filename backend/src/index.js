const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db/database');
const { initBot } = require('./services/botService');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const otpRoutes = require('./routes/otp');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    telegramBotActive: !!config.telegram.token
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static build
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start Telegram Bot
initBot();

// Start HTTP Server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Mail Store & OTP Server running on port ${PORT}`);
  console.log(`👉 API Health: https://get-5w3d.onrender.com/api/health`);
  console.log(`🔑 Admin Login: ${config.admin.username} / ${config.admin.password}`);
  console.log(`===============================================`);
});
