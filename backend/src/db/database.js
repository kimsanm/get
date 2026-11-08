const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config');

const dbPath = path.resolve(__dirname, '../../data.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    telegram_id TEXT,
    balance REAL DEFAULT 0.0,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT DEFAULT 'general',
    imap_host TEXT,
    imap_port INTEGER DEFAULT 993,
    imap_tls INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mail_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    recovery_email TEXT,
    extra_info TEXT,
    status TEXT DEFAULT 'available',
    order_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS otp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mail_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    otp_code TEXT,
    sender TEXT,
    subject TEXT,
    full_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mail_id) REFERENCES mail_items(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed default admin and sample products if empty
function initializeDefaults() {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get(config.admin.username);
  if (!adminExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(config.admin.password, salt);
    db.prepare(`
      INSERT INTO users (username, password_hash, balance, role) 
      VALUES (?, ?, 1000.0, 'admin')
    `).run(config.admin.username, hash);
    console.log(`[DB] Created default admin account: ${config.admin.username}`);
  }

  // Create demo user account
  const demoUser = db.prepare('SELECT id FROM users WHERE username = ?').get('demo_user');
  if (!demoUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('demo123', salt);
    db.prepare(`
      INSERT INTO users (username, password_hash, balance, role) 
      VALUES (?, ?, 50.0, 'user')
    `).run('demo_user', hash);
    console.log(`[DB] Created demo user: demo_user / demo123 (Balance: $50)`);
  }

  const productCount = db.prepare('SELECT count(*) as count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, description, price, category, imap_host, imap_port, imap_tls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
      'Outlook / Hotmail Clean (IMAP Active)',
      'High trust score, IMAP/POP3 enabled. Instant OTP retrieval supported.',
      0.25,
      'outlook',
      'outlook.office365.com',
      993,
      1
    );

    insertProduct.run(
      'Gmail Account with App Password (IMAP)',
      'Aged Gmail account with pre-configured 16-character App Password for instant OTP via IMAP.',
      0.60,
      'gmail',
      'imap.gmail.com',
      993,
      1
    );

    insertProduct.run(
      'Rambler.ru Mail (Active IMAP)',
      'Fast delivery, supports social media / game registration OTP.',
      0.10,
      'rambler',
      'imap.rambler.ru',
      993,
      1
    );

    console.log('[DB] Seeded standard mail products');
  }
}

initializeDefaults();

module.exports = db;

