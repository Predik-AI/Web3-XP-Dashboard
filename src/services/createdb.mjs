// scripts/createPredikDb.mjs
import * as dotenv from 'dotenv';
import { sql } from "@vercel/postgres";

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createPredikDatabase() {
  try {
    console.log('Creating PREDIK database schema...');

    // Users table - stores all user profiles
    await sql`
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
    `;
    console.log('✅ Users table created');

    // Create index on wallet address for fast lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)`;
    console.log('✅ Wallet address index created');

    // Tasks table - defines all available tasks
    await sql`
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
    `;
    console.log('✅ Tasks table created');

    // User task completions - tracks which users completed which tasks
    await sql`
      CREATE TABLE IF NOT EXISTS user_task_completions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verification_data JSONB,
        UNIQUE(user_id, task_id)
      )
    `;
    console.log('✅ User task completions table created');

    // For repeatable tasks, we need to track each instance
    await sql`
      CREATE TABLE IF NOT EXISTS user_task_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        xp_earned INTEGER NOT NULL
      )
    `;
    console.log('✅ User task history table created');

    // Transactions table - stores all blockchain transaction records
    await sql`
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
    `;
    console.log('✅ Transactions table created');

    // Staking records - tracks staking activity
    await sql`
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
    `;
    console.log('✅ Staking table created');

    // Referrals table - tracks referral links and usage
    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        referral_code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    console.log('✅ Referrals table created');

    // Referral claims - tracks when someone uses a referral link
    await sql`
      CREATE TABLE IF NOT EXISTS referral_claims (
        id SERIAL PRIMARY KEY,
        referral_id INTEGER REFERENCES referrals(id) ON DELETE CASCADE,
        referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        xp_awarded_referrer INTEGER,
        xp_awarded_referred INTEGER,
        claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Referral claims table created');

    // Social media connections - stores linked social accounts
    await sql`
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
    `;
    console.log('✅ Social connections table created');

    // Email verification tokens - for email verification process
    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        is_used BOOLEAN DEFAULT FALSE
      )
    `;
    console.log('✅ Email verification tokens table created');

    // Daily predictions - tracks prediction activity
    await sql`
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
    `;
    console.log('✅ Predictions table created');

    // XP transactions - detailed history of XP earnings
    await sql`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        source VARCHAR(50) NOT NULL,
        source_id INTEGER,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ XP transactions table created');

    // Achievements table - defines all achievements users can earn
    await sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        category VARCHAR(50),
        xp_reward INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Achievements table created');

    // User achievements - tracks which users earned which achievements
    await sql`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )
    `;
    console.log('✅ User achievements table created');

    // Drop views if they exist (to recreate them)
    try {
      await sql`DROP VIEW IF EXISTS leaderboard_daily`;
      await sql`DROP VIEW IF EXISTS leaderboard_weekly`;
      await sql`DROP VIEW IF EXISTS leaderboard_alltime`;
      console.log('✅ Dropped existing leaderboard views');
    } catch (error) {
      console.log('Note: Could not drop views, they may not exist yet');
    }

    // Leaderboard view for quick access to daily rankings
    await sql`
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
    `;
    console.log('✅ Daily leaderboard view created');

    // Leaderboard view for weekly rankings
    await sql`
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
    `;
    console.log('✅ Weekly leaderboard view created');

    // Leaderboard view for all-time rankings
    await sql`
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
    `;
    console.log('✅ All-time leaderboard view created');

    // Insert initial task data
    await sql`
      INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
      VALUES 
        ('Complete your profile', 'Add personal information and profile picture', 50, 'Easy', 'profile', false),
        ('Connect with Polygon network', 'Change your network to Polygon mainnet', 75, 'Medium', 'network', true),
        ('Stake 10 MATIC', 'Stake MATIC tokens in the PREDIK platform', 150, 'Hard', 'staking', true),
        ('Refer a friend', 'Invite a friend to join PREDIK', 100, 'Medium', 'referral', true),
        ('Complete daily prediction', 'Make a prediction for today', 25, 'Easy', 'prediction', true),
        ('Link email', 'Verify your email address', 30, 'Easy', 'email', true),
        ('Connect Twitter', 'Link your Twitter/X account', 40, 'Easy', 'social', true)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Initial tasks added');

    // Insert initial achievement data
    await sql`
      INSERT INTO achievements (title, description, icon_url, category, xp_reward)
      VALUES 
        ('First Steps', 'Complete your first prediction', '/icons/achievements/first_steps.svg', 'Beginner', 50),
        ('Social Butterfly', 'Connect all available social platforms', '/icons/achievements/social.svg', 'Connection', 100),
        ('Diamond Hands', 'Stake tokens for 30 consecutive days', '/icons/achievements/diamond.svg', 'Staking', 200),
        ('Prediction Streak', 'Complete predictions for 7 consecutive days', '/icons/achievements/streak.svg', 'Prediction', 150),
        ('Crypto Evangelist', 'Refer 5 friends who join the platform', '/icons/achievements/evangelist.svg', 'Referral', 250)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Initial achievements added');

    console.log('✅ All database setup completed successfully!');
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
  } finally {
    process.exit(0);
  }
}

// Run the database creation function
createPredikDatabase();