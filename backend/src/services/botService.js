const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const repo = require('../db/repo');
const { fetchLatestOtp } = require('./imapService');

let bot = null;

function initBot() {
  if (!config.telegram.token || config.telegram.token === 'your_telegram_bot_token_here') {
    console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN is empty or not configured. Bot service running in standby mode.');
    return null;
  }

  try {
    bot = new Telegraf(config.telegram.token);

    // /start command
    bot.start(async (ctx) => {
      const from = ctx.from;
      const tgId = String(from.id);

      // Check if user exists or create automatically
      let user = await repo.getUserByTelegramId(tgId);
      if (!user) {
        const username = from.username || `tg_${from.id}`;
        const existing = await repo.getUserByUsername(username);
        const finalUsername = existing ? `${username}_${Date.now().toString().slice(-4)}` : username;
        
        user = await repo.createUser({
          username: finalUsername,
          password_hash: 'tg_autogen_hash',
          telegram_id: tgId,
          balance: 10.0,
          role: 'user'
        });
      }

      const welcomeMsg = 
`👋 *Welcome to MailStore & OTP Bot!*

✨ Buy high-quality Outlook, Gmail, and custom domain accounts instantly.
⚡ Direct IMAP OTP retrieval for any registered service.

👤 *User:* \`${user.username}\`
💰 *Balance:* \`$${Number(user.balance).toFixed(2)}\`
🆔 *Telegram ID:* \`${tgId}\`

Select an action below:`;

      await ctx.replyWithMarkdown(welcomeMsg, Markup.inlineKeyboard([
        [
          Markup.button.callback('🛒 View Stock & Prices', 'VIEW_STOCK'),
          Markup.button.callback('📦 My Mails', 'MY_MAILS')
        ],
        [
          Markup.button.callback('⚡ Get Latest OTP', 'GET_OTP_MENU'),
          Markup.button.callback('💳 Top Up Balance', 'TOPUP_INFO')
        ]
      ]));
    });

    // View Stock Action
    bot.action('VIEW_STOCK', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const products = await repo.getAllProductsWithStock();

        if (products.length === 0) {
          return ctx.reply('No products currently available.');
        }

        let text = '🛒 *Available Mail Accounts:*\n\n';
        const buttons = [];

        products.forEach(p => {
          text += `🔹 *ID ${p.id}:* ${p.name}\n` +
                  `   💵 Price: *$${Number(p.price).toFixed(2)}*\n` +
                  `   📦 In Stock: *${p.stock}* accounts\n` +
                  `   📝 ${p.description || ''}\n\n`;

          if (p.stock > 0) {
            buttons.push([Markup.button.callback(`Buy ${p.name} ($${p.price})`, `BUY_${p.id}`)]);
          }
        });

        buttons.push([Markup.button.callback('🔙 Back to Menu', 'BACK_TO_MENU')]);
        await ctx.replyWithMarkdown(text, Markup.inlineKeyboard(buttons));
      } catch (err) {
        console.error(err);
        ctx.reply('Error loading products.');
      }
    });

    // Buy Action
    bot.action(/^BUY_(\d+)$/, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const productId = parseInt(ctx.match[1]);
        const tgId = String(ctx.from.id);
        const user = await repo.getUserByTelegramId(tgId);

        if (!user) {
          return ctx.reply('Please send /start to initialize your account.');
        }

        const result = await repo.processOrderPurchase({
          userId: user.id,
          productId,
          quantity: 1
        });

        const item = result.items[0];
        const successMsg = 
`✅ *Purchase Successful!*

📦 *Order Code:* \`${result.orderCode}\`
📧 *Email:* \`${item.email}\`
🔑 *Password:* \`${item.password}\`
${item.recovery_email ? `🔄 *Recovery:* \`${item.recovery_email}\`\n` : ''}${item.extra_info ? `ℹ️ *Extra:* \`${item.extra_info}\`\n` : ''}
⚡ To retrieve OTP instantly, click the button below:`;

        await ctx.replyWithMarkdown(successMsg, Markup.inlineKeyboard([
          [Markup.button.callback('📩 Get OTP for this Mail', `GET_OTP_${item.id}`)],
          [Markup.button.callback('🔙 Back to Menu', 'BACK_TO_MENU')]
        ]));

        notifyAdminNewOrder({
          orderCode: result.orderCode,
          username: user.username,
          productName: result.productName,
          price: result.totalPrice,
          email: item.email
        });
      } catch (err) {
        console.error('Buy error:', err);
        ctx.reply(`❌ ${err.message || 'Error processing purchase.'}`);
      }
    });

    // My Mails
    bot.action('MY_MAILS', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const tgId = String(ctx.from.id);
        const user = await repo.getUserByTelegramId(tgId);
        if (!user) return ctx.reply('Please send /start first.');

        const orders = await repo.getUserOrders(user.id);
        const allMails = [];
        orders.forEach(o => {
          (o.items || []).forEach(m => {
            allMails.push({ ...m, order_code: o.order_code, product_name: o.product_name });
          });
        });

        if (allMails.length === 0) {
          return ctx.reply('You have not purchased any email accounts yet.', Markup.inlineKeyboard([
            [Markup.button.callback('🛒 Buy Now', 'VIEW_STOCK')]
          ]));
        }

        let text = '📦 *Your Purchased Accounts (Latest 10):*\n\n';
        const buttons = [];

        allMails.slice(0, 10).forEach((m, idx) => {
          text += `${idx + 1}. *${m.email}* (${m.product_name})\n` +
                  `   Pass: \`${m.password}\`\n` +
                  `   Order: \`${m.order_code}\`\n\n`;
          buttons.push([Markup.button.callback(`⚡ Get OTP: ${m.email}`, `GET_OTP_${m.id}`)]);
        });

        buttons.push([Markup.button.callback('🔙 Back to Menu', 'BACK_TO_MENU')]);
        await ctx.replyWithMarkdown(text, Markup.inlineKeyboard(buttons));
      } catch (err) {
        console.error(err);
        ctx.reply('Error fetching your accounts.');
      }
    });

    // Get OTP Handler
    bot.action(/^GET_OTP_(\d+)$/, async (ctx) => {
      try {
        await ctx.answerCbQuery('Connecting to mailbox via IMAP...');
        const mailId = parseInt(ctx.match[1]);
        const tgId = String(ctx.from.id);
        const user = await repo.getUserByTelegramId(tgId);

        if (!user) return ctx.reply('Please send /start first.');

        const mail = await repo.getMailForOtp(mailId, user.id, user.role === 'admin');
        if (!mail) {
          return ctx.reply('Email account not found or does not belong to you.');
        }

        await ctx.reply(`🔄 Checking mailbox for *${mail.email}* via IMAP... Please wait a few seconds.`, { parse_mode: 'Markdown' });

        const result = await fetchLatestOtp({
          email: mail.email,
          password: mail.password,
          imapHost: mail.imap_host,
          imapPort: mail.imap_port,
          imapTls: mail.imap_tls
        });

        if (!result.success) {
          return ctx.replyWithMarkdown(
            `❌ *IMAP Connection Failed*\n` +
            `Email: \`${mail.email}\`\n` +
            `Error: ${result.error}\n` +
            `_Note: Ensure the email password or app password is correct and IMAP is enabled._`,
            Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Retry', `GET_OTP_${mail.id}`)],
              [Markup.button.callback('🔙 Back to Menu', 'BACK_TO_MENU')]
            ])
          );
        }

        if (result.count === 0) {
          return ctx.replyWithMarkdown(
            `📭 *Inbox Empty*\nNo messages found for \`${mail.email}\` yet. Please trigger your OTP request and retry.`,
            Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Refresh / Check Again', `GET_OTP_${mail.id}`)]
            ])
          );
        }

        let response = `📬 *Mailbox Status for:* \`${mail.email}\`\n\n`;

        if (result.latestOtp) {
          response += `🔥 *DETECTED OTP:* \`${result.latestOtp}\`\n\n`;
          await repo.logOtp({
            mailId: mail.id,
            userId: user.id,
            otpCode: result.latestOtp,
            sender: result.messages[0]?.from || '',
            subject: result.messages[0]?.subject || '',
            fullMessage: result.messages[0]?.snippet || ''
          });
        }

        response += `*Recent Messages:* \n`;
        result.messages.slice(0, 3).forEach((msg, idx) => {
          response += `\n*#${idx + 1} From:* ${msg.from}\n` +
                      `*Subject:* ${msg.subject}\n` +
                      (msg.otp ? `*Code:* \`${msg.otp}\`\n` : '') +
                      `*Snippet:* _${msg.snippet.slice(0, 80)}..._\n`;
        });

        await ctx.replyWithMarkdown(response, Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Check Again', `GET_OTP_${mail.id}`)],
          [Markup.button.callback('📦 My Mails', 'MY_MAILS')]
        ]));
      } catch (err) {
        console.error('OTP check error:', err);
        ctx.reply('Error fetching OTP.');
      }
    });

    // Top up info
    bot.action('TOPUP_INFO', async (ctx) => {
      await ctx.answerCbQuery();
      const tgId = String(ctx.from.id);
      const user = await repo.getUserByTelegramId(tgId);
      
      const msg = 
`💳 *Top Up Account Balance*

Current Balance: *$${Number(user ? user.balance : 0).toFixed(2)}*
User Account: \`${user ? user.username : 'N/A'}\`

To add funds via Crypto (USDT TRC20/BEP20) or Banking:
1. Contact Support / Admin: @YourAdminUsername
2. Or use the Web Store Dashboard at your store link!`;

      await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'BACK_TO_MENU')]
      ]));
    });

    // Back to menu
    bot.action('BACK_TO_MENU', async (ctx) => {
      await ctx.answerCbQuery();
      const tgId = String(ctx.from.id);
      const user = await repo.getUserByTelegramId(tgId);
      const welcomeMsg = 
`👤 *User:* \`${user ? user.username : ctx.from.username}\`
💰 *Balance:* \`$${Number(user ? user.balance : 0).toFixed(2)}\`

Choose an option below:`;

      await ctx.editMessageText(welcomeMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('🛒 View Stock & Prices', 'VIEW_STOCK'),
              Markup.button.callback('📦 My Mails', 'MY_MAILS')
            ],
            [
              Markup.button.callback('⚡ Get Latest OTP', 'GET_OTP_MENU'),
              Markup.button.callback('💳 Top Up Balance', 'TOPUP_INFO')
            ]
          ]
        }
      });
    });

    bot.action('GET_OTP_MENU', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.callbackQuery.data = 'MY_MAILS';
      bot.handleUpdate(ctx.update);
    });

    bot.launch(() => {
      console.log('🤖 [Telegram Bot] Connected and polling successfully!');
    });

    process.once('SIGINT', () => bot && bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));

  } catch (err) {
    console.error('Failed to initialize Telegram Bot:', err.message);
  }

  return bot;
}

function notifyAdminNewOrder(details) {
  if (!bot || !config.telegram.adminChatId) return;
  try {
    const text = 
`🚨 *New Mail Order Received!*
📦 Order: \`${details.orderCode}\`
👤 Customer: \`${details.username}\`
🛒 Product: ${details.productName}
💵 Amount: $${details.price}
📧 Account: \`${details.email}\``;

    bot.telegram.sendMessage(config.telegram.adminChatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Failed to send admin notification:', err.message);
  }
}

module.exports = {
  initBot,
  notifyAdminNewOrder
};
