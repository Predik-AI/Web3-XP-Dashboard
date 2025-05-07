// src/app/api/users/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET all users (with pagination)
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  try {
    const { rows } = await sql`
      SELECT id, wallet_address, username, level, xp, 
             created_at, email_verified, trading_type
      FROM users
      ORDER BY xp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST create new user
export async function POST(request) {
  try {
    const userData = await request.json();
    const { walletAddress, username } = userData;
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // First check if user already exists
    const existingUserCheck = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (existingUserCheck.rows.length > 0) {
      return NextResponse.json({ 
        error: 'User already exists',
        userId: existingUserCheck.rows[0].id 
      }, { status: 409 });
    }
    
    // Create new user with default settings
    const { rows } = await sql`
      INSERT INTO users (
        wallet_address, 
        username, 
        xp, 
        level, 
        preferred_assets,
        trading_type
      ) VALUES (
        ${walletAddress}, 
        ${username || `PREDIK_${walletAddress.substring(2, 6)}`}, 
        0, 
        1, 
        '["MATIC", "ETH", "BTC"]',
        'Spot'
      )
      RETURNING *
    `;
    
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// Helper method to search users by username or wallet address
export async function searchUsers(query, limit = 10) {
  try {
    const { rows } = await sql`
      SELECT id, wallet_address, username, level, xp
      FROM users
      WHERE 
        LOWER(username) LIKE LOWER(${'%' + query + '%'})
        OR LOWER(wallet_address) LIKE LOWER(${'%' + query + '%'})
      ORDER BY xp DESC
      LIMIT ${limit}
    `;
    
    return rows;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

// SEARCH endpoint for user discovery
export async function SEARCH(request) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10');
  
  if (query.length < 3) {
    return NextResponse.json({ error: 'Search query must be at least 3 characters' }, { status: 400 });
  }
  
  try {
    const results = await searchUsers(query, limit);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}