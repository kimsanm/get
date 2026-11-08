const supabase = require('./supabaseClient');
const sqliteDb = require('./database');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Helper to check if using Supabase
const isSupabase = () => !!supabase;

// ==========================================
// USERS
// ==========================================
async function getUserById(id) {
  if (isSupabase()) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') console.error('Supabase getUserById error:', error);
    return data || null;
  }
  return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

async function getUserByUsername(username) {
  if (isSupabase()) {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error && error.code !== 'PGRST116') console.error('Supabase getUserByUsername error:', error);
    return data || null;
  }
  return sqliteDb.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

async function getUserByTelegramId(tgId) {
  if (isSupabase()) {
    const { data, error } = await supabase.from('users').select('*').eq('telegram_id', tgId).single();
    if (error && error.code !== 'PGRST116') console.error('Supabase getUserByTelegramId error:', error);
    return data || null;
  }
  return sqliteDb.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgId) || null;
}

async function createUser({ username, password_hash, telegram_id = null, balance = 10.0, role = 'user' }) {
  if (isSupabase()) {
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, password_hash, telegram_id, balance, role }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const result = sqliteDb.prepare(`
    INSERT INTO users (username, password_hash, telegram_id, balance, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, password_hash, telegram_id, balance, role);
  return { id: result.lastInsertRowid, username, telegram_id, balance, role };
}

async function updateUserBalance(userId, deltaAmount) {
  if (isSupabase()) {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');
    const newBal = Number((Number(user.balance) + Number(deltaAmount)).toFixed(2));
    const { data, error } = await supabase
      .from('users')
      .update({ balance: newBal })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  sqliteDb.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(deltaAmount, userId);
  return getUserById(userId);
}

// ==========================================
// PRODUCTS
// ==========================================
async function getAllProductsWithStock() {
  if (isSupabase()) {
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    if (pErr) throw pErr;

    // Get stock counts
    const { data: stocks, error: sErr } = await supabase
      .from('mail_items')
      .select('product_id')
      .eq('status', 'available');
    if (sErr) throw sErr;

    const countMap = {};
    (stocks || []).forEach(s => {
      countMap[s.product_id] = (countMap[s.product_id] || 0) + 1;
    });

    return products.map(p => ({
      ...p,
      stock: countMap[p.id] || 0
    }));
  }

  return sqliteDb.prepare(`
    SELECT p.*, COUNT(m.id) as stock
    FROM products p
    LEFT JOIN mail_items m ON p.id = m.product_id AND m.status = 'available'
    GROUP BY p.id
    ORDER BY p.id ASC
  `).all();
}

async function getProductById(id) {
  if (isSupabase()) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }
  return sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(id) || null;
}

async function createProduct(prod) {
  if (isSupabase()) {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: prod.name,
        description: prod.description || '',
        price: Number(prod.price),
        category: prod.category || 'general',
        imap_host: prod.imap_host || '',
        imap_port: parseInt(prod.imap_port || 993),
        imap_tls: prod.imap_tls ? 1 : 0
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const result = sqliteDb.prepare(`
    INSERT INTO products (name, description, price, category, imap_host, imap_port, imap_tls)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(prod.name, prod.description || '', Number(prod.price), prod.category || 'general', prod.imap_host || '', parseInt(prod.imap_port || 993), prod.imap_tls ? 1 : 0);
  return { id: result.lastInsertRowid, ...prod };
}

async function updateProduct(id, prod) {
  if (isSupabase()) {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: prod.name,
        description: prod.description || '',
        price: Number(prod.price),
        category: prod.category || 'general',
        imap_host: prod.imap_host || '',
        imap_port: parseInt(prod.imap_port || 993),
        imap_tls: prod.imap_tls ? 1 : 0
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  sqliteDb.prepare(`
    UPDATE products 
    SET name = ?, description = ?, price = ?, category = ?, imap_host = ?, imap_port = ?, imap_tls = ?
    WHERE id = ?
  `).run(prod.name, prod.description || '', Number(prod.price), prod.category || 'general', prod.imap_host || '', parseInt(prod.imap_port || 993), prod.imap_tls ? 1 : 0, id);
  return { id, ...prod };
}

// ==========================================
// ORDERS & PURCHASE
// ==========================================
async function processOrderPurchase({ userId, productId, quantity }) {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');

  const totalPrice = Number((product.price * quantity).toFixed(2));
  if (Number(user.balance) < totalPrice) {
    throw new Error(`Insufficient balance. Required: $${totalPrice.toFixed(2)}, Available: $${Number(user.balance).toFixed(2)}`);
  }

  const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (isSupabase()) {
    // 1. Get available mail items
    const { data: availableItems, error: stockErr } = await supabase
      .from('mail_items')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'available')
      .limit(quantity);

    if (stockErr) throw stockErr;
    if (!availableItems || availableItems.length < quantity) {
      throw new Error(`Only ${availableItems ? availableItems.length : 0} accounts available in stock.`);
    }

    // 2. Deduct user balance
    const newBal = Number((Number(user.balance) - totalPrice).toFixed(2));
    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBal })
      .eq('id', userId);
    if (balErr) throw balErr;

    // 3. Create order
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .insert([{
        order_code: orderCode,
        user_id: userId,
        product_id: productId,
        quantity,
        total_price: totalPrice
      }])
      .select()
      .single();
    if (ordErr) throw ordErr;

    // 4. Mark mail items as sold
    const itemIds = availableItems.map(i => i.id);
    const { error: upErr } = await supabase
      .from('mail_items')
      .update({ status: 'sold', order_id: order.id })
      .in('id', itemIds);
    if (upErr) throw upErr;

    return {
      orderCode,
      totalPrice,
      productName: product.name,
      items: availableItems
    };
  }

  // SQLite transaction
  const items = sqliteDb.prepare(`
    SELECT * FROM mail_items 
    WHERE product_id = ? AND status = 'available' 
    LIMIT ?
  `).all(productId, quantity);

  if (items.length < quantity) {
    throw new Error(`Only ${items.length} accounts available in stock.`);
  }

  const tx = sqliteDb.transaction(() => {
    sqliteDb.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(totalPrice, userId);

    const ordRes = sqliteDb.prepare(`
      INSERT INTO orders (order_code, user_id, product_id, quantity, total_price)
      VALUES (?, ?, ?, ?, ?)
    `).run(orderCode, userId, productId, quantity, totalPrice);

    const upd = sqliteDb.prepare(`UPDATE mail_items SET status = 'sold', order_id = ? WHERE id = ?`);
    for (const it of items) {
      upd.run(ordRes.lastInsertRowid, it.id);
    }
  });

  tx();

  return {
    orderCode,
    totalPrice,
    productName: product.name,
    items
  };
}

