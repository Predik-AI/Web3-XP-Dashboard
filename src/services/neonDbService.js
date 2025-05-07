// src/services/neonDbService.js
import axios from 'axios';

// Base URL for API calls
// In development, point to the local Express server
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // In production, use relative paths
  : '/api';  // In development, point to Express server

// Handle development vs production environment
const isProduction = process.env.NODE_ENV === 'production';

// Create axios instance with common configuration
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(config => {
  if (!isProduction) {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data || '');
  }
  return config;
});

// Add response interceptor for error handling and debugging
apiClient.interceptors.response.use(
  response => {
    if (!isProduction) {
      console.log(`API Response: ${response.status} from ${response.config.url}`, response.data);
    }
    return response;
  },
  error => {
    console.error('API Error:', error.response ? {
      status: error.response.status,
      url: error.config.url,
      data: error.response.data
    } : error.message);
    return Promise.reject(error);
  }
);

/**
 * User profile data service
 */
export const userService = {
  // Fetch user profile by wallet address
  async getUserByWallet(walletAddress) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/${walletAddress}`);
      return response.data;
    } catch (error) {
      // If user doesn't exist, return null
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Create new user profile
  async createUser(userData) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/users`, userData);
      return response.data;
    } catch (error) {
      // If in development and APIs aren't ready, use mock data
      if (!isProduction) {
        console.warn('Using mock data for createUser due to API error:', error.message);
        return mockService.getMockUser(userData.walletAddress);
      }
      throw error;
    }
  },

  // Update existing user profile
  async updateUser(walletAddress, userData) {
    try {
      const response = await apiClient.put(`${API_BASE_URL}/users/${walletAddress}`, userData);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for updateUser due to API error:', error.message);
        return { ...mockService.getMockUser(walletAddress), ...userData };
      }
      throw error;
    }
  },

  // Update user XP amount
  async updateUserXP(walletAddress, xpAmount) {
    try {
      const response = await apiClient.patch(`${API_BASE_URL}/users/${walletAddress}/xp`, {
        xp: xpAmount
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for updateUserXP due to API error:', error.message);
        return { walletAddress, xp: xpAmount };
      }
      throw error;
    }
  }
};

/**
 * Task management service
 */
export const taskService = {
  // Get all available tasks
  async getAllTasks() {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/tasks`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for getAllTasks due to API error:', error.message);
        return mockService.getMockTasks();
      }
      throw error;
    }
  },

  // Get tasks specific to a user
  async getUserTasks(walletAddress) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/${walletAddress}/tasks`);
      return response.data;
    } catch (error) {
      // If user doesn't exist or in development mode, return mock tasks
      if (error.response && error.response.status === 404 || !isProduction) {
        console.warn('Using mock data for getUserTasks due to API error:', error.message);
        return mockService.getMockTasks();
      }
      throw error;
    }
  },

  // Mark a task as completed for a user
  async completeTask(walletAddress, taskId) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/tasks/complete`, {
        walletAddress,
        taskId
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for completeTask due to API error:', error.message);
        return { success: true, taskId, walletAddress };
      }
      throw error;
    }
  },

  // Track task progress for multi-step tasks
  async updateTaskProgress(walletAddress, taskId, progressData) {
    try {
      const response = await apiClient.patch(`${API_BASE_URL}/tasks/${taskId}/progress`, {
        walletAddress,
        ...progressData
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for updateTaskProgress due to API error:', error.message);
        return { success: true, taskId, walletAddress, progress: progressData };
      }
      throw error;
    }
  }
};

/**
 * Web3 transaction tracking service
 */
export const transactionService = {
  // Record staking transaction
  async recordStakingTransaction(walletAddress, amount, transactionHash) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/transactions/stake`, {
        walletAddress,
        amount,
        transactionHash
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for recordStakingTransaction due to API error:', error.message);
        return { 
          success: true, 
          walletAddress, 
          amount, 
          transactionHash,
          timestamp: new Date().toISOString()
        };
      }
      throw error;
    }
  },

  // Get user staking history
  async getStakingHistory(walletAddress) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/${walletAddress}/staking`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for getStakingHistory due to API error:', error.message);
        return [];
      }
      throw error;
    }
  }
};

/**
 * Referral program service
 */
export const referralService = {
  // Create a new referral link
  async createReferralLink(walletAddress) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/referrals`, {
        walletAddress
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for createReferralLink due to API error:', error.message);
        const code = Math.random().toString(36).substring(2, 10);
        return { 
          referralCode: code,
          walletAddress,
          link: `predik.ai/${code}`
        };
      }
      throw error;
    }
  },

  // Track referral usage
  async trackReferral(referralCode, newUserWallet) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/referrals/${referralCode}/claim`, {
        newUserWallet
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for trackReferral due to API error:', error.message);
        return { success: true, referralCode, newUserWallet };
      }
      throw error;
    }
  },

  // Get user's referral statistics
  async getReferralStats(walletAddress) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/${walletAddress}/referrals/stats`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for getReferralStats due to API error:', error.message);
        return { 
          totalReferrals: 0,
          pendingReferrals: 0,
          completedReferrals: 0,
          totalXpEarned: 0
        };
      }
      throw error;
    }
  }
};

