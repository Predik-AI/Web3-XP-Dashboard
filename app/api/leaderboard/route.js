// src/app/api/leaderboard/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET leaderboard data
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get('timeframe') || 'daily';
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  try {
    let query;
    let viewName;
    
    // Select appropriate view based on timeframe
    if (timeframe === 'weekly') {
      viewName = 'leaderboard_weekly';
    } else if (timeframe === 'alltime') {
      viewName = 'leaderboard_alltime';
    } else {
      // Default to daily
      viewName = 'leaderboard_daily';
    }
    
    // Get total count for pagination
    const countResult = await sql.query(`SELECT COUNT(*) FROM ${viewName}`);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get leaderboard data with pagination
    query = `
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
      ORDER BY rank ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await sql.query(query, [limit, offset]);
    
    // Format response data
    const leaderboard = result.rows.map(row => ({
      rank: row.rank,
      user: row.username,
      walletAddress: row.wallet_address,
      level: row.level,
      xp: row.xp,
      predictions: row.predictions_count || 0,
      correctPredictions: row.correct_predictions || 0,
      isYou: false // This will be set on the frontend
    }));
    
    // Return formatted leaderboard with pagination metadata
    return NextResponse.json({
      leaderboard,
      pagination: {
        total: totalCount,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        pages: Math.ceil(totalCount / limit)
      },
      timeframe
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

// POST search leaderboard
export async function POST(request) {
  try {
    const { query, timeframe = 'daily' } = await request.json();
    
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' }, 
        { status: 400 }
      );
    }
    
    let viewName;
    
    // Select appropriate view based on timeframe
    if (timeframe === 'weekly') {
      viewName = 'leaderboard_weekly';
    } else if (timeframe === 'alltime') {
      viewName = 'leaderboard_alltime';
    } else {
      // Default to daily
      viewName = 'leaderboard_daily';
    }
    
    // Search users in the leaderboard
    const searchQuery = `
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
      WHERE 
        LOWER(username) LIKE LOWER($1)
        OR wallet_address LIKE $2
      ORDER BY rank ASC
      LIMIT 10
    `;
    
    const result = await sql.query(
      searchQuery, 
      [`%${query}%`, `%${query}%`]
    );
    
    // Format and return search results
    const searchResults = result.rows.map(row => ({
      rank: row.rank,
      user: row.username,
      walletAddress: row.wallet_address,
      level: row.level,
      xp: row.xp,
      predictions: row.predictions_count || 0,
      correctPredictions: row.correct_predictions || 0
    }));
    
    return NextResponse.json({
      results: searchResults,
      count: searchResults.length,
      timeframe
    });
  } catch (error) {
    console.error('Error searching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to search leaderboard' }, { status: 500 });
  }
}

// GET leaderboard statistics
export async function getLeaderboardStats() {
  try {
    // Get high-level stats across all timeframes
    const statsQuery = `
      SELECT
        'daily' as timeframe,
        COUNT(*) as user_count,
        MAX(xp) as highest_xp,
        AVG(xp) as average_xp
      FROM leaderboard_daily
      UNION ALL
      SELECT
        'weekly' as timeframe,
        COUNT(*) as user_count,
        MAX(xp) as highest_xp,
        AVG(xp) as average_xp
      FROM leaderboard_weekly
      UNION ALL
      SELECT
        'alltime' as timeframe,
        COUNT(*) as user_count,
        MAX(xp) as highest_xp,
        AVG(xp) as average_xp
      FROM leaderboard_alltime
    `;
    
    const statsResult = await sql.query(statsQuery);
    
    // Get top gainers (users who gained the most XP in the last 24 hours)
    const gainersQuery = `
      SELECT
        u.username,
        u.wallet_address,
        SUM(xt.amount) as xp_gained
      FROM
        xp_transactions xt
      JOIN
        users u ON xt.user_id = u.id
      WHERE
        xt.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY
        u.id, u.username, u.wallet_address
      ORDER BY
        xp_gained DESC
      LIMIT 5
    `;
    
    const gainersResult = await sql.query(gainersQuery);
    
    return {
      statistics: statsResult.rows,
      topGainers: gainersResult.rows
    };
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    throw error;
  }
}