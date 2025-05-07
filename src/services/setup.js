// setup-neontech-schema.js
// Script to add the PREDIK schema to an existing NeonTech database

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration - using the existing environment variables
const config = {
  connectionString: process.env.REACT_APP_API_BASE_URL,
  ssl: {
    rejectUnauthorized: false // May be needed depending on Neon's SSL configuration
  }
};

// Read the SQL schema from file or create it if it doesn't exist
const schemaPath = path.join(__dirname, 'schema.sql');

const predikSchema = `-- NeonTech DB Schema for PREDIK platform
-- Creates all necessary tables to store user data, tasks, transactions, etc.

-- Users table - stores all user profiles
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
);

-- Create index on wallet address for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Tasks table - defines all available tasks
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
);

-- User task completions - tracks which users completed which tasks
CREATE TABLE IF NOT EXISTS user_task_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_data JSONB,
    UNIQUE(user_id, task_id)
);

-- For repeatable tasks, we need to track each instance
CREATE TABLE IF NOT EXISTS user_task_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    xp_earned INTEGER NOT NULL
);

-- Transactions table - stores all blockchain transaction records
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
);

-- Staking records - tracks staking activity
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
);

-- Referrals table - tracks referral links and usage
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Referral claims - tracks when someone uses a referral link
CREATE TABLE IF NOT EXISTS referral_claims (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER REFERENCES referrals(id) ON DELETE CASCADE,
    referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    xp_awarded_referrer INTEGER,
    xp_awarded_referred INTEGER,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media connections - stores linked social accounts
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
);

-- Email verification tokens - for email verification process
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE
);

-- Daily predictions - tracks prediction activity
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
);

-- XP transactions - detailed history of XP earnings
CREATE TABLE IF NOT EXISTS xp_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table - defines all achievements users can earn
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    category VARCHAR(50),
    xp_reward INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements - tracks which users earned which achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Drop views if they exist to recreate them
DROP VIEW IF EXISTS leaderboard_daily;
DROP VIEW IF EXISTS leaderboard_weekly;
DROP VIEW IF EXISTS leaderboard_alltime;

-- Leaderboard view for quick access to rankings
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
    u.id, u.wallet_address, u.username, u.level, u.xp;

-- Leaderboard view for weekly rankings
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
    u.id, u.wallet_address, u.username, u.level, u.xp;

-- Leaderboard view for all-time rankings
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
    u.id, u.wallet_address, u.username, u.level, u.xp;

-- Create initial tasks data if they don't exist
INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Complete your profile', 'Add personal information and profile picture', 50, 'Easy', 'profile', false
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Complete your profile');

INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Connect with Polygon network', 'Change your network to Polygon mainnet', 75, 'Medium', 'network', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Connect with Polygon network');

INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Stake 10 MATIC', 'Stake MATIC tokens in the PREDIK platform', 150, 'Hard', 'staking', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Stake 10 MATIC');

INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Refer a friend', 'Invite a friend to join PREDIK', 100, 'Medium', 'referral', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Refer a friend');

INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Complete daily prediction', 'Make a prediction for today', 25, 'Easy', 'prediction', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Complete daily prediction');

INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Link email', 'Verify your email address', 30, 'Easy', 'email', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Link email');

INSERT INTO tasks (title, description, xp, difficulty, task_type, requires_verification)
SELECT 'Connect Twitter', 'Link your Twitter/X account', 40, 'Easy', 'social', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Connect Twitter');

-- Create initial achievements if they don't exist
INSERT INTO achievements (title, description, icon_url, category, xp_reward)
SELECT 'First Steps', 'Complete your first prediction', '/icons/achievements/first_steps.svg', 'Beginner', 50
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE title = 'First Steps');

INSERT INTO achievements (title, description, icon_url, category, xp_reward)
SELECT 'Social Butterfly', 'Connect all available social platforms', '/icons/achievements/social.svg', 'Connection', 100
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE title = 'Social Butterfly');

INSERT INTO achievements (title, description, icon_url, category, xp_reward)
SELECT 'Diamond Hands', 'Stake tokens for 30 consecutive days', '/icons/achievements/diamond.svg', 'Staking', 200
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE title = 'Diamond Hands');

INSERT INTO achievements (title, description, icon_url, category, xp_reward)
SELECT 'Prediction Streak', 'Complete predictions for 7 consecutive days', '/icons/achievements/streak.svg', 'Prediction', 150
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE title = 'Prediction Streak');

INSERT INTO achievements (title, description, icon_url, category, xp_reward)
SELECT 'Crypto Evangelist', 'Refer 5 friends who join the platform', '/icons/achievements/evangelist.svg', 'Referral', 250
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE title = 'Crypto Evangelist');`;

// Write schema to file
fs.writeFileSync(schemaPath, predikSchema);
console.log('Schema file created at', schemaPath);

// Split the schema into separate commands
function splitSqlCommands(sqlScript) {
  // Basic SQL command splitting - works for most cases but might need adjustments
  // for complex SQL with semicolons in strings, functions, etc.
  const commands = [];
  let currentCommand = '';
  let inComment = false;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < sqlScript.length; i++) {
    const char = sqlScript[i];
    const nextChar = sqlScript[i + 1] || '';
    
    // Handle comment blocks
    if (!inString && char === '-' && nextChar === '-') {
      inComment = true;
      currentCommand += char;
      continue;
    }
    
    // End of line resets comment state
    if (inComment && (char === '\n' || char === '\r')) {
      inComment = false;
      currentCommand += char;
      continue;
    }
    
    // Skip processing while in a comment
    if (inComment) {
      currentCommand += char;
      continue;
    }
    
    // Handle string literals
    if (char === "'" && !escapeNext) {
      inString = !inString;
    }
    
    // Handle escape characters
    if (char === '\\') {
      escapeNext = true;
    } else {
      escapeNext = false;
    }
    
    // Command separator
    if (char === ';' && !inString) {
      currentCommand += char;
      commands.push(currentCommand.trim());
      currentCommand = '';
      continue;
    }
    
    currentCommand += char;
  }
  
  // Add the last command if it doesn't end with a semicolon
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }
  
  return commands.filter(cmd => cmd.trim());
}

// Main function to set up the schema in the existing database
async function setupSchema() {
  console.log('Connecting to existing NeonTech database...');
  const pool = new Pool(config);
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful.');
    
    // Split the schema into separate commands
    const commands = splitSqlCommands(predikSchema);
    console.log(`Found ${commands.length} SQL commands to execute.`);
    
    // Execute each command in sequence
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandPreview = command.length > 50 
        ? command.substring(0, 50) + '...' 
        : command;
      
      console.log(`Executing command ${i + 1}/${commands.length}: ${commandPreview}`);
      
      try {
        await pool.query(command);
        console.log(`Command ${i + 1} executed successfully.`);
      } catch (error) {
        console.error(`Error executing command ${i + 1}:`, error.message);
        
        // Log the problematic SQL
        console.error('Failed SQL:', command);
        
        // Ask whether to continue
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise((resolve) => {
          readline.question('Continue with the next command? (y/n): ', resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'y') {
          console.log('Aborting setup.');
          break;
        }
      }
    }
    
    console.log('Schema setup completed.');
  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    // Close connection pool
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the setup
setupSchema().catch(err => {
  console.error('Failed to set up schema:', err);
  process.exit(1);
});