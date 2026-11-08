# 🚀 How to Host on Render (render.com)

This project is configured to run on Render as a **single unified Web Service** that hosts both the **React Frontend** and the **Node.js Express API + Telegram Bot** simultaneously.

---

### Step 1: Push Code to GitHub

Initialize Git in your project folder and push to a new GitHub repository:

```bash
git init
git add .
git commit -m "Deploy to Render"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

### Step 2: Create a Web Service on Render

1. Log in to **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** ➔ **Web Service**.
3. Select **"Build and deploy from a Git repository"** and choose your repository.
4. Fill in the deployment details:
   - **Name**: `mailstore-otp-bot` (or your preferred name)
   - **Language**: `Node`
   - **Branch**: `main`
   - **Region**: Choose closest to you (e.g. `Singapore` or `Oregon`)
   - **Plan**: `Free`
   - **Build Command**:
     ```bash
     npm run render-build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```

---

### Step 3: Add Environment Variables on Render

In the **Environment Variables** section on Render, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `SUPABASE_URL` | `https://yrpeyzmqmjigknydxfsk.supabase.co` | Your Supabase project URL |
| `SUPABASE_KEY` | `your_service_role_secret_or_publishable_key` | Your Supabase API key |
| `TELEGRAM_BOT_TOKEN` | `your_bot_token` | Token from @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | `your_telegram_id` | (Optional) For new order notifications |
| `JWT_SECRET` | `generate_any_random_string_here` | Secret for user sessions |
| `ADMIN_USERNAME` | `admin` | Admin dashboard username |
| `ADMIN_PASSWORD` | `your_custom_admin_password` | Admin dashboard password |

---

### Step 4: Click "Deploy Web Service"

Render will automatically:
1. Run `npm run render-build` (install all backend & frontend dependencies and compile React with Vite into `frontend/dist`).
2. Run `npm start` (launch the Express server, initialize the database on Supabase, connect the Telegram bot, and serve the React website).
3. Provide you with a live HTTPS URL:
   👉 **`https://your-service-name.onrender.com`**

