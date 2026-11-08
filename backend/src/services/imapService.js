const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const config = require('../config');

// Helper to determine host and port from email domain
function resolveImapSettings(email, customHost, customPort, customTls) {
  if (customHost) {
    return {
      host: customHost,
      port: customPort || 993,
      tls: customTls !== undefined ? !!customTls : true
    };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && config.imapDefaults[domain]) {
    return config.imapDefaults[domain];
  }

  // Fallback heuristic
  if (domain && (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live'))) {
    return { host: 'outlook.office365.com', port: 993, tls: true };
  }
  if (domain && domain.includes('gmail')) {
    return { host: 'imap.gmail.com', port: 993, tls: true };
  }
  if (domain && domain.includes('yahoo')) {
    return { host: 'imap.mail.yahoo.com', port: 993, tls: true };
  }

  return { host: `imap.${domain}`, port: 993, tls: true };
}

// Extract OTP regex logic
function extractOtp(text, subject = '') {
  const combined = `${subject}\n${text}`;
  
  // Specific contextual patterns (high confidence)
  const contextPatterns = [
    /(?:verification\s*code|security\s*code|confirmation\s*code|login\s*code|one-time\s*password|otp|code\s*is|mã\s*xác\s*nhận|mã\s*otp)[^\d\w\r\n]{1,10}([0-9A-Za-z]{4,8})\b/i,
    /\b([0-9]{4,8})\b(?=.*(?:verify|code|otp|confirm|password|token|login|sign\s*in))/i,
    /(?:your code is|enter code)\s*[:=\s]\s*([0-9]{4,8})/i,
    /<strong>([0-9]{4,8})<\/strong>/i,
    /<b(?:>|\s[^>]*>)([0-9]{4,8})<\/b>/i
  ];

  for (const regex of contextPatterns) {
    const match = combined.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: look for 6-digit number, 5-digit, or 4-digit number
  const genericNumeric = text.match(/\b([0-9]{6})\b/) || text.match(/\b([0-9]{4,8})\b/);
  if (genericNumeric && genericNumeric[1]) {
    return genericNumeric[1].trim();
  }

  return null;
}

/**
 * Fetch latest messages and extract OTP for an email account
 */
async function fetchLatestOtp(account) {
  const { email, password, imapHost, imapPort, imapTls } = account;
  const connectionConfig = resolveImapSettings(email, imapHost, imapPort, imapTls);

  const imapConfig = {
    imap: {
      user: email,
      password: password,
      host: connectionConfig.host,
      port: connectionConfig.port,
      tls: connectionConfig.tls,
      tlsOptions: { rejectUnauthorized: false }, // allow self-signed certificates in some private domains
      authTimeout: 10000,
      connTimeout: 15000
    }
  };

  let connection;
  try {
    connection = await imaps.connect(imapConfig);
    await connection.openBox('INBOX');

    // Fetch the 5 most recent messages
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
      struct: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (!messages || messages.length === 0) {
      return { success: true, count: 0, otps: [], message: 'Inbox is empty.' };
    }

    // Sort newest first
    messages.sort((a, b) => {
      const dateA = new Date(a.attributes?.date || 0);
      const dateB = new Date(b.attributes?.date || 0);
      return dateB - dateA;
    });

    const recent = messages.slice(0, 5);
    const parsedResults = [];

    for (const item of recent) {
      const allParts = item.parts;
      const fullBodyPart = allParts.find(part => part.which === '') || allParts.find(part => part.which === 'TEXT');
      const headerPart = allParts.find(part => part.which === 'HEADER');

      const subject = headerPart?.body?.subject?.[0] || '(No Subject)';
      const from = headerPart?.body?.from?.[0] || '(Unknown Sender)';
      const date = item.attributes?.date || new Date().toISOString();

      let bodyText = '';
      if (fullBodyPart && fullBodyPart.body) {
        try {
          const parsed = await simpleParser(fullBodyPart.body);
          bodyText = parsed.text || parsed.html || '';
        } catch {
          bodyText = typeof fullBodyPart.body === 'string' ? fullBodyPart.body : JSON.stringify(fullBodyPart.body);
        }
      }

      const detectedOtp = extractOtp(bodyText, subject);

      parsedResults.push({
        from,
        subject,
        date,
        otp: detectedOtp,
        snippet: bodyText ? bodyText.replace(/\s+/g, ' ').substring(0, 160) : ''
      });
    }

    return {
      success: true,
      count: parsedResults.length,
      latestOtp: parsedResults.find(r => r.otp)?.otp || null,
      messages: parsedResults
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'IMAP connection error',
      details: 'Check if mail credentials, IMAP server settings, or app passwords are valid.'
    };
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // ignore disconnect errors
      }
    }
  }
}

module.exports = {
  fetchLatestOtp,
  extractOtp,
  resolveImapSettings
};

