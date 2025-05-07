// src/lib/db.js
import { Pool } from 'pg';

// Create a connection pool using environment variables
let pool;

const getPool = () => {
  if (!pool) {
    // Get PostgreSQL connection URL from environment variables
    const connectionString = process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('Database connection string is not defined in environment variables');
    }
    
    // Create a new connection pool
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for some cloud PostgreSQL providers like Neon
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });
    
    // Log pool creation in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('PostgreSQL connection pool created');
    }
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(-1); // Exit in case of critical connection errors
    });
  }
  
  return pool;
};

/**
 * Execute a SQL query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<QueryResult>} Query result
 */
export const query = async (text, params) => {
  const pool = getPool();
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  // Log query performance in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  
  return res;
};

/**
 * Get a client from the pool with a transaction
 * Use for transactions that require multiple queries
 * @returns {Promise<PoolClient>} PostgreSQL client from the pool
 */
export const getClient = async () => {
  const pool = getPool();
  const client = await pool.connect();
  
  // Store original release method
  const originalRelease = client.release;
  
  // Override release method
  client.release = () => {
    // Reset release to original method
    client.release = originalRelease;
    return originalRelease.call(client);
  };
  
  return client;
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function that receives a client and executes queries
 * @returns {Promise<any>} Result from the callback
 */
export const transaction = async (callback) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if the database connection is alive
 * @returns {Promise<boolean>} True if connected
 */
export const checkConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

export default {
  query,
  getClient,
  transaction,
  checkConnection
};