// Get user orders with items
async function getUserOrders(userId) {
  if (isSupabase()) {
    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        quantity,
        total_price,
        created_at,
        product_id,
        products ( name, imap_host )
      `)
      .eq('user_id', userId)
      .order('id', { ascending: false });
    if (oErr) throw oErr;

    // Get items for orders
    const orderIds = (orders || []).map(o => o.id);
    let items = [];
    if (orderIds.length > 0) {
      const { data: itemRows } = await supabase
        .from('mail_items')
        .select('*')
        .in('order_id', orderIds);
      items = itemRows || [];
    }

    return (orders || []).map(o => ({
      id: o.id,
      order_code: o.order_code,
      quantity: o.quantity,
      total_price: o.total_price,
      created_at: o.created_at,
      product_id: o.product_id,
      product_name: o.products?.name || 'Mail Account',
      imap_host: o.products?.imap_host || '',
      items: items.filter(it => it.order_id === o.id)
    }));
  }

  const orders = sqliteDb.prepare(`
    SELECT 
      o.id,
      o.order_code,
      o.quantity,
      o.total_price,
      o.created_at,
      p.id as product_id,
      p.name as product_name,
      p.imap_host
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.id DESC
  `).all(userId);

  const getItems = sqliteDb.prepare(`
    SELECT id, product_id, email, password, recovery_email, extra_info, created_at
    FROM mail_items
    WHERE order_id = ?
  `);

  return orders.map(ord => ({
    ...ord,
    items: getItems.all(ord.id)
  }));
}

// Get specific mail for OTP
async function getMailForOtp(mailId, userId, isAdmin = false) {
  if (isSupabase()) {
    const { data: mail, error } = await supabase
      .from('mail_items')
      .select(`
        *,
        products ( imap_host, imap_port, imap_tls ),
        orders ( user_id )
      `)
      .eq('id', mailId)
      .single();

    if (error || !mail) return null;
    if (!isAdmin && mail.orders?.user_id !== userId) return null;

    return {
      ...mail,
      imap_host: mail.products?.imap_host,
      imap_port: mail.products?.imap_port,
      imap_tls: mail.products?.imap_tls
    };
  }

  if (isAdmin) {
    return sqliteDb.prepare(`
      SELECT m.*, p.imap_host, p.imap_port, p.imap_tls
      FROM mail_items m
      JOIN products p ON m.product_id = p.id
      WHERE m.id = ?
    `).get(mailId) || null;
  }

  return sqliteDb.prepare(`
    SELECT m.*, p.imap_host, p.imap_port, p.imap_tls
    FROM mail_items m
    JOIN products p ON m.product_id = p.id
    JOIN orders o ON m.order_id = o.id
    WHERE m.id = ? AND o.user_id = ?
  `).get(mailId, userId) || null;
}

// ==========================================
// BULK STOCK IMPORT & ADMIN STATS
// ==========================================
async function insertBulkStock(productId, rawData) {
  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');

  const lines = rawData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const itemsToInsert = [];
  const errors = [];

  lines.forEach((line, index) => {
    let delimiter = '|';
    if (line.includes('|')) delimiter = '|';
    else if (line.includes('\t')) delimiter = '\t';
    else if (line.includes('----')) delimiter = '----';
    else if (line.includes(':') && line.split(':').length >= 2) delimiter = ':';

    const parts = line.split(delimiter).map(p => p.trim());
    const email = parts[0];
    const password = parts[1];
    const recovery = parts[2] || null;
    const extra = parts.slice(3).join(' | ') || null;

    if (!email || !password || !email.includes('@')) {
      errors.push(`Line ${index + 1}: Invalid email or password format.`);
      return;
    }

    itemsToInsert.push({
      product_id: productId,
      email,
      password,
      recovery_email: recovery,
      extra_info: extra,
      status: 'available'
    });
  });

  if (itemsToInsert.length === 0) {
    throw new Error('No valid accounts found to import.');
  }

  if (isSupabase()) {
    const { data, error } = await supabase.from('mail_items').insert(itemsToInsert);
    if (error) throw error;
    return { addedCount: itemsToInsert.length, errors: errors.slice(0, 10), productName: product.name };
  }

  const insertStmt = sqliteDb.prepare(`
    INSERT INTO mail_items (product_id, email, password, recovery_email, extra_info, status)
    VALUES (?, ?, ?, ?, ?, 'available')
  `);

  const tx = sqliteDb.transaction(() => {
    for (const it of itemsToInsert) {
      insertStmt.run(it.product_id, it.email, it.password, it.recovery_email, it.extra_info);
    }
  });
  tx();

  return { addedCount: itemsToInsert.length, errors: errors.slice(0, 10), productName: product.name };
}

async function getAdminStats() {
  if (isSupabase()) {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { data: revData } = await supabase.from('orders').select('total_price');
    const totalRevenue = (revData || []).reduce((acc, curr) => acc + Number(curr.total_price || 0), 0);

    const { count: availableStock } = await supabase.from('mail_items').select('*', { count: 'exact', head: true }).eq('status', 'available');
    const { count: soldStock } = await supabase.from('mail_items').select('*', { count: 'exact', head: true }).eq('status', 'sold');

    return {
      totalUsers: totalUsers || 0,
      totalOrders: totalOrders || 0,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      availableStock: availableStock || 0,
      soldStock: soldStock || 0
    };
  }

  const totalUsers = sqliteDb.prepare('SELECT count(*) as count FROM users').get().count;
  const totalOrders = sqliteDb.prepare('SELECT count(*) as count FROM orders').get().count;
  const totalRevenue = sqliteDb.prepare('SELECT SUM(total_price) as sum FROM orders').get()?.sum || 0;
  const availableStock = sqliteDb.prepare("SELECT count(*) as count FROM mail_items WHERE status = 'available'").get().count;
  const soldStock = sqliteDb.prepare("SELECT count(*) as count FROM mail_items WHERE status = 'sold'").get().count;

  return {
    totalUsers,
    totalOrders,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    availableStock,
    soldStock
  };
}

async function getStockList({ status, productId, limit = 100 }) {
  if (isSupabase()) {
    let query = supabase.from('mail_items').select('*, products(name)').order('id', { ascending: false }).limit(limit);
    if (status) query = query.eq('status', status);
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => ({ ...d, product_name: d.products?.name }));
  }

  let query = `
    SELECT m.*, p.name as product_name
    FROM mail_items m
    JOIN products p ON m.product_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }
  if (productId) {
    query += ' AND m.product_id = ?';
    params.push(productId);
  }
  query += ' ORDER BY m.id DESC LIMIT ?';
  params.push(limit);

  return sqliteDb.prepare(query).all(...params);
}

// Log OTP
async function logOtp({ mailId, userId, otpCode, sender, subject, fullMessage }) {
  if (isSupabase()) {
    await supabase.from('otp_logs').insert([{
      mail_id: mailId,
      user_id: userId,
      otp_code: otpCode,
      sender,
      subject,
      full_message: fullMessage
    }]);
    return;
  }

  sqliteDb.prepare(`
    INSERT INTO otp_logs (mail_id, user_id, otp_code, sender, subject, full_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(mailId, userId, otpCode, sender, subject, fullMessage);
}

// Auto seed default accounts and catalog into Supabase on first run
async function initSupabaseDefaults() {
  if (!isSupabase()) return;
  try {
    const adminUser = await getUserByUsername(config.admin.username);
    if (!adminUser) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(config.admin.password, salt);
      await createUser({
        username: config.admin.username,
        password_hash: hash,
        balance: 1000.0,
        role: 'admin'
      });
      console.log(`[Supabase] Created default admin: ${config.admin.username}`);
    }

    const demoUser = await getUserByUsername('demo_user');
    if (!demoUser) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('demo123', salt);
      await createUser({
        username: 'demo_user',
        password_hash: hash,
        balance: 50.0,
        role: 'user'
      });
      console.log(`[Supabase] Created demo user: demo_user`);
    }

    const { data: prods } = await supabase.from('products').select('id');
    if (!prods || prods.length === 0) {
      await supabase.from('products').insert([
        {
          name: 'Outlook / Hotmail Clean (IMAP Active)',
          description: 'High trust score, IMAP/POP3 enabled. Instant OTP retrieval supported.',
          price: 0.25,
          category: 'outlook',
          imap_host: 'outlook.office365.com',
          imap_port: 993,
          imap_tls: 1
        },
        {
          name: 'Gmail Account with App Password (IMAP)',
          description: 'Aged Gmail account with pre-configured 16-character App Password for instant OTP via IMAP.',
          price: 0.60,
          category: 'gmail',
          imap_host: 'imap.gmail.com',
          imap_port: 993,
          imap_tls: 1
        },
        {
          name: 'Rambler.ru Mail (Active IMAP)',
          description: 'Fast delivery, supports social media / game registration OTP.',
          price: 0.10,
          category: 'rambler',
          imap_host: 'imap.rambler.ru',
          imap_port: 993,
          imap_tls: 1
        }
      ]);
      console.log('[Supabase] Seeded standard mail products');
    }
  } catch (err) {
    console.error('Failed to initialize Supabase defaults:', err.message);
  }
}

if (isSupabase()) {
  initSupabaseDefaults();
}

module.exports = {
  isSupabase,
  initSupabaseDefaults,
  getUserById,
  getUserByUsername,
  getUserByTelegramId,
  createUser,
  updateUserBalance,
  getAllProductsWithStock,
  getProductById,
  createProduct,
  updateProduct,
  processOrderPurchase,
  getUserOrders,
  getMailForOtp,
  insertBulkStock,
  getAdminStats,
  getStockList,
  logOtp
};

