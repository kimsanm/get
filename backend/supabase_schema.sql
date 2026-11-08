-- =========================================================================
-- Supabase Schema for MailStore & Telegram OTP Bot
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  telegram_id TEXT,
  balance NUMERIC(10, 2) DEFAULT 0.00,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT DEFAULT 'general',
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  imap_tls INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Mail Items (Stock Inventory)
CREATE TABLE IF NOT EXISTS public.mail_items (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  recovery_email TEXT,
  extra_info TEXT,
  status TEXT DEFAULT 'available', -- 'available' or 'sold'
  order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. OTP Logs
CREATE TABLE IF NOT EXISTS public.otp_logs (
  id BIGSERIAL PRIMARY KEY,
  mail_id BIGINT NOT NULL REFERENCES public.mail_items(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  otp_code TEXT,
  sender TEXT,
  subject TEXT,
  full_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_mail_items_product_status ON public.mail_items(product_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_items_order_id ON public.mail_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_logs_mail_id ON public.otp_logs(mail_id);

-- Disable Row Level Security (RLS) so both backend API, Publishable key, and Service Role have full access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_logs DISABLE ROW LEVEL SECURITY;

-- Insert Default Products if not exists
INSERT INTO public.products (name, description, price, category, imap_host, imap_port, imap_tls)
SELECT 'Outlook / Hotmail Clean (IMAP Active)', 'High trust score, IMAP/POP3 enabled. Instant OTP retrieval supported.', 0.25, 'outlook', 'outlook.office365.com', 993, 1
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE category = 'outlook');

INSERT INTO public.products (name, description, price, category, imap_host, imap_port, imap_tls)
SELECT 'Gmail Account with App Password (IMAP)', 'Aged Gmail account with pre-configured 16-character App Password for instant OTP via IMAP.', 0.60, 'gmail', 'imap.gmail.com', 993, 1
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE category = 'gmail');

INSERT INTO public.products (name, description, price, category, imap_host, imap_port, imap_tls)
SELECT 'Rambler.ru Mail (Active IMAP)', 'Fast delivery, supports social media / game registration OTP.', 0.10, 'rambler', 'imap.rambler.ru', 993, 1
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE category = 'rambler');