/**
 * Leaderboard service
 */
export const leaderboardService = {
  // Get leaderboard data
  async getLeaderboard(timeframe = 'daily', limit = 10) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/leaderboard?timeframe=${timeframe}&limit=${limit}`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for getLeaderboard due to API error:', error.message);
        return mockService.getMockLeaderboard();
      }
      throw error;
    }
  },

  // Get user's leaderboard position
  async getUserRank(walletAddress, timeframe = 'daily') {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/leaderboard/rank/${walletAddress}?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for getUserRank due to API error:', error.message);
        return { rank: 4, totalUsers: 5 };
      }
      throw error;
    }
  }
};

/**
 * Email verification service
 */
export const emailService = {
  // Send verification email
  async sendVerificationEmail(walletAddress, email) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/email/verify`, {
        walletAddress,
        email
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for sendVerificationEmail due to API error:', error.message);
        return { success: true, walletAddress, email };
      }
      throw error;
    }
  },

  // Verify email from token
  async confirmEmailVerification(token) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/email/confirm/${token}`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for confirmEmailVerification due to API error:', error.message);
        return { success: true, verified: true };
      }
      throw error;
    }
  }
};

/**
 * Social media connection service
 */
export const socialService = {
  // Get Twitter OAuth URL
  async getTwitterAuthUrl(walletAddress) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/social/twitter/auth-url?wallet=${walletAddress}`);
      return response.data.authUrl;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock Twitter auth URL due to API error:', error.message);
        return 'https://twitter.com/oauth/authorize?oauth_token=mock_token';
      }
      throw error;
    }
  },

  // Verify Twitter connection from callback
  async verifyTwitterConnection(walletAddress, oauthToken, oauthVerifier) {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/social/twitter/verify`, {
        walletAddress,
        oauthToken,
        oauthVerifier
      });
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock success for verifyTwitterConnection due to API error:', error.message);
        return { success: true, connected: true };
      }
      throw error;
    }
  },

  // Get connected social media accounts
  async getUserSocialAccounts(walletAddress) {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/${walletAddress}/social`);
      return response.data;
    } catch (error) {
      if (!isProduction) {
        console.warn('Using mock data for getUserSocialAccounts due to API error:', error.message);
        return [];
      }
      throw error;
    }
  }
};

/**
 * Mock service for development - use if APIs are not ready yet
 */
export const mockService = {
  // Mock user data for dashboard testing
  getMockUser(walletAddress) {
    return {
      walletAddress: walletAddress,
      username: `PREDIK_${walletAddress.substring(2, 6)}`,
      bio: 'Crypto enthusiast and trader',
      occupation: 'Developer',
      quote: 'Buy the dip, sell the rip',
      preferredAssets: ['MATIC', 'ETH', 'BTC'],
      tradingType: 'Spot',
      xp: 245,
      level: 3,
      createdAt: new Date().toISOString()
    };
  },
  
  // Mock tasks data
  getMockTasks() {
    return [
      { id: 1, title: 'Complete your profile', description: 'Add personal information and profile picture', xp: 50, difficulty: 'Easy', completed: false },
      { id: 2, title: 'Connect with Polygon network', description: 'Change your network to Polygon mainnet', xp: 75, difficulty: 'Medium', completed: false },
      { id: 3, title: 'Stake 10 MATIC', description: 'Stake MATIC tokens in the PREDIK platform', xp: 150, difficulty: 'Hard', completed: false },
      { id: 4, title: 'Refer a friend', description: 'Invite a friend to join PREDIK', xp: 100, difficulty: 'Medium', completed: false },
      { id: 5, title: 'Complete daily prediction', description: 'Make a prediction for today', xp: 25, difficulty: 'Easy', completed: false },
      { id: 6, title: 'Link email', description: 'Verify your email address', xp: 30, difficulty: 'Easy', completed: false },
      { id: 7, title: 'Connect Twitter', description: 'Link your Twitter/X account', xp: 40, difficulty: 'Easy', completed: false },
    ];
  },
  
  // Mock leaderboard data
  getMockLeaderboard() {
    return [
      { rank: 1, user: "crypto_wizard", level: 12, xp: 4582, predictions: 87, isYou: false },
      { rank: 2, user: "blockninja", level: 10, xp: 3891, predictions: 72, isYou: false },
      { rank: 3, user: "satoshi_fan", level: 9, xp: 3647, predictions: 68, isYou: false },
      { rank: 4, user: "PREDIK_User", level: 3, xp: 245, predictions: 5, isYou: true },
      { rank: 5, user: "crypto_kitty", level: 2, xp: 187, predictions: 3, isYou: false },
    ];
  }
};

/**
 * Health check utility
 */
export const healthService = {
  async checkApiConnection() {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      console.warn('API health check failed:', error.message);
      return false;
    }
  }
};

// Export a default service object combining all services
const neonDbService = {
  user: userService,
  task: taskService,
  transaction: transactionService,
  referral: referralService,
  leaderboard: leaderboardService,
  email: emailService,
  social: socialService,
  mock: mockService,
  health: healthService
};

export default neonDbService;