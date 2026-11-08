# 🚀 MailStore & Telegram Bot OTP Retrieval System

A complete full-stack platform built with **React.js**, **Node.js (Express + Telegraf)**, **SQLite**, and **IMAP** to sell email accounts (Outlook, Hotmail, Gmail, Rambler, Custom Domains) and retrieve OTP / verification codes automatically in real-time.

---

## ✨ Features

- 🛒 **React Storefront**:
  - Live stock counter and pricing per account.
  - Category filters (Outlook, Gmail, Rambler, Custom Domains).
  - Bulk purchasing & balance deduction.
  - Instant account delivery with copy-to-clipboard modal.
- ⚡ **Real-Time IMAP OTP Engine**:
  - Connects directly to mailbox via IMAP/TLS without logging into webmail.
  - Smart contextual regex detection for 4-8 digit OTP verification codes.
  - Displays sender, subject, timestamp, snippet, and instant copy button.
- 🤖 **Telegram Bot**:
  - Synchronized with web store inventory and user balance.
  - Interactive inline keyboard menus (`/start`).
  - View stock, buy accounts, and retrieve OTP directly in Telegram chat.
  - Instant admin order notifications for every purchase.
- 🛠️ **Admin Dashboard**:
  - Real-time KPI statistics (Total Revenue, Orders, Stock, Users).
  - **Bulk Stock Uploader**: Paste hundreds of accounts in 1 click (`email|password|recovery|extra`).
  - Inventory manager with filters (Available vs Sold).
  - Custom product manager with IMAP host/port configuration.
  - Manual user balance credit / top-up tool.

---

## 🏗️ Architecture

```
Employees/
├── backend/
│   ├── src/
│   │   ├── config.js               # Environment config & default IMAP hosts
│   │   ├── db/database.js          # SQLite database schema & seeds
│   │   ├── services/
│   │   │   ├── imapService.js      # IMAP mail reader & OTP regex parser
│   │   │   └── botService.js       # Telegram Bot (Telegraf) handlers
│   │   ├── routes/
│   │   │   ├── auth.js             # User & Admin JWT auth
│   │   │   ├── products.js         # Products & purchase endpoints
│   │   │   ├── orders.js           # Order history & user accounts
│   │   │   ├── otp.js              # Live IMAP OTP retrieval endpoint
│   │   │   └── admin.js            # Stock bulk upload & statistics
│   │   └── index.js                # Express server & static React server
│   └── .env                        # Port, Telegram Token, Admin secrets
├── frontend/
│   ├── src/
│   │   ├── components/Navbar.jsx   # Header with live balance badge
│   │   ├── pages/StorePage.jsx     # Browse & buy email accounts
│   │   ├── pages/MyOrdersPage.jsx  # Accounts list & Live OTP Reader
│   │   ├── pages/AdminDashboard.jsx# Stock uploader, stats, topup
│   │   ├── pages/LoginPage.jsx     # Login with 1-click demo logins
│   │   └── pages/RegisterPage.jsx  # New user registration
│   └── vite.config.js
└── package.json
```

---

## ⚡ Quick Start

### 1. Configure Database & Telegram Bot
Edit `backend/.env`:
```env
PORT=5005

# ⚡ Supabase Database Configuration (https://supabase.com)
# Obtain from your Supabase Dashboard: Project Settings -> API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_supabase_service_role_or_anon_key

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_ADMIN_CHAT_ID=your_telegram_id
JWT_SECRET=super_secret_jwt_key_mail_otp_2026
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> **Supabase Setup (1-Minute Guide)**:
> 1. Go to [https://supabase.com](https://supabase.com) and create a free project.
> 2. Open **SQL Editor** in your Supabase dashboard.
> 3. Copy the entire contents of [`backend/supabase_schema.sql`](file:///c:/Users/MMO/Music/Employees/backend/supabase_schema.sql) and paste it into the SQL Editor, then click **Run**.
> 4. Go to **Project Settings -> API**, copy your **Project URL** (`SUPABASE_URL`) and **service_role secret key** (`SUPABASE_KEY`), and paste them into `backend/.env`.
> 5. If `SUPABASE_URL` is empty, the system automatically runs on local **SQLite** without any extra setup!

### 2. Start the Full-Stack Application
To run the production-ready server (Backend API + React frontend on port 5005):
```bash
npm start
```
Then open your browser at:
👉 **http://localhost:5005**

For development with hot reload:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

---

## 🔑 Default Accounts (Pre-configured)

| Role | Username | Password | Starting Balance | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `$1,000.00` | Full Admin Dashboard, Bulk Upload, Stock Management |
| **Customer Demo** | `demo_user` | `demo123` | `$50.00` | Buy Accounts, Get OTP |

---

## 📦 Bulk Upload Format

In the **Admin Panel -> Bulk Upload Stock**, select your product and paste lines in standard seller formats:

```text
email@domain.com|password
email@domain.com|password|recovery_email
email@domain.com|password|recovery_email|extra_note_or_app_password
```
*(Also supports colon `:` or tab separation)*

---

## 📧 IMAP Configuration Guidelines

1. **Outlook / Hotmail / Live**:
   - Host: `outlook.office365.com`
   - Port: `993`
   - TLS/SSL: `true`
   - *Ensure POP/IMAP is enabled in Microsoft account settings.*
2. **Gmail**:
   - Host: `imap.gmail.com`
   - Port: `993`
   - Password: Use a **16-character Google App Password** (Generated in Google Account Security -> App Passwords).
3. **Rambler.ru**:
   - Host: `imap.rambler.ru`
   - Port: `993`
   - Password: Email password with IMAP enabled in Rambler settings.
4. **Custom Domain**:
   - Host: `mail.yourdomain.com` or `imap.yourdomain.com`
   - Port: `993` (SSL)

