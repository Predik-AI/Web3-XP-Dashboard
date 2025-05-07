// src/app/api/tasks/complete/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// POST complete a task
export async function POST(request) {
  const { walletAddress, taskId, verificationData } = await request.json();
  
  if (!walletAddress || !taskId) {
    return NextResponse.json({ 
      error: 'Wallet address and taskId are required' 
    }, { status: 400 });
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
      SELECT id, xp, title, is_repeatable, requires_verification, repeat_cooldown_hours
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
      // For repeatable tasks, check cooldown period if applicable
      if (task.repeat_cooldown_hours) {
        const cooldownCheck = await sql`
          SELECT completed_at FROM user_task_completions 
          WHERE user_id = ${userId} AND task_id = ${taskId}
          ORDER BY completed_at DESC LIMIT 1
        `;
        
        if (cooldownCheck.rows.length > 0) {
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

// GET task completion statistics
export async function GET(request) {
  try {
    // Get overall task completion stats
    const stats = await sql`
      SELECT 
        t.id,
        t.title,
        COUNT(utc.id) as completion_count,
        t.xp,
        t.difficulty,
        t.task_type
      FROM 
        tasks t
      LEFT JOIN 
        user_task_completions utc ON t.id = utc.task_id
      GROUP BY 
        t.id, t.title, t.xp, t.difficulty, t.task_type
      ORDER BY 
        completion_count DESC
    `;
    
    // Get recent completions
    const recentCompletions = await sql`
      SELECT 
        u.username,
        u.wallet_address,
        t.title as task_title,
        t.id as task_id,
        utc.completed_at
      FROM 
        user_task_completions utc
      JOIN 
        users u ON utc.user_id = u.id
      JOIN 
        tasks t ON utc.task_id = t.id
      ORDER BY 
        utc.completed_at DESC
      LIMIT 10
    `;
    
    return NextResponse.json({
      taskStats: stats.rows,
      recentCompletions: recentCompletions.rows
    });
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch task statistics' }, { status: 500 });
  }
}

// PATCH bulk completion validation (admin only)
export async function PATCH(request) {
  try {
    const { completionIds, action } = await request.json();
    const adminToken = request.headers.get('x-admin-token');
    
    // Verify admin token
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!completionIds || !Array.isArray(completionIds) || completionIds.length === 0) {
      return NextResponse.json({ error: 'Valid completion IDs array is required' }, { status: 400 });
    }
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Action must be either 'approve' or 'reject'" }, { status: 400 });
    }
    
    // Begin transaction
    await sql`BEGIN`;
    
    if (action === 'approve') {
      // Mark completions as verified
      await sql`
        UPDATE user_task_completions
        SET verification_data = verification_data || '{"admin_verified": true}'::jsonb
        WHERE id = ANY(${completionIds})
      `;
    } else {
      // Delete rejected completions
      await sql`
        DELETE FROM user_task_completions
        WHERE id = ANY(${completionIds})
      `;
      
      // TODO: Could also deduct XP that was awarded, but that's complex and involves
      // multiple tables, so leaving it out for simplicity
    }
    
    // Commit transaction
    await sql`COMMIT`;
    
    return NextResponse.json({
      success: true,
      message: `${completionIds.length} task completion(s) have been ${action === 'approve' ? 'approved' : 'rejected'}`
    });
  } catch (error) {
    // Rollback transaction on error
    await sql`ROLLBACK`;
    console.error('Error processing task completions:', error);
    return NextResponse.json({ error: 'Failed to process task completions' }, { status: 500 });
  }
}