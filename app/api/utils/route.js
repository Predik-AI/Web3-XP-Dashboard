// src/app/api/utils/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET route for utility functions
 * Can be used to get system status, generate tokens, etc.
 */
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'status':
        return getSystemStatus();
      case 'generateToken':
        return generateToken(searchParams.get('length') || 32);
      case 'statistics':
        return getSystemStatistics();
      default:
        return NextResponse.json({ 
          error: 'Unknown action. Available actions: status, generateToken, statistics' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Utility API error:', error);
    return NextResponse.json({ error: 'Failed to process utility request' }, { status: 500 });
  }
}

/**
 * POST route for utility functions
 * Handles more complex utility tasks that require a request body
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'validateAddress':
        return validateWalletAddress(body.address);
      case 'calculateRewards':
        return calculateRewards(body.walletAddress, body.amount, body.type);
      case 'hashData':
        return hashData(body.data, body.algorithm || 'sha256');
      default:
        return NextResponse.json({ 
          error: 'Unknown action. Available actions: validateAddress, calculateRewards, hashData' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Utility API error:', error);
    return NextResponse.json({ error: 'Failed to process utility request' }, { status: 500 });
  }
}

// Function to get system status
async function getSystemStatus() {
  try {
    // Check database connection
    const dbResult = await sql`SELECT NOW() as time`;
    const dbTime = dbResult.rows[0].time;
    
    // Get app version from package.json or environment variable
    const version = process.env.APP_VERSION || '1.0.0';
    
    // Check other services if needed
    // const web3Connected = await checkWeb3Connection();
    
    return NextResponse.json({
      status: 'healthy',
      version,
      database: {
        connected: true,
        time: dbTime
      },
      // web3: {
      //   connected: web3Connected
      // },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Function to generate secure tokens
function generateToken(length = 32) {
  const token = crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
  
  return NextResponse.json({
    token,
    length: token.length,
    generated: new Date().toISOString()
  });
}

// Function to get system statistics
async function getSystemStatistics() {
  try {
    // Get user count
    const userCountResult = await sql`SELECT COUNT(*) as count FROM users`;
    const userCount = parseInt(userCountResult.rows[0].count);
    
    // Get total XP
    const xpResult = await sql`SELECT SUM(xp) as total_xp FROM users`;
    const totalXp = parseInt(xpResult.rows[0].total_xp || 0);
    
    // Get task completion stats
    const taskCompletionResult = await sql`
      SELECT 
        COUNT(*) as total_completions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT task_id) as unique_tasks
      FROM user_task_completions
    `;
    const taskCompletions = taskCompletionResult.rows[0];
    
    // Get transaction stats
    const transactionResult = await sql`
      SELECT 
        transaction_type, 
        COUNT(*) as count, 
        SUM(amount) as total_amount
      FROM transactions
      GROUP BY transaction_type
    `;
    
    return NextResponse.json({
      users: {
        total: userCount,
        totalXp
      },
      tasks: {
        totalCompletions: parseInt(taskCompletions.total_completions),
        uniqueUsers: parseInt(taskCompletions.unique_users),
        uniqueTasks: parseInt(taskCompletions.unique_tasks),
      },
      transactions: transactionResult.rows.map(row => ({
        type: row.transaction_type,
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount || 0)
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch system statistics' }, { status: 500 });
  }
}

// Function to validate wallet address
function validateWalletAddress(address) {
  if (!address) {
    return NextResponse.json({ 
      error: 'Address is required' 
    }, { status: 400 });
  }
  
  // Simple Ethereum address validation
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
  
  return NextResponse.json({
    address,
    isValid,
    type: isValid ? 'ethereum' : 'unknown'
  });
}

// Function to calculate rewards
async function calculateRewards(walletAddress, amount, type = 'staking') {
  try {
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Get user details
    const userResult = await sql`
      SELECT id, level, xp FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = userResult.rows[0];
    const userLevel = user.level || 1;
    
    // Base reward rates
    const baseRates = {
      staking: 0.125, // 12.5% APR
      prediction: 1.0, // 1:1 reward
      referral: 100 // 100 XP per referral
    };
    
    // Level multipliers (higher levels get more rewards)
    const levelMultiplier = 1 + (userLevel * 0.01); // 1% increase per level
    
    let reward = 0;
    let details = {};
    
    switch (type) {
      case 'staking':
        const stakingAmount = parseFloat(amount) || 0;
        const stakingRate = baseRates.staking * levelMultiplier;
        // Calculate daily rewards
        reward = (stakingAmount * stakingRate) / 365;
        details = {
          apr: stakingRate * 100, // as percentage
          dailyReward: reward,
          monthlyReward: reward * 30,
          yearlyReward: stakingAmount * stakingRate,
          levelBonus: `+${(levelMultiplier - 1) * 100}%`
        };
        break;
        
      case 'prediction':
        const predictionAmount = parseFloat(amount) || 0;
        const predictionRate = baseRates.prediction * levelMultiplier;
        reward = predictionAmount * predictionRate;
        details = {
          rate: predictionRate,
          levelBonus: `+${(levelMultiplier - 1) * 100}%`
        };
        break;
        
      case 'referral':
        const referralRate = baseRates.referral * levelMultiplier;
        reward = referralRate;
        details = {
          xpPerReferral: reward,
          levelBonus: `+${(levelMultiplier - 1) * 100}%`
        };
        break;
        
      default:
        return NextResponse.json({ 
          error: 'Unknown reward type. Available types: staking, prediction, referral' 
        }, { status: 400 });
    }
    
    return NextResponse.json({
      walletAddress,
      type,
      userLevel,
      reward,
      details
    });
  } catch (error) {
    console.error('Error calculating rewards:', error);
    return NextResponse.json({ error: 'Failed to calculate rewards' }, { status: 500 });
  }
}

// Function to hash data
function hashData(data, algorithm = 'sha256') {
  if (!data) {
    return NextResponse.json({ error: 'Data is required' }, { status: 400 });
  }
  
  try {
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Create hash using specified algorithm
    const hash = crypto.createHash(algorithm).update(dataString).digest('hex');
    
    return NextResponse.json({
      originalData: data,
      algorithm,
      hash,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error hashing data:', error);
    return NextResponse.json({ 
      error: 'Failed to hash data. Make sure the algorithm is supported.' 
    }, { status: 500 });
  }
}