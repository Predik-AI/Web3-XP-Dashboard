// src/app/api/users/[walletAddress]/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET user by wallet address
export async function GET(request, { params }) {
  const { walletAddress } = params;
  
  try {
    // Query the user data
    const { rows } = await sql`
      SELECT * FROM users 
      WHERE wallet_address = ${walletAddress}
    `;
    
    // Return 404 if user not found
    if (rows.length === 0) {
      return NextResponse.json(null, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT update user profile
export async function PUT(request, { params }) {
  const { walletAddress } = params;
  const userData = await request.json();
  
  try {
    // Validate required fields
    if (!userData.username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    // Sanitize and prepare the data
    const sanitizedData = {
      username: userData.username,
      bio: userData.bio || null,
      occupation: userData.occupation || null,
      quote: userData.quote || null,
      preferred_assets: userData.preferredAssets || [],
      trading_type: userData.tradingType || 'Spot'
    };
    
    // Update the user
    const { rows } = await sql`
      UPDATE users
      SET 
        username = ${sanitizedData.username},
        bio = ${sanitizedData.bio},
        occupation = ${sanitizedData.occupation},
        quote = ${sanitizedData.quote},
        preferred_assets = ${JSON.stringify(sanitizedData.preferred_assets)},
        trading_type = ${sanitizedData.trading_type},
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `;
    
    // Check if user was updated
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// PATCH update specific user fields
export async function PATCH(request, { params }) {
  const { walletAddress } = params;
  const updates = await request.json();
  
  try {
    // Get current user data
    const userData = await sql`
      SELECT * FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userData.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Build the SET clause dynamically based on provided fields
    let setClauses = [];
    const values = [];
    let index = 1;
    
    // Only update fields that are provided
    if (updates.username !== undefined) {
      setClauses.push(`username = $${index++}`);
      values.push(updates.username);
    }
    
    if (updates.bio !== undefined) {
      setClauses.push(`bio = $${index++}`);
      values.push(updates.bio);
    }
    
    if (updates.occupation !== undefined) {
      setClauses.push(`occupation = $${index++}`);
      values.push(updates.occupation);
    }
    
    if (updates.quote !== undefined) {
      setClauses.push(`quote = $${index++}`);
      values.push(updates.quote);
    }
    
    if (updates.preferredAssets !== undefined) {
      setClauses.push(`preferred_assets = $${index++}`);
      values.push(JSON.stringify(updates.preferredAssets));
    }
    
    if (updates.tradingType !== undefined) {
      setClauses.push(`trading_type = $${index++}`);
      values.push(updates.tradingType);
    }
    
    if (updates.email !== undefined) {
      setClauses.push(`email = $${index++}`);
      values.push(updates.email);
    }
    
    if (updates.emailVerified !== undefined) {
      setClauses.push(`email_verified = $${index++}`);
      values.push(updates.emailVerified);
    }
    
    if (updates.xp !== undefined) {
      setClauses.push(`xp = $${index++}`);
      values.push(updates.xp);
    }
    
    if (updates.level !== undefined) {
      setClauses.push(`level = $${index++}`);
      values.push(updates.level);
    }
    
    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);
    
    // If no fields to update, return the current user data
    if (setClauses.length === 1) {
      return NextResponse.json(userData.rows[0]);
    }
    
    // Build and execute the update query
    const setClause = setClauses.join(', ');
    values.push(walletAddress); // Add the wallet address for the WHERE clause
    
    const query = `
      UPDATE users 
      SET ${setClause} 
      WHERE wallet_address = $${index} 
      RETURNING *
    `;
    
    const result = await sql.query(query, values);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error patching user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE user (with confirmation required)
export async function DELETE(request, { params }) {
  const { walletAddress } = params;
  const searchParams = request.nextUrl.searchParams;
  const confirmed = searchParams.get('confirmed') === 'true';
  
  if (!confirmed) {
    return NextResponse.json(
      { error: 'Confirmation required. Add ?confirmed=true to confirm deletion' }, 
      { status: 400 }
    );
  }
  
  try {
    // Begin transaction
    await sql`BEGIN`;
    
    // First check if user exists
    const userCheck = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userCheck.rows.length === 0) {
      await sql`ROLLBACK`;
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userCheck.rows[0].id;
    
    // Delete user data from all related tables
    // This should be handled by ON DELETE CASCADE constraints
    // but we'll do it explicitly to be safe
    await sql`DELETE FROM user_task_completions WHERE user_id = ${userId}`;
    await sql`DELETE FROM user_task_history WHERE user_id = ${userId}`;
    await sql`DELETE FROM social_connections WHERE user_id = ${userId}`;
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;
    await sql`DELETE FROM xp_transactions WHERE user_id = ${userId}`;
    await sql`DELETE FROM user_achievements WHERE user_id = ${userId}`;
    
    // Finally delete the user
    await sql`DELETE FROM users WHERE id = ${userId}`;
    
    // Commit transaction
    await sql`COMMIT`;
    
    return NextResponse.json(
      { message: `User ${walletAddress} has been deleted` },
      { status: 200 }
    );
  } catch (error) {
    // Rollback on error
    await sql`ROLLBACK`;
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}