// src/app/api/leaderboard/rank/[walletAddress]/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET user's rank on leaderboard
export async function GET(request, { params }) {
  const { walletAddress } = params;
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get('timeframe') || 'daily';
  
  try {
    // Determine which view to query based on timeframe
    let viewName;
    
    if (timeframe === 'weekly') {
      viewName = 'leaderboard_weekly';
    } else if (timeframe === 'alltime') {
      viewName = 'leaderboard_alltime';
    } else {
      // Default to daily
      viewName = 'leaderboard_daily';
    }
    
    // Check if user exists in leaderboard
    const query = `
      SELECT 
        id,
        wallet_address,
        username,
        level,
        xp,
        predictions_count,
        correct_predictions,
        rank
      FROM ${viewName}
      WHERE wallet_address = $1
    `;
    
    const result = await sql.query(query, [walletAddress]);
    
    // If user not found in leaderboard
    if (result.rowCount === 0) {
      // Check if user exists in the users table first
      const userCheck = await sql`
        SELECT id, username, level, xp FROM users 
        WHERE wallet_address = ${walletAddress}
      `;
      
      if (userCheck.rows.length === 0) {
        return NextResponse.json({ 
          error: 'User not found',
          exists: false
        }, { status: 404 });
      }
      
      // User exists but doesn't have a rank yet
      return NextResponse.json({
        exists: true,
        ranked: false,
        username: userCheck.rows[0].username,
        level: userCheck.rows[0].level,
        xp: userCheck.rows[0].xp,
        predictions: 0,
        correctPredictions: 0,
        message: 'User not yet ranked on leaderboard',
        timeframe,
        walletAddress
      });
    }
    
    const userData = result.rows[0];
    
    // Get surrounding ranks (2 above and 2 below)
    const surroundingQuery = `
      (
        SELECT 
          id, wallet_address, username, level, xp, 
          predictions_count, correct_predictions, rank
        FROM ${viewName}
        WHERE rank < $1
        ORDER BY rank DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 
          id, wallet_address, username, level, xp, 
          predictions_count, correct_predictions, rank
        FROM ${viewName}
        WHERE wallet_address = $2
      )
      UNION ALL
      (
        SELECT 
          id, wallet_address, username, level, xp, 
          predictions_count, correct_predictions, rank
        FROM ${viewName}
        WHERE rank > $1
        ORDER BY rank ASC
        LIMIT 2
      )
      ORDER BY rank ASC
    `;
    
    const surroundingResult = await sql.query(
      surroundingQuery, 
      [userData.rank, walletAddress]
    );
    
    // Get total users count on this leaderboard
    const countQuery = `SELECT COUNT(*) FROM ${viewName}`;
    const countResult = await sql.query(countQuery);
    const totalUsers = parseInt(countResult.rows[0].count);
    
    return NextResponse.json({
      exists: true,
      ranked: true,
      rank: userData.rank,
      username: userData.username,
      level: userData.level,
      xp: userData.xp,
      predictions: userData.predictions_count || 0,
      correctPredictions: userData.correct_predictions || 0,
      walletAddress: userData.wallet_address,
      timeframe,
      percentile: Math.round((totalUsers - userData.rank) / totalUsers * 100),
      surroundingUsers: surroundingResult.rows.map(row => ({
        rank: row.rank,
        username: row.username,
        level: row.level,
        xp: row.xp,
        predictions: row.predictions_count || 0,
        correctPredictions: row.correct_predictions || 0,
        walletAddress: row.wallet_address,
        isYou: row.wallet_address === walletAddress
      })),
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return NextResponse.json({ error: 'Failed to fetch user rank' }, { status: 500 });
  }
}

// Helper function to determine if a user is eligible to receive rewards
// based on their position in the leaderboard
export async function determineRewardTier(walletAddress, timeframe = 'weekly') {
  try {
    let viewName;
    
    if (timeframe === 'weekly') {
      viewName = 'leaderboard_weekly';
    } else if (timeframe === 'daily') {
      viewName = 'leaderboard_daily';
    } else {
      // Default to all-time for other values
      viewName = 'leaderboard_alltime';
    }
    
    // Get user's rank
    const query = `
      SELECT 
        rank,
        wallet_address
      FROM ${viewName}
      WHERE wallet_address = $1
    `;
    
    const result = await sql.query(query, [walletAddress]);
    
    if (result.rows.length === 0) {
      return {
        eligible: false,
        tier: 'none',
        reason: 'User not ranked on leaderboard'
      };
    }
    
    const { rank } = result.rows[0];
    
    // Get total user count for percentile calculation
    const countQuery = `SELECT COUNT(*) FROM ${viewName}`;
    const countResult = await sql.query(countQuery);
    const totalUsers = parseInt(countResult.rows[0].count);
    
    // Determine reward tier based on rank
    let tier = 'none';
    let eligible = false;
    let reward = 0;
    
    if (rank === 1) {
      tier = 'gold';
      eligible = true;
      reward = 1000; // Example reward values
    } else if (rank <= 3) {
      tier = 'silver';
      eligible = true;
      reward = 500;
    } else if (rank <= 10) {
      tier = 'bronze';
      eligible = true;
      reward = 200;
    } else if (rank <= Math.ceil(totalUsers * 0.1)) { // Top 10%
      tier = 'top10percent';
      eligible = true;
      reward = 100;
    } else if (rank <= Math.ceil(totalUsers * 0.25)) { // Top 25%
      tier = 'top25percent';
      eligible = true;
      reward = 50;
    }
    
    return {
      eligible,
      tier,
      rank,
      totalUsers,
      percentile: Math.round((totalUsers - rank) / totalUsers * 100),
      reward,
      timeframe
    };
  } catch (error) {
    console.error('Error determining reward tier:', error);
    throw error;
  }
}