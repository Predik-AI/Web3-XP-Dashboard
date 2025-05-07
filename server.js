// server.js - Express API server for your React app
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Optional: Connect to Postgres if you have credentials set up
let pool;
try {
  if (process.env.POSTGRES_URL) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('PostgreSQL connection initialized');
  }
} catch (error) {
  console.error('Error initializing PostgreSQL connection:', error);
}

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mock database for development
const mockUsers = {};
const mockTasks = [
  { id: 1, title: 'Complete your profile', description: 'Add personal information and profile picture', xp: 50, difficulty: 'Easy', completed: false },
  { id: 2, title: 'Connect with Polygon network', description: 'Change your network to Polygon mainnet', xp: 75, difficulty: 'Medium', completed: false },
  { id: 3, title: 'Stake 10 MATIC', description: 'Stake MATIC tokens in the PREDIK platform', xp: 150, difficulty: 'Hard', completed: false },
  { id: 4, title: 'Refer a friend', description: 'Invite a friend to join PREDIK', xp: 100, difficulty: 'Medium', completed: false },
  { id: 5, title: 'Complete daily prediction', description: 'Make a prediction for today', xp: 25, difficulty: 'Easy', completed: false },
  { id: 6, title: 'Link email', description: 'Verify your email address', xp: 30, difficulty: 'Easy', completed: false },
  { id: 7, title: 'Connect Twitter', description: 'Link your Twitter/X account', xp: 40, difficulty: 'Easy', completed: false },
];

// API Routes - Users
app.get('/api/users/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  if (mockUsers[walletAddress]) {
    return res.json(mockUsers[walletAddress]);
  }
  
  return res.status(404).json({ error: 'User not found' });
});

app.post('/api/users', (req, res) => {
  const userData = req.body;
  const { walletAddress } = userData;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  
  if (mockUsers[walletAddress]) {
    return res.status(409).json({ 
      error: 'User already exists',
      userId: walletAddress
    });
  }
  
  const newUser = {
    walletAddress,
    username: userData.username || `PREDIK_${walletAddress.substring(2, 6)}`,
    bio: '',
    occupation: '',
    quote: '',
    preferredAssets: ['MATIC', 'ETH', 'BTC'],
    tradingType: 'Spot',
    xp: 0,
    level: 1,
    createdAt: new Date().toISOString()
  };
  
  mockUsers[walletAddress] = newUser;
  
  return res.status(201).json(newUser);
});

app.put('/api/users/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const userData = req.body;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  mockUsers[walletAddress] = {
    ...mockUsers[walletAddress],
    ...userData,
    updatedAt: new Date().toISOString()
  };
  
  return res.json(mockUsers[walletAddress]);
});

app.patch('/api/users/:walletAddress/xp', (req, res) => {
  const { walletAddress } = req.params;
  const { xp } = req.body;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  mockUsers[walletAddress].xp = xp;
  mockUsers[walletAddress].level = Math.floor(xp / 300) + 1;
  
  return res.json({ 
    walletAddress, 
    xp, 
    level: mockUsers[walletAddress].level 
  });
});

// API Routes - Tasks
app.get('/api/tasks', (req, res) => {
  res.json(mockTasks);
});

app.get('/api/users/:walletAddress/tasks', (req, res) => {
  const { walletAddress } = req.params;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // If user has completed tasks, apply them to the mock tasks
  const userCompletedTasks = mockUsers[walletAddress].completedTasks || [];
  
  const userTasks = mockTasks.map(task => ({
    ...task,
    completed: userCompletedTasks.includes(task.id),
    completedAt: userCompletedTasks.includes(task.id) ? new Date().toISOString() : null
  }));
  
  return res.json(userTasks);
});

app.post('/api/tasks/complete', (req, res) => {
  const { walletAddress, taskId } = req.body;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const task = mockTasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (!mockUsers[walletAddress].completedTasks) {
    mockUsers[walletAddress].completedTasks = [];
  }
  
  if (!mockUsers[walletAddress].completedTasks.includes(taskId)) {
    mockUsers[walletAddress].completedTasks.push(taskId);
    mockUsers[walletAddress].xp += task.xp;
    mockUsers[walletAddress].level = Math.floor(mockUsers[walletAddress].xp / 300) + 1;
  }
  
  return res.json({ 
    success: true, 
    taskId, 
    xp: task.xp,
    totalXp: mockUsers[walletAddress].xp,
    level: mockUsers[walletAddress].level
  });
});

// API Routes - Staking
app.post('/api/transactions/stake', (req, res) => {
  const { walletAddress, amount, transactionHash } = req.body;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!mockUsers[walletAddress].transactions) {
    mockUsers[walletAddress].transactions = [];
  }
  
  const stakingTx = {
    id: Math.random().toString(36).substring(2, 15),
    walletAddress,
    amount,
    transactionHash,
    type: 'stake',
    status: 'completed',
    timestamp: new Date().toISOString()
  };
  
  mockUsers[walletAddress].transactions.push(stakingTx);
  
  return res.json(stakingTx);
});

// API Routes - Email
app.post('/api/email/verify', (req, res) => {
  const { walletAddress, email } = req.body;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  mockUsers[walletAddress].email = email;
  mockUsers[walletAddress].emailVerified = false;
  
  return res.json({ 
    success: true,
    message: 'Verification email sent' 
  });
});

// API Routes - Referrals
app.post('/api/referrals', (req, res) => {
  const { walletAddress } = req.body;
  
  if (!mockUsers[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const referralCode = Math.random().toString(36).substring(2, 10);
  
  if (!mockUsers[walletAddress].referrals) {
    mockUsers[walletAddress].referrals = [];
  }
  
  mockUsers[walletAddress].referrals.push({
    code: referralCode,
    createdAt: new Date().toISOString(),
    usedBy: []
  });
  
  return res.json({
    referralCode,
    walletAddress,
    link: `predik.ai/${referralCode}`
  });
});

// API Routes - Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const { timeframe = 'daily', limit = 10 } = req.query;
  
  // Create leaderboard from mock users
  const leaderboardData = Object.values(mockUsers)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, parseInt(limit, 10))
    .map((user, index) => ({
      rank: index + 1,
      user: user.username,
      level: user.level,
      xp: user.xp,
      predictions: user.completedTasks ? user.completedTasks.length : 0,
      isYou: false
    }));
  
  return res.json(leaderboardData);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle production setup
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'build')));

  // For any request that doesn't match an API route, send the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});