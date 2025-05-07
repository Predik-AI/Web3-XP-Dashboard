// src/app/api/tasks/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET all tasks
export async function GET(request) {
  try {
    const { rows } = await sql`
      SELECT * FROM tasks
      ORDER BY id ASC
    `;
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST create a new task (admin only)
export async function POST(request) {
  try {
    const taskData = await request.json();
    const adminToken = request.headers.get('x-admin-token');
    
    // Verify admin token
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!taskData.title || !taskData.description || !taskData.xp || !taskData.difficulty || !taskData.taskType) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, xp, difficulty, taskType' 
      }, { status: 400 });
    }
    
    // Insert new task
    const { rows } = await sql`
      INSERT INTO tasks (
        title,
        description,
        xp,
        difficulty,
        task_type,
        requires_verification,
        is_repeatable,
        repeat_cooldown_hours
      ) VALUES (
        ${taskData.title},
        ${taskData.description},
        ${taskData.xp},
        ${taskData.difficulty},
        ${taskData.taskType},
        ${taskData.requiresVerification || false},
        ${taskData.isRepeatable || false},
        ${taskData.repeatCooldownHours || null}
      )
      RETURNING *
    `;
    
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH update existing task(s) (admin only)
export async function PATCH(request) {
  try {
    const updates = await request.json();
    const adminToken = request.headers.get('x-admin-token');
    
    // Verify admin token
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure we have task IDs and updates
    if (!updates.tasks || !Array.isArray(updates.tasks) || updates.tasks.length === 0) {
      return NextResponse.json({ error: 'No tasks to update' }, { status: 400 });
    }
    
    // Start a transaction for batch updates
    await sql`BEGIN`;
    
    const results = [];
    
    // Process each task update
    for (const task of updates.tasks) {
      if (!task.id) {
        continue; // Skip tasks without ID
      }
      
      // Build the SET clause dynamically based on provided fields
      let setClauses = [];
      const values = [];
      let index = 1;
      
      // Only update fields that are provided
      if (task.title !== undefined) {
        setClauses.push(`title = $${index++}`);
        values.push(task.title);
      }
      
      if (task.description !== undefined) {
        setClauses.push(`description = $${index++}`);
        values.push(task.description);
      }
      
      if (task.xp !== undefined) {
        setClauses.push(`xp = $${index++}`);
        values.push(task.xp);
      }
      
      if (task.difficulty !== undefined) {
        setClauses.push(`difficulty = $${index++}`);
        values.push(task.difficulty);
      }
      
      if (task.taskType !== undefined) {
        setClauses.push(`task_type = $${index++}`);
        values.push(task.taskType);
      }
      
      if (task.requiresVerification !== undefined) {
        setClauses.push(`requires_verification = $${index++}`);
        values.push(task.requiresVerification);
      }
      
      if (task.isRepeatable !== undefined) {
        setClauses.push(`is_repeatable = $${index++}`);
        values.push(task.isRepeatable);
      }
      
      if (task.repeatCooldownHours !== undefined) {
        setClauses.push(`repeat_cooldown_hours = $${index++}`);
        values.push(task.repeatCooldownHours);
      }
      
      // Always update the updated_at timestamp
      setClauses.push(`updated_at = NOW()`);
      
      // If no fields to update, skip this task
      if (setClauses.length === 1) {
        continue;
      }
      
      // Build and execute the update query
      const setClause = setClauses.join(', ');
      values.push(task.id); // Add the task ID for the WHERE clause
      
      const query = `
        UPDATE tasks 
        SET ${setClause} 
        WHERE id = $${index} 
        RETURNING *
      `;
      
      const result = await sql.query(query, values);
      
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }
    
    // Commit the transaction
    await sql`COMMIT`;
    
    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      tasks: results
    });
    
  } catch (error) {
    // Rollback the transaction on error
    await sql`ROLLBACK`;
    console.error('Error updating tasks:', error);
    return NextResponse.json({ error: 'Failed to update tasks' }, { status: 500 });
  }
}

// DELETE remove a task (admin only)
export async function DELETE(request) {
  try {
    const { taskId } = await request.json();
    const adminToken = request.headers.get('x-admin-token');
    
    // Verify admin token
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Check if task exists
    const taskCheck = await sql`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;
    
    if (taskCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Delete the task - cascading deletes will remove related records
    await sql`
      DELETE FROM tasks WHERE id = ${taskId}
    `;
    
    return NextResponse.json({
      success: true,
      message: `Task ${taskId} has been deleted`
    });
    
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}