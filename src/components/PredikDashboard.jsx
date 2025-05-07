import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  LayoutDashboard, 
  Trophy, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  LogOut, 
  Menu, 
  User, 
  Briefcase, 
  Quote, 
  TrendingUp, 
  X, 
  Save, 
  Mail, 
  Twitter, 
  Share, 
  ExternalLink, 
  Copy, 
  Check,
  AlertCircle
} from 'lucide-react';
import neonDbService from '../services/neonDbService';

const PredikDashboard = () => {
  // Main state
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [xpPoints, setXpPoints] = useState(0);
  const [level, setLevel] = useState(1);
  
  // UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [twitterModalOpen, setTwitterModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [stakeApproved, setStakeApproved] = useState(false);
  
  // User profile state
  const [userProfile, setUserProfile] = useState({
    username: 'PREDIK_User',
    bio: '',
    occupation: '',
    quote: '',
    preferredAssets: ['MATIC', 'ETH', 'BTC'],
    tradingType: 'Spot'
  });
  
  // Task state with loading and error handling
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  
  // Notification state
  const [notification, setNotification] = useState(null);
  
  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState('daily');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Effect to load user data when wallet is connected
  useEffect(() => {
    const loadUserData = async () => {
      if (!isConnected || !account) return;
      
      try {
        setTasksLoading(true);
        
        // Try to load existing user
        const user = await neonDbService.user.getUserByWallet(account);
        
        if (user) {
          // User exists, load their profile data
          setUserProfile({
            username: user.username || 'PREDIK_User',
            bio: user.bio || '',
            occupation: user.occupation || '',
            quote: user.quote || '',
            preferredAssets: user.preferredAssets || ['MATIC', 'ETH', 'BTC'],
            tradingType: user.tradingType || 'Spot'
          });
          
          // Set XP and level
          setXpPoints(user.xp || 0);
          setLevel(user.level || 1);
          
          // Load user-specific tasks with completion status
          const userTasks = await neonDbService.task.getUserTasks(account);
          setTasks(userTasks);
        } else {
          // Create new user if they don't exist
          const newUser = {
            walletAddress: account,
            username: `PREDIK_${account.substring(2, 6)}`,
            xp: 0,
            level: 1,
            createdAt: new Date().toISOString()
          };
          
          await neonDbService.user.createUser(newUser);
          
          // Load all available tasks for new user
          const allTasks = await neonDbService.task.getAllTasks();
          setTasks(allTasks);
        }
        
        setTasksLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setTasksError('Failed to load user data. Please try again later.');
        setTasksLoading(false);
        showNotification('Error loading user data. Please try again.', 'error');
      }
    };
    
    loadUserData();
  }, [isConnected, account]);

  // Display notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Connect to MetaMask function
  const connectWallet = async () => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.ethereum) {
      showNotification('Please install MetaMask to use this feature', 'error');
      return;
    }
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Check if on Polygon network (chainId 137)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== '0x89') {
        showNotification('Please switch to Polygon Mainnet', 'warning');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // Polygon Mainnet
          });
        } catch (switchError) {
          // If the user doesn't have Polygon added, we prompt them to add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x89',
                    chainName: 'Polygon Mainnet',
                    nativeCurrency: {
                      name: 'MATIC',
                      symbol: 'MATIC',
                      decimals: 18
                    },
                    rpcUrls: ['https://polygon-rpc.com/'],
                    blockExplorerUrls: ['https://polygonscan.com/']
                  }
                ],
              });
            } catch (addError) {
              console.error(addError);
              showNotification('Failed to add Polygon network', 'error');
            }
          }
        }
      }
      
      setAccount(accounts[0]);
      setIsConnected(true);
      showNotification('Wallet connected successfully');
      
    } catch (error) {
      console.error(error);
      showNotification('Failed to connect wallet', 'error');
    }
  };
  // Format account address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Function to handle completing a task
  const completeTask = async (taskId) => {
    if (!isConnected || !account) {
      showNotification('Please connect your wallet first', 'warning');
      return;
    }
    
    try {
      // Call the API to mark task as completed
      await neonDbService.task.completeTask(account, taskId);
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, completed: true, completedAt: new Date().toISOString() } 
            : task
        )
      );
      
      // Get XP reward for this task
      const taskXp = tasks.find(t => t.id === taskId)?.xp || 0;
      
      // Update user XP
      const updatedXp = xpPoints + taskXp;
      setXpPoints(updatedXp);
      
      // Update XP in database
      await neonDbService.user.updateUserXP(account, updatedXp);
      
      // Calculate new level (assuming 300 XP per level)
      const newLevel = Math.floor(updatedXp / 300) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        showNotification(`Congratulations! You've reached Level ${newLevel}!`, 'success');
      } else {
        showNotification(`Task completed! You earned ${taskXp} XP.`, 'success');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      showNotification('Error completing task. Please try again.', 'error');
    }
  };
  
  // Function to handle staking MATIC
  const handleStaking = async () => {
    if (!isConnected || !account) {
      showNotification('Please connect your wallet first', 'warning');
      return;
    }
    
    if (!stakeApproved) {
      setStakeLoading(true);
      try {
        // In a real app, this would interact with the contract for approval
        // For now, we simulate the approval transaction
        setTimeout(() => {
          setStakeApproved(true);
          setStakeLoading(false);
          showNotification('MATIC approved for staking', 'success');
        }, 2000);
      } catch (error) {
        console.error('Error approving tokens:', error);
        setStakeLoading(false);
        showNotification('Error approving tokens', 'error');
      }
    } else {
      setStakeLoading(true);
      
      try {
        // Simulate staking transaction
        // In a real app, this would be a web3 call
        const mockTxHash = `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        
        // Record the transaction in NeonTech DB
        await neonDbService.transaction.recordStakingTransaction(
          account,
          stakeAmount,
          mockTxHash
        );
        
        // Wait for a bit to simulate transaction processing
        setTimeout(async () => {
          // Mark staking task as completed
          await completeTask(3);
          
          setStakeLoading(false);
          setStakeModalOpen(false);
          showNotification(`Successfully staked ${stakeAmount} MATIC`, 'success');
        }, 3000);
      } catch (error) {
        console.error('Error processing stake:', error);
        setStakeLoading(false);
        showNotification('Error processing stake', 'error');
      }
    }
  };
  
  // Save profile to backend
  const saveProfile = async () => {
    if (!isConnected || !account) {
      showNotification('Please connect your wallet first', 'warning');
      return;
    }
    
    try {
      // Save profile to database
      await neonDbService.user.updateUser(account, {
        ...userProfile,
        updatedAt: new Date().toISOString()
      });
      
      // Check if the "Complete profile" task is already completed
      const profileTask = tasks.find(task => task.id === 1);
      if (profileTask && !profileTask.completed) {
        // Mark task as completed
        await completeTask(1);
      } else {
        showNotification('Profile updated successfully', 'success');
      }
      
      setProfileOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification('Error saving profile', 'error');
    }
  };
  
  // Handle email verification
  const verifyEmail = async () => {
    if (!isConnected || !account || !email) {
      showNotification('Please enter a valid email address', 'warning');
      return;
    }
    
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showNotification('Please enter a valid email address', 'warning');
      return;
    }
    
    try {
      await neonDbService.email.sendVerificationEmail(account, email);
      
      setEmailModalOpen(false);
      showNotification('Verification email sent. Please check your inbox.', 'success');
      
      // We don't mark the task as completed here - that happens when they click the link in the email
    } catch (error) {
      console.error('Error sending verification email:', error);
      showNotification('Error sending verification email', 'error');
    }
  };
  
  // Handle Twitter connection
  const connectTwitter = async () => {
    if (!isConnected || !account) {
      showNotification('Please connect your wallet first', 'warning');
      return;
    }
    
    try {
      // Get Twitter OAuth URL - in a real implementation
      // const authUrl = await neonDbService.social.getTwitterAuthUrl(account);
      
      // For demo purposes, we'll simulate this
      const authUrl = 'https://twitter.com/oauth/authorize?oauth_token=mock_token';
      
      // Open OAuth popup window
      const width = 600;
      const height = 600;
      const left = (typeof window !== 'undefined') ? (window.innerWidth / 2 - width / 2) : 0;
      const top = (typeof window !== 'undefined') ? (window.innerHeight / 2 - height / 2) : 0;
      
      // In a real app, this would redirect to Twitter
      // For demo purposes, we'll simulate a successful connection
      setTimeout(async () => {
        // Mark Twitter connect task as completed
        await completeTask(7);
      }, 1000);
      
      setTwitterModalOpen(false);
      showNotification('Twitter account connected successfully', 'success');
    } catch (error) {
      console.error('Error connecting to Twitter:', error);
      showNotification('Error connecting to Twitter', 'error');
    }
  };
  
  // Generate and copy referral link
  const generateReferralLink = async () => {
    if (!isConnected || !account) {
      showNotification('Please connect your wallet first', 'warning');
      return;
    }
    
    try {
      // In a real app, this would generate a unique code on the backend
      // For demo, we'll create a random code
      const randomCode = Math.random().toString(36).substring(2, 10);
      setReferralLink(`predik.ai/${randomCode}`);
      
      // In a real app, this would save the referral link
      // await neonDbService.referral.createReferralLink(account, randomCode);
      
      setReferralModalOpen(true);
    } catch (error) {
      console.error('Error generating referral link:', error);
      showNotification('Error generating referral link', 'error');
    }
  };
  
  // Copy referral link to clipboard
  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(referralLink)
        .then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 3000);
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
          showNotification('Error copying to clipboard', 'error');
        });
    }
  };
  
  // Load leaderboard data
  const loadLeaderboard = async (timeframe = 'daily') => {
    if (!isConnected) {
      setLeaderboardOpen(true);
      return;
    }
    
    try {
      setLeaderboardLoading(true);
      setLeaderboardTimeframe(timeframe);
      
      // In a real app, fetch from the DB
      // For demo, we'll use mock data
      const mockLeaderboard = [
        { rank: 1, user: "crypto_wizard", level: 12, xp: 4582, predictions: 87, isYou: false },
        { rank: 2, user: "blockninja", level: 10, xp: 3891, predictions: 72, isYou: false },
        { rank: 3, user: "satoshi_fan", level: 9, xp: 3647, predictions: 68, isYou: false },
        { rank: 4, user: userProfile.username, level, xp: xpPoints, predictions: 5, isYou: true },
        { rank: 5, user: "crypto_kitty", level: 2, xp: 187, predictions: 3, isYou: false },
      ];
      
      setLeaderboardData(mockLeaderboard);
      setLeaderboardLoading(false);
      setLeaderboardOpen(true);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboardLoading(false);
      showNotification('Error loading leaderboard data', 'error');
    }
  };
  // Main render - header and main structure
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Notification component */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          <span>{notification.message}</span>
          <button 
            className="ml-4 text-gray-500 hover:text-gray-700"
            onClick={() => setNotification(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-orange-500">PREDIK</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#" className="flex items-center text-gray-600 hover:text-orange-500">
                <LayoutDashboard className="w-5 h-5 mr-1" />
                <span>Dashboard</span>
              </a>
              <a href="#" className="flex items-center text-gray-600 hover:text-orange-500" onClick={() => loadLeaderboard(leaderboardTimeframe)}>
                <Trophy className="w-5 h-5 mr-1" />
                <span>Leaderboard</span>
              </a>
              
              {isConnected ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center bg-gray-100 rounded-full px-4 py-1">
                    <span className="text-sm text-gray-700 mr-2">{formatAddress(account)}</span>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <button 
                    className="text-gray-600 hover:text-orange-500 relative group"
                    onClick={() => setProfileOpen(true)}
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-300">
                      <span className="text-orange-500 text-xs font-bold">
                        {userProfile.username.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute w-2 h-2 bg-orange-500 rounded-full bottom-0 right-0 border border-white"></div>
                  </button>
                  <button 
                    className="text-gray-600 hover:text-red-500"
                    onClick={() => setIsConnected(false)}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  className="flex items-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  onClick={connectWallet}
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet
                </button>
              )}
            </div>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white py-2 px-4 border-t border-gray-200">
            <a href="#" className="block py-2 text-gray-600 hover:text-orange-500">
              <div className="flex items-center">
                <LayoutDashboard className="w-5 h-5 mr-2" />
                <span>Dashboard</span>
              </div>
            </a>
            <a 
              href="#" 
              className="block py-2 text-gray-600 hover:text-orange-500" 
              onClick={() => loadLeaderboard(leaderboardTimeframe)}
            >
              <div className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                <span>Leaderboard</span>
              </div>
            </a>
            
            {isConnected ? (
              <div className="py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{formatAddress(account)}</span>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="text-gray-600 hover:text-orange-500"
                      onClick={() => setProfileOpen(true)}
                    >
                      <User className="w-5 h-5" />
                    </button>
                    <button 
                      className="text-gray-600 hover:text-red-500"
                      onClick={() => setIsConnected(false)}
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                className="w-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg mt-2 transition-colors"
                onClick={connectWallet}
              >
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </button>
            )}
          </div>
        )}
      </header>
      
      {isConnected ? (
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* XP Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your XP Progress</h2>
              
              {/* Level and XP display */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Level {level}</span>
                <span className="text-orange-500 font-semibold">{xpPoints} XP</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                <div 
                  className="bg-orange-500 h-2.5 rounded-full" 
                  style={{ width: `${(xpPoints % 300) / 3}%` }}
                ></div>
              </div>
              
              {/* Next level info */}
              <div className="text-gray-500 text-sm">
                <p>{300 - (xpPoints % 300)} XP needed for Level {level + 1}</p>
              </div>
              
              {/* Achievements summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Achievements</h3>
                <div className="flex justify-between text-sm">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">
                      {tasks.filter(task => task.completed).length}
                    </div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{tasks.length}</div>
                    <div className="text-gray-500">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-500">
                      {tasks.filter(task => !task.completed).length}
                    </div>
                    <div className="text-gray-500">Remaining</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tasks Card */}
            <div className="md:col-span-2 bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Tasks to Earn XP</h2>
                <p className="text-gray-500 mt-1">Complete tasks to level up and earn rewards</p>
              </div>
              
              {tasksLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
                  <p className="mt-2 text-gray-500">Loading tasks...</p>
                </div>
              ) : tasksError ? (
                <div className="p-8 text-center text-red-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>{tasksError}</p>
                  <button 
                    className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="p-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="mb-4 p-4 border border-gray-200 rounded-lg hover:border-orange-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{task.title}</h3>
                          <p className="text-gray-500 text-sm mt-1">{task.description}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">{task.xp} XP</span>
                          <span className="text-xs text-gray-500 mt-2">
                            {task.difficulty === 'Easy' && '⭐'}
                            {task.difficulty === 'Medium' && '⭐⭐'}
                            {task.difficulty === 'Hard' && '⭐⭐⭐'}
                            <span className="ml-1">{task.difficulty}</span>
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button 
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            task.completed 
                              ? 'bg-green-100 text-green-600 cursor-default flex items-center' 
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                          onClick={() => {
                            if (!task.completed) {
                              if (task.id === 1) setProfileOpen(true);
                              else if (task.id === 2) connectWallet(); // This will trigger chain switch
                              else if (task.id === 3) setStakeModalOpen(true);
                              else if (task.id === 4) generateReferralLink();
                              else if (task.id === 5) {
                                const uniqueId = Math.random().toString(36).substring(2, 10);
                                window.open(`https://game.predik.ai/track?=${uniqueId}`, '_blank');
                              }
                              else if (task.id === 6) setEmailModalOpen(true);
                              else if (task.id === 7) setTwitterModalOpen(true);
                            }
                          }}
                          disabled={task.completed}
                        >
                          {task.completed ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Completed
                            </>
                          ) : (
                            'Start Task'
                          )}
                        </button>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.difficulty === 'Easy' ? '~5 min' : task.difficulty === 'Medium' ? '~15 min' : '~30 min'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
                <button className="w-full flex items-center justify-center text-gray-500 hover:text-orange-500 font-medium py-2">
                  <span>View All Tasks</span>
                  <ChevronDown className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect to PREDIK</h2>
            <p className="text-gray-600 mb-8">Connect your wallet to access the PREDIK dashboard and start earning XP</p>
            
            <button 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              onClick={connectWallet}
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect with MetaMask
            </button>
            
            <p className="mt-6 text-gray-500 text-sm">
              Make sure you're connected to the Polygon network
            </p>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-500 text-sm mb-4 md:mb-0">
              © 2025 PREDIK. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-orange-500 text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-orange-500 text-sm">Terms of Service</a>
              <a href="#" className="text-gray-500 hover:text-orange-500 text-sm">Support</a>
            </div>
          </div>
        </div>
      </footer>
      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">Your Profile</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setProfileOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile picture */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 rounded-full bg-orange-100 flex items-center justify-center border-4 border-orange-300">
                    <span className="text-orange-500 text-3xl font-bold">
                      {userProfile.username.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <button className="px-4 py-2 text-sm text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50">
                    Change Picture
                  </button>
                </div>
                
                {/* Profile form */}
                <div className="flex-1">
                  <div className="grid gap-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <input 
                          type="text" 
                          id="username" 
                          value={userProfile.username}
                          onChange={(e) => setUserProfile({...userProfile, username: e.target.value})}
                          className="block w-full rounded-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea 
                        id="bio" 
                        value={userProfile.bio}
                        onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                        rows="3"
                        placeholder="Tell us about yourself..."
                        className="block w-full rounded-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                        Occupation
                      </label>
                      <div className="flex items-center">
                        <Briefcase className="w-5 h-5 text-gray-400 mr-2" />
                        <input 
                          type="text" 
                          id="occupation" 
                          value={userProfile.occupation}
                          onChange={(e) => setUserProfile({...userProfile, occupation: e.target.value})}
                          placeholder="e.g. Trader, Developer, Student"
                          className="block w-full rounded-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="quote" className="block text-sm font-medium text-gray-700 mb-1">
                        Favorite Quote
                      </label>
                      <div className="flex items-center">
                        <Quote className="w-5 h-5 text-gray-400 mr-2" />
                        <input 
                          type="text" 
                          id="quote" 
                          value={userProfile.quote}
                          onChange={(e) => setUserProfile({...userProfile, quote: e.target.value})}
                          placeholder="Your favorite trading or life quote"
                          className="block w-full rounded-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Assets to Trade
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["MATIC", "ETH", "BTC", "SOL", "AVAX", "LINK"].map((asset) => (
                          <button 
                            key={asset}
                            onClick={() => {
                              const isSelected = userProfile.preferredAssets.includes(asset);
                              if (isSelected) {
                                setUserProfile({
                                  ...userProfile, 
                                  preferredAssets: userProfile.preferredAssets.filter(a => a !== asset)
                                });
                              } else {
                                setUserProfile({
                                  ...userProfile, 
                                  preferredAssets: [...userProfile.preferredAssets, asset]
                                });
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              userProfile.preferredAssets.includes(asset) 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {asset}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trading Type
                      </label>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                        <select 
                          value={userProfile.tradingType}
                          onChange={(e) => setUserProfile({...userProfile, tradingType: e.target.value})}
                          className="block w-full rounded-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                        >
                          <option value="Spot">Spot Trading</option>
                          <option value="Futures">Futures Trading</option>
                          <option value="Options">Options Trading</option>
                          <option value="Swing">Swing Trading</option>
                          <option value="DayTrading">Day Trading</option>
                          <option value="HODL">Long-term Holding</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={() => setProfileOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                onClick={saveProfile}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Leaderboard Modal */}
      {leaderboardOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">PREDIK Leaderboard</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setLeaderboardOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {leaderboardLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
                  <p className="mt-2 text-gray-500">Loading leaderboard...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-700">Top Performers</h3>
                    <div className="flex space-x-2">
                      <button 
                        className={`px-3 py-1 text-sm rounded-full ${
                          leaderboardTimeframe === 'daily' 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => loadLeaderboard('daily')}
                      >
                        Daily
                      </button>
                      <button 
                        className={`px-3 py-1 text-sm rounded-full ${
                          leaderboardTimeframe === 'weekly' 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => loadLeaderboard('weekly')}
                      >
                        Weekly
                      </button>
                      <button 
                        className={`px-3 py-1 text-sm rounded-full ${
                          leaderboardTimeframe === 'alltime' 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => loadLeaderboard('alltime')}
                      >
                        All Time
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-hidden bg-white shadow rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Level
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            XP
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Predictions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {leaderboardData.map((entry) => (
                          <tr key={entry.rank} className={entry.isYou ? "bg-orange-50" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-300">
                                  <span className="text-orange-500 text-xs font-bold">
                                    {entry.user.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900 flex items-center">
                                    {entry.user}
                                    {entry.isYou && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">You</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Level {entry.level}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.xp.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.predictions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-gray-500 text-sm">Keep completing tasks and making accurate predictions to climb the leaderboard!</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Email Verification Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Verify Your Email</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setEmailModalOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-2" />
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="block w-full rounded-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                We'll send a verification email to this address. You'll need to click the link in that email to complete verification.
              </p>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => setEmailModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed"
                  onClick={verifyEmail}
                  disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                >
                  Send Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Twitter Connection Modal */}
      {twitterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Connect Twitter/X Account</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setTwitterModalOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <Twitter className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-700 mb-4">
                  Connect your Twitter/X account to earn XP and share your predictions with your followers.
                </p>
                <button 
                  className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 flex items-center mx-auto"
                  onClick={connectTwitter}
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Connect with Twitter/X
                </button>
              </div>
              
              <p className="text-sm text-gray-500">
                PREDIK will only post content that you explicitly approve.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Referral Modal */}
      {referralModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Refer Friends</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setReferralModalOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Unique Referral Link
                </label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={referralLink}
                    readOnly
                    className="block w-full rounded-l-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500 bg-gray-50"
                  />
                  <button 
                    className={`p-2 rounded-r-md border border-l-0 border-gray-300 ${linkCopied ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    onClick={copyToClipboard}
                  >
                    {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {linkCopied ? 'Copied to clipboard!' : 'Click to copy'}
                </p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Share on</h3>
                <div className="flex space-x-2">
                  <button className="p-2 bg-blue-400 text-white rounded-md hover:bg-blue-500">
                    <Twitter className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                    <Mail className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600">
                    <Share className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                For each friend who signs up using your link, you'll both receive 100 XP!
              </p>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button 
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  onClick={() => {
                    // Mark task as completed
                    completeTask(4);
                    setReferralModalOpen(false);
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Staking Modal */}
      {stakeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Stake MATIC</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setStakeModalOpen(false)}
                disabled={stakeLoading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Amount to Stake</span>
                  <span className="text-orange-500 font-medium">10 MATIC</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Est. Annual Yield:</span>
                  <span>4.5%</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Lock Period:</span>
                  <span>30 days</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="stakeAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Stake Amount
                </label>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    id="stakeAmount" 
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="block w-full rounded-l-md border-gray-300 border p-2 focus:border-orange-500 focus:ring-orange-500"
                    min="1"
                    disabled={stakeLoading}
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-700">
                    MATIC
                  </span>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="ml-3 text-sm text-orange-700">
                    Staking requires two transactions: first to approve the contract, then to complete the stake.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => setStakeModalOpen(false)}
                  disabled={stakeLoading}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 ${stakeApproved ? 'bg-orange-500' : 'bg-blue-500'} text-white rounded-lg ${stakeApproved ? 'hover:bg-orange-600' : 'hover:bg-blue-600'} disabled:opacity-70 flex items-center`}
                  onClick={handleStaking}
                  disabled={stakeLoading || stakeAmount < 1}
                >
                  {stakeLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {stakeLoading 
                    ? 'Processing...' 
                    : stakeApproved 
                      ? 'Stake MATIC' 
                      : 'Approve MATIC'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredikDashboard;
