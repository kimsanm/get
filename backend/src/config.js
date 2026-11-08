const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 5005,
  jwtSecret: process.env.JWT_SECRET || 'mail_otp_default_secret_key_123',
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || ''
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  },
  imapDefaults: {
    // Standard default IMAP hosts based on domain
    'gmail.com': { host: 'imap.gmail.com', port: 993, tls: true },
    'googlemail.com': { host: 'imap.gmail.com', port: 993, tls: true },
    'outlook.com': { host: 'outlook.office365.com', port: 993, tls: true },
    'hotmail.com': { host: 'outlook.office365.com', port: 993, tls: true },
    'live.com': { host: 'outlook.office365.com', port: 993, tls: true },
    'yahoo.com': { host: 'imap.mail.yahoo.com', port: 993, tls: true },
    'icloud.com': { host: 'imap.mail.me.com', port: 993, tls: true },
    'rambler.ru': { host: 'imap.rambler.ru', port: 993, tls: true },
    'mail.ru': { host: 'imap.mail.ru', port: 993, tls: true }
  }
};
