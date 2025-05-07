// src/app/api/users/[walletAddress]/tasks/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET tasks for a specific user with completion status
export async function GET(request, { params }) {
  const { walletAddress } = params;
  
  try {
    // First check if user exists and get their ID
    const userResult = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult.rows[0].id;
    
    // Get all tasks with completion status for this user
    const { rows } = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.xp,
        t.difficulty,
        t.task_type,
        t.requires_verification,
        t.is_repeatable,
        t.repeat_cooldown_hours,
        CASE WHEN utc.id IS NOT NULL THEN true ELSE false END AS completed,
        utc.completed_at
      FROM 
        tasks t
      LEFT JOIN 
        user_task_completions utc 
        ON t.id = utc.task_id AND utc.user_id = ${userId}
      ORDER BY 
        t.id ASC
    `;
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST complete a specific task for this user
export async function POST(request, { params }) {
  const { walletAddress } = params;
  const body = await request.json();
  const { taskId, verificationData } = body;
  
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }
  
  try {
    // Begin transaction
    await sql`BEGIN`;
    
    // Get user ID
    const userResult = await sql`
      SELECT id, xp, level FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userResult.rows.length === 0) {
      await sql`ROLLBACK`;
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult.rows[0].id;
    const currentXp = userResult.rows[0].xp;
    const currentLevel = userResult.rows[0].level;
    
    // Get task info
    const taskResult = await sql`
      SELECT id, xp, title, is_repeatable, requires_verification 
      FROM tasks WHERE id = ${taskId}
    `;
    
    if (taskResult.rows.length === 0) {
      await sql`ROLLBACK`;
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const task = taskResult.rows[0];
    const taskXp = task.xp;
    
    // Check if task requires verification data
    if (task.requires_verification && !verificationData) {
      await sql`ROLLBACK`;
      return NextResponse.json({ 
        error: 'This task requires verification data' 
      }, { status: 400 });
    }
    
    // Check if task already completed (for non-repeatable tasks)
    if (!task.is_repeatable) {
      const completionCheck = await sql`
        SELECT id FROM user_task_completions 
        WHERE user_id = ${userId} AND task_id = ${taskId}
      `;
      
      if (completionCheck.rows.length > 0) {
        await sql`ROLLBACK`;
        return NextResponse.json({ 
          message: 'Task already completed',
          xpEarned: 0,
          newTotalXp: currentXp,
          level: currentLevel
        });
      }
    } else {
      // For repeatable tasks, check cooldown period
      const cooldownCheck = await sql`
        SELECT completed_at FROM user_task_completions 
        WHERE user_id = ${userId} AND task_id = ${taskId}
        ORDER BY completed_at DESC LIMIT 1
      `;
      
      if (cooldownCheck.rows.length > 0) {
        // If there's a cooldown period defined, check if it has passed
        if (task.repeat_cooldown_hours) {
          const lastCompletion = new Date(cooldownCheck.rows[0].completed_at);
          const cooldownHours = task.repeat_cooldown_hours;
          const cooldownMs = cooldownHours * 60 * 60 * 1000;
          const now = new Date();
          
          if (now - lastCompletion < cooldownMs) {
            const timeLeft = Math.ceil((cooldownMs - (now - lastCompletion)) / (60 * 60 * 1000));
            await sql`ROLLBACK`;
            return NextResponse.json({ 
              error: `Task cooldown period active. Available again in ${timeLeft} hours.`
            }, { status: 429 });
          }
        }
      }
    }
    
    // Mark task as completed
    const completionData = verificationData ? JSON.stringify(verificationData) : null;
    
    await sql`
      INSERT INTO user_task_completions (user_id, task_id, verification_data)
      VALUES (${userId}, ${taskId}, ${completionData})
    `;
    
    // For repeatable tasks, also add to history
    if (task.is_repeatable) {
      await sql`
        INSERT INTO user_task_history (user_id, task_id, xp_earned)
        VALUES (${userId}, ${taskId}, ${taskXp})
      `;
    }
    
    // Add XP to user
    const newXp = currentXp + taskXp;
    const newLevel = Math.floor(newXp / 300) + 1; // Simple level calculation
    
    await sql`
      UPDATE users
      SET xp = ${newXp}, level = ${newLevel}, updated_at = NOW()
      WHERE id = ${userId}
    `;
    
    // Record XP transaction
    await sql`
      INSERT INTO xp_transactions (user_id, amount, source, source_id, description)
      VALUES (${userId}, ${taskXp}, 'task', ${taskId}, ${`Completed: ${task.title}`})
    `;
    
    // Check for level-up
    const leveledUp = newLevel > currentLevel;
    
    // Commit transaction
    await sql`COMMIT`;
    
    return NextResponse.json({ 
      success: true, 
      taskId,
      xpEarned: taskXp, 
      newTotalXp: newXp,
      newLevel,
      leveledUp,
      message: leveledUp 
        ? `Congratulations! You've reached level ${newLevel}!` 
        : `Task completed! You earned ${taskXp} XP.`
    });
  } catch (error) {
    // Rollback transaction on error
    await sql`ROLLBACK`;
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
  }
}

// GET completed tasks history for this user
export async function getCompletedTasks(walletAddress, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;
    
    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `;
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const userId = userResult.rows[0].id;
    
    // Get completed tasks with task details
    const { rows } = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.xp,
        t.difficulty,
        t.task_type,
        utc.completed_at
      FROM 
        user_task_completions utc
      JOIN 
        tasks t ON utc.task_id = t.id
      WHERE 
        utc.user_id = ${userId}
      ORDER BY 
        utc.completed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return rows;
  } catch (error) {
    console.error('Error fetching completed tasks:', error);
    throw error;
  }
}

// PUT route to reset all tasks for a user (for testing/admin)
export async function PUT(request, { params }) {
  const { walletAddress } = params;
  const body = await request.json();
  
  // Require an admin token or some kind of auth for this operation
  if (!body.adminToken || body.adminToken !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Begin transaction
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
    
    // Delete all completed tasks for this user
    await sql`
      DELETE FROM user_task_completions WHERE user_id = ${userId}
    `;
    
    // Delete task history too
    await sql`
      DELETE FROM user_task_history WHERE user_id = ${userId}
    `;
    
    // Commit transaction
    await sql`COMMIT`;
    
    return NextResponse.json({ 
      success: true, 
      message: 'All tasks have been reset for this user'
    });
  } catch (error) {
    // Rollback transaction on error
    await sql`ROLLBACK`;
    console.error('Error resetting tasks:', error);
    return NextResponse.json({ error: 'Failed to reset tasks' }, { status: 500 });
  }
}