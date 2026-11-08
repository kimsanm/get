const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let supabase = null;

if (config.supabase.url && config.supabase.key) {
  supabase = createClient(config.supabase.url, config.supabase.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  console.log(`⚡ [Database] Supabase connected: ${config.supabase.url}`);
} else {
  console.log(`📁 [Database] Supabase credentials not provided. Using local SQLite database.`);
}

module.exports = supabase;

