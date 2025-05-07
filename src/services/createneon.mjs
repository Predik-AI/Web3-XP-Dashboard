// src/lib/db/setup-predik-db.js
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Create database schema and initial data
async function setupPredikDatabase() {
  // Ensure database URL is defined
  if (!process.env.NEON_DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('Error: Neither NEON_DATABASE_URL nor POSTGRES_URL is defined in environment variables');
    process.exit(1);
  }

  // Use either NeonTech URL or Vercel Postgres URL
  const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;
  
  // Create database pool with SSL enabled for NeonTech
  const pool = new Pool({
    connectionString,
    ssl: true
  });

  // Connect to the database
  const client = await pool.connect();
  
  try {
    // Begin transaction for atomicity
    await client.query('BEGIN');
    console.log('Starting PREDIK database setup...');

    // 1. Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        username VARCHAR(50) NOT NULL,
        bio TEXT,
        occupation VARCHAR(100),
        quote TEXT,
        preferred_assets JSONB,
        trading_type VARCHAR(20),
        email VARCHAR(100),
        email_verified BOOLEAN DEFAULT FALSE,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created');

    // Create index on wallet address
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)
    `);
    console.log('✅ Wallet address index created');

    // 2. Create tasks table
    console.log('Creating tasks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        xp INTEGER NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        requires_verification BOOLEAN DEFAULT FALSE,
        is_repeatable BOOLEAN DEFAULT FALSE,
        repeat_cooldown_hours INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tasks table created');

    // 3. Create user_task_completions table
    console.log('Creating user task completions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_task_completions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verification_data JSONB,
        UNIQUE(user_id, task_id)
      )
    `);
    console.log('✅ User task completions table created');

    // 4. Create user_task_history table for repeatable tasks
    console.log('Creating user task history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_task_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        xp_earned INTEGER NOT NULL
      )
    `);
    console.log('✅ User task history table created');

    // 5. Create transactions table
    console.log('Creating transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        transaction_hash VARCHAR(66) UNIQUE,
        amount DECIMAL(20, 10),
        token_symbol VARCHAR(10),
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('✅ Transactions table created');

    // 6. Create staking table
    console.log('Creating staking table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS staking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
        amount DECIMAL(20, 10) NOT NULL,
        token_symbol VARCHAR(10) NOT NULL,
        apr DECIMAL(5, 2),
        lock_period_days INTEGER,
        start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_date TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ Staking table created');

    // 7. Create referrals table
    console.log('Creating referrals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        referral_code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ Referrals table created');

    // 8. Create referral_claims table
    console.log('Creating referral claims table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_claims (
        id SERIAL PRIMARY KEY,
        referral_id INTEGER REFERENCES referrals(id) ON DELETE CASCADE,
        referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        xp_awarded_referrer INTEGER,
        xp_awarded_referred INTEGER,
        claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Referral claims table created');

    // 9. Create social_connections table
    console.log('Creating social connections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(20) NOT NULL,
        platform_user_id VARCHAR(100) NOT NULL,
        username VARCHAR(100),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(user_id, platform)
      )
    `);
    console.log('✅ Social connections table created');

    // 10. Create email_verification_tokens table
    console.log('Creating email verification tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        is_used BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ Email verification tokens table created');

    // 11. Create predictions table
    console.log('Creating predictions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        prediction_type VARCHAR(50) NOT NULL,
        asset_symbol VARCHAR(20) NOT NULL,
        prediction_value DECIMAL(20, 10),
        prediction_direction VARCHAR(10),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolution_timestamp TIMESTAMP WITH TIME ZONE,
        outcome VARCHAR(20),
        points_earned INTEGER
      )
    `);
    console.log('✅ Predictions table created');

    // 12. Create xp_transactions table
    console.log('Creating XP transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        source VARCHAR(50) NOT NULL,
        source_id INTEGER,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ XP transactions table created');

    // 13. Create achievements table
    console.log('Creating achievements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        category VARCHAR(50),
        xp_reward INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Achievements table created');

    // 14. Create user_achievements table
    console.log('Creating user achievements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )
    `);
    console.log('✅ User achievements table created');

    // Drop existing views if they exist
    console.log('Dropping existing leaderboard views if they exist...');
    try {
      await client.query('DROP VIEW IF EXISTS leaderboard_daily');
      await client.query('DROP VIEW IF EXISTS leaderboard_weekly');
      await client.query('DROP VIEW IF EXISTS leaderboard_alltime');
    } catch (error) {
      console.log('Note: No existing views to drop');
    }

    // 15. Create leaderboard views
    console.log('Creating leaderboard views...');
    await client.query(`
      CREATE VIEW leaderboard_daily AS
      SELECT 
          u.id,
          u.wallet_address,
          u.username,
          u.level,
          u.xp,
          COUNT(p.id) AS predictions_count,
          SUM(CASE WHEN p.outcome = 'correct' THEN 1 ELSE 0 END) AS correct_predictions,
          ROW_NUMBER() OVER (ORDER BY u.xp DESC) AS rank
      FROM 
          users u
      LEFT JOIN 
          predictions p ON u.id = p.user_id 
          AND p.timestamp > NOW() - INTERVAL '1 day'
      GROUP BY 
          u.id, u.wallet_address, u.username, u.level, u.xp
    `);
    console.log('✅ Daily leaderboard view created');

    await client.query(`
      CREATE VIEW leaderboard_weekly AS
      SELECT 
          u.id,
          u.wallet_address,
          u.username,
          u.level,
          u.xp,
          COUNT(p.id) AS predictions_count,
          SUM(CASE WHEN p.outcome = 'correct' THEN 1 ELSE 0 END) AS correct_predictions,
          ROW_NUMBER() OVER (ORDER BY u.xp DESC) AS rank
      FROM 
          users u
      LEFT JOIN 
          predictions p ON u.id = p.user_id 
          AND p.timestamp > NOW() - INTERVAL '7 days'
      GROUP BY 
          u.id, u.wallet_address, u.username, u.level, u.xp
    `);
    console.log('✅ Weekly leaderboard view created');

    await client.query(`
      CREATE VIEW leaderboard_alltime AS
      SELECT 
          u.id,
          u.wallet_address,
          u.username,
          u.level,
          u.xp,
          COUNT(p.id) AS predictions_count,
          SUM(CASE WHEN p.outcome = 'correct' THEN 1 ELSE 0 END) AS correct_predictions,
          ROW_NUMBER() OVER (ORDER BY u.xp DESC) AS rank
      FROM 
          users u
      LEFT JOIN 
          predictions p ON u.id = p.user_id
      GROUP BY 
          u.id, u.wallet_address, u.username, u.level, u.xp
    `);
    console.log('✅ All-time leaderboard view created');

    // Check if initial tasks exist
    console.log('Checking for existing tasks...');
    const taskCheck = await client.query('SELECT COUNT(*) FROM tasks');
    
    // Insert initial tasks if none exist
    if (parseInt(taskCheck.rows[0].count) === 0) {
      console.log('Inserting initial tasks...');
      await client.query(`
        INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification) VALUES
        ('Complete your profile', 'Add personal information and profile picture', 50, 'Easy', 'profile', false),
        ('Connect with Polygon network', 'Change your network to Polygon mainnet', 75, 'Medium', 'network', true),
        ('Stake 10 MATIC', 'Stake MATIC tokens in the PREDIK platform', 150, 'Hard', 'staking', true),
        ('Refer a friend', 'Invite a friend to join PREDIK', 100, 'Medium', 'referral', true),
        ('Complete daily prediction', 'Make a prediction for today', 25, 'Easy', 'prediction', true),
        ('Link email', 'Verify your email address', 30, 'Easy', 'email', true),
        ('Connect Twitter', 'Link your Twitter/X account', 40, 'Easy', 'social', true)
      `);
      console.log('✅ Initial tasks inserted');
    } else {
      console.log('✅ Tasks already exist, skipping insertion');
    }

    // Check if initial achievements exist
    console.log('Checking for existing achievements...');
    const achievementCheck = await client.query('SELECT COUNT(*) FROM achievements');
    
    // Insert initial achievements if none exist
    if (parseInt(achievementCheck.rows[0].count) === 0) {
      console.log('Inserting initial achievements...');
      await client.query(`
        INSERT INTO achievements (title, description, icon_url, category, xp_reward) VALUES
        ('First Steps', 'Complete your first prediction', '/icons/achievements/first_steps.svg', 'Beginner', 50),
        ('Social Butterfly', 'Connect all available social platforms', '/icons/achievements/social.svg', 'Connection', 100),
        ('Diamond Hands', 'Stake tokens for 30 consecutive days', '/icons/achievements/diamond.svg', 'Staking', 200),
        ('Prediction Streak', 'Complete predictions for 7 consecutive days', '/icons/achievements/streak.svg', 'Prediction', 150),
        ('Crypto Evangelist', 'Refer 5 friends who join the platform', '/icons/achievements/evangelist.svg', 'Referral', 250)
      `);
      console.log('✅ Initial achievements inserted');
    } else {
      console.log('✅ Achievements already exist, skipping insertion');
    }

    // Commit all changes
    await client.query('COMMIT');
    console.log('✅ All database setup operations completed successfully');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error occurred during database setup:', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Run the script if executed directly
if (require.main === module) {
  console.log('Starting PREDIK database setup...');
  setupPredikDatabase()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { setupPredikDatabase };
}