// src/app/api/transactions/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET all transactions (with filters)
export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('walletAddress');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query based on filters
    let query = `
      SELECT 
        t.id, 
        t.transaction_type, 
        t.transaction_hash, 
        t.amount, 
        t.token_symbol, 
        t.status, 
        t.created_at, 
        t.completed_at,
        u.username,
        u.wallet_address
      FROM 
        transactions t
      JOIN 
        users u ON t.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (walletAddress) {
      query += ` AND u.wallet_address = $${paramIndex++}`;
      queryParams.push(walletAddress);
    }
    
    if (type) {
      query += ` AND t.transaction_type = $${paramIndex++}`;
      queryParams.push(type);
    }
    
    // Add sorting and pagination
    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    // Execute query
    const result = await sql.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    
    if (walletAddress) {
      countQuery += ` AND u.wallet_address = $1`;
    }
    
    if (type) {
      countQuery += ` AND t.transaction_type = $${walletAddress ? 2 : 1}`;
    }
    
    const countParams = [];
    if (walletAddress) countParams.push(walletAddress);
    if (type) countParams.push(type);
    
    const countResult = await sql.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    return NextResponse.json({
      transactions: result.rows,
      pagination: {
        total: totalCount,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST create a new transaction
export async function POST(request) {
  try {
    const transactionData = await request.json();
    const { walletAddress, transactionType, transactionHash, amount, tokenSymbol, status = 'pending' } = transactionData;
    
    // Validate required fields
    if (!walletAddress || !transactionType) {
      return NextResponse.json({ 
        error: 'Wallet address and transaction type are required' 
      }, { status: 400 });
    }
    
    // Start transaction
    await sql`BEGIN`;
    
    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userResult.rows.length === 0) {
      await sql`ROLLBACK`;
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult.rows[0].id;
    
    // Check if transaction hash already exists (to prevent duplicates)
    if (transactionHash) {
      const txCheck = await sql`
        SELECT id FROM transactions WHERE transaction_hash = ${transactionHash}
      `;
      
      if (txCheck.rows.length > 0) {
        await sql`ROLLBACK`;
        return NextResponse.json({ 
          error: 'Transaction with this hash already exists',
          transactionId: txCheck.rows[0].id
        }, { status: 409 });
      }
    }
    
    // Create new transaction
    const result = await sql`
      INSERT INTO transactions (
        user_id,
        transaction_type,
        transaction_hash,
        amount,
        token_symbol,
        status,
        created_at
      ) VALUES (
        ${userId},
        ${transactionType},
        ${transactionHash || null},
        ${amount ? parseFloat(amount) : null},
        ${tokenSymbol || null},
        ${status},
        NOW()
      )
      RETURNING *
    `;
    
    // Handle transaction type specific actions
    if (transactionType === 'stake' && amount) {
      // Create staking record
      await sql`
        INSERT INTO staking (
          user_id,
          transaction_id,
          amount,
          token_symbol,
          apr,
          lock_period_days,
          start_date,
          is_active
        ) VALUES (
          ${userId},
          ${result.rows[0].id},
          ${parseFloat(amount)},
          ${tokenSymbol || 'MATIC'},
          ${transactionData.apr || 12.5},
          ${transactionData.lockPeriodDays || 30},
          NOW(),
          ${true}
        )
      `;
    }
    
    // Commit transaction
    await sql`COMMIT`;
    
    return NextResponse.json({
      ...result.rows[0],
      walletAddress
    }, { status: 201 });
  } catch (error) {
    // Rollback transaction on error
    await sql`ROLLBACK`;
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// PUT update transaction status
export async function PUT(request) {
  try {
    const { transactionHash, status, completedAt } = await request.json();
    
    if (!transactionHash || !status) {
      return NextResponse.json({ 
        error: 'Transaction hash and status are required' 
      }, { status: 400 });
    }
    
    // Update transaction
    const result = await sql`
      UPDATE transactions
      SET 
        status = ${status},
        completed_at = ${completedAt ? new Date(completedAt) : status === 'completed' ? new Date() : null},
        updated_at = NOW()
      WHERE 
        transaction_hash = ${transactionHash}
      RETURNING *
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // If transaction is a stake and it's completed, update staking record
    if (result.rows[0].transaction_type === 'stake' && status === 'completed') {
      await sql`
        UPDATE staking
        SET is_active = ${true}
        WHERE transaction_id = ${result.rows[0].id}
      `;
    }
    
    // If transaction is being canceled/reverted, update related records
    if (status === 'canceled' || status === 'reverted') {
      if (result.rows[0].transaction_type === 'stake') {
        await sql`
          UPDATE staking
          SET is_active = ${false}
          WHERE transaction_id = ${result.rows[0].id}
        `;
      }
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

// Specific endpoint for staking
export async function stake(walletAddress, amount, transactionHash = null, options = {}) {
  try {
    // Start transaction
    await sql`BEGIN`;
    
    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userResult.rows.length === 0) {
      await sql`ROLLBACK`;
      throw new Error('User not found');
    }
    
    const userId = userResult.rows[0].id;
    
    // Create transaction record
    const transactionResult = await sql`
      INSERT INTO transactions (
        user_id,
        transaction_type,
        transaction_hash,
        amount,
        token_symbol,
        status,
        created_at
      ) VALUES (
        ${userId},
        'stake',
        ${transactionHash},
        ${parseFloat(amount)},
        ${options.tokenSymbol || 'MATIC'},
        ${options.status || 'pending'},
        NOW()
      )
      RETURNING *
    `;
    
    const transactionId = transactionResult.rows[0].id;
    
    // Create staking record
    await sql`
      INSERT INTO staking (
        user_id,
        transaction_id,
        amount,
        token_symbol,
        apr,
        lock_period_days,
        start_date,
        is_active
      ) VALUES (
        ${userId},
        ${transactionId},
        ${parseFloat(amount)},
        ${options.tokenSymbol || 'MATIC'},
        ${options.apr || 12.5},
        ${options.lockPeriodDays || 30},
        NOW(),
        ${true}
      )
      RETURNING *
    `;
    
    // Commit transaction
    await sql`COMMIT`;
    
    return { success: true, transactionId };
  } catch (error) {
    // Rollback transaction on error
    await sql`ROLLBACK`;
    throw error;
  }
}