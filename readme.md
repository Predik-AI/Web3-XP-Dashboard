# 🔮 PREDIK Platform

## The Future of Decentralized Predictive Intelligence

**Where Human Insight Meets Blockchain Verification**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](package.json)
[![Status](https://img.shields.io/badge/status-Live%20Beta-orange.svg)]()
[![Network](https://img.shields.io/badge/network-Polygon-purple.svg)]()

---

## 🌟 Overview

**PREDIK** revolutionizes predictive analytics by combining crowd-sourced intelligence with blockchain verification. Built by the team behind Europe's most advanced smart-beta indices, we're creating a decentralized ecosystem where data scientists, traders, and institutions collaborate to generate alpha.

### 🎯 Core Value Proposition

- **For Traders**: Monetize your market insights with verifiable on-chain predictions
- **For Institutions**: Access aggregated sentiment data and predictive signals
- **For Developers**: Build on our open infrastructure with comprehensive APIs
- **For Everyone**: Transparent, immutable, and fair prediction markets

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
PostgreSQL (NeonTech)
Polygon Wallet (MetaMask/WalletConnect)
```

### Installation

```bash
# Clone repository
git clone https://github.com/predik-ai/predik-platform
cd predik-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Setup database
npm run db:migrate

# Launch development server
npm run dev
```

Visit `http://localhost:3000` to access the platform.

---

## 🏗️ Platform Architecture

### System Overview

```
┌──────────────────────────────────────────────┐
│              User Interface Layer             │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐ │
│  │Dashboard│  │History  │  │Tournament    │ │
│  │Component│  │Component│  │Ecosystem     │ │
│  └─────────┘  └─────────┘  └──────────────┘ │
└──────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│               API Layer (Next.js)             │
│                                               │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │Prediction API│  │Tournament/Reward API│   │
│  └──────────────┘  └────────────────────┘   │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │Resolution API│  │Integrity Proof API │   │
│  └──────────────┘  └────────────────────┘   │
└──────────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  PostgreSQL  │ │   IPFS   │ │  Blockchain  │
│   Database   │ │  Storage │ │   Polygon    │
└──────────────┘ └──────────┘ └──────────────┘
```

### 🔐 Dual-Mode Prediction System

#### **Public Anixi Program**
- ✅ Transparent, verifiable predictions
- ✅ IPFS permanent storage
- ✅ Community validation
- ✅ Standard XP rewards

#### **Private Kryptos Program**
- 🔒 AES-256 encrypted predictions
- 🔒 Zero-knowledge proof compatibility
- 🔒 +25% bonus rewards
- 🔒 Institutional-grade privacy

---

## 📊 Core Features

### 1. 🎮 **Proof-of-Prediction Dashboard**
Real-time prediction submission with multi-asset support:
- **Supported Assets**: BTC, ETH, SOL, ADA, AVAX, MATIC, DOT, LINK, UNI, LTC
- **Timeframes**: 5min, 1hour, 1day, 7days
- **Direction**: Bullish/Bearish with optional percentage targets
- **Confidence Levels**: Risk-adjusted scoring multipliers

### 2. 🏆 **Tournament System (Reward Mode)**
Competitive prediction tournaments with prize pools:
- **Entry Fee**: 5 MATIC per tournament
- **Prize Distribution**: Top 8 performers share pool
- **Scoring Formula**: `Score = (Σ Accuracy / N) × log₂(1 + N)`
- **Live Leaderboards**: Real-time ranking updates

### 3. 📈 **Prediction History & Analytics**
Comprehensive performance tracking:
- **Success Metrics**: Win rate, accuracy percentage, total points
- **Historical Data**: All predictions with outcomes
- **Auto-Resolution**: Market data integration via RapidAPI
- **Export Options**: CSV, JSON, on-chain verification

### 4. 🔗 **Integrity Proof System**
Cryptographic verification infrastructure:
- **Merkle Tree Proofs**: Batch commitment of predictions
- **IPFS Archival**: Permanent decentralized storage
- **Blockchain Anchoring**: Optional on-chain commitment
- **Audit Trail**: Complete prediction lifecycle tracking

### 5. 💎 **Ecosystem Components**
Integrated platform features:
- **Prediction Vaults**: Lock rewards for enhanced APY
- **Sponsor Pools**: DAO/protocol-sponsored bonus rewards
- **XP System**: Gamified progression mechanics
- **API Access**: Programmatic prediction submission

---

## 🛠️ Technical Implementation

### Smart Contract Architecture

```solidity
// Core contracts deployed on Polygon
TournamentManager.sol     // Tournament creation and management
PredictionRegistry.sol    // On-chain prediction verification
RewardDistributor.sol     // Automated prize distribution
StakingVault.sol         // Token staking mechanics
```

### API Endpoints

#### **Prediction Submission**
```javascript
POST /api/proof-of-prediction
{
  "walletAddress": "0x...",
  "asset": "BTC",
  "timeframe": "1hour",
  "direction": "up",
  "percentChange": 5.2,
  "confidence": 0.85,
  "rewardProgram": "private_kryptos"
}
```

#### **Tournament Entry**
```javascript
POST /api/reward-mode
{
  "action": "SUBMIT_TOURNAMENT_PREDICTION",
  "predictionData": {
    "tournament_id": "uuid",
    "wallet_address": "0x...",
    "asset": "ETH",
    "tx_hash": "0x..."
  }
}
```

#### **Resolution Service**
```javascript
POST /api/resolve-predictions
{
  "predictions": [...],
  "adminKey": "optional_for_manual"
}
```

#### **Integrity Verification**
```javascript
POST /api/integrity-proof
{
  "adminKey": "required",
  "timeRange": { "start": "...", "end": "..." },
  "storeOnChain": true
}
```

### Database Schema

```sql
-- Core tables
predictions               -- All prediction records
tournaments              -- Tournament configurations
tournament_predictions   -- Tournament-specific predictions
integrity_commitments    -- Merkle root commitments
users                   -- User profiles and XP
prediction_vaults       -- Locked reward positions
sponsor_pools          -- Sponsored reward pools
```

---

## 💰 Tournament Reward Distribution

| Rank | Reward Share | Example (1000 MATIC Pool) |
|------|-------------|---------------------------|
| 🥇 1st | 25% | 250 MATIC |
| 🥈 2nd | 20% | 200 MATIC |
| 🥉 3rd | 15% | 150 MATIC |
| 4th | 10% | 100 MATIC |
| 5th | 8% | 80 MATIC |
| 6th | 6% | 60 MATIC |
| 7th | 5% | 50 MATIC |
| 8th | 4% | 40 MATIC |
| Treasury | 7% | 70 MATIC |

---

## 🔧 Environment Configuration

```env
# Database
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Blockchain
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology

# Storage
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
WEB3_STORAGE_TOKEN=your_web3_storage_token

# Security
KRYPTOS_SECRET_KEY=32-character-encryption-key
ADMIN_SECRET_KEY=admin-access-key

# External APIs
RAPIDAPI_KEY=your_rapidapi_key
```

---

## 📈 Platform Statistics

### Current Metrics (Live)
- **Total Predictions**: 10,000+
- **Active Users**: 500+
- **Tournament Prize Pools**: 50,000+ MATIC distributed
- **Platform Accuracy**: 67% average
- **IPFS Storage**: 100GB+ prediction data

### Performance Benchmarks
- **API Response Time**: <200ms average
- **Prediction Resolution**: Automated within 5 minutes
- **IPFS Upload**: Batch processing every 30 minutes
- **Smart Contract Gas**: Optimized for Polygon

---

## 🗺️ Development Roadmap

### ✅ **Completed (Q3 2024)**
- [x] Proof-of-Prediction infrastructure
- [x] Dual reward programs (Public Anixi & Private Kryptos)
- [x] Tournament system with entry fees
- [x] Prediction history dashboard
- [x] IPFS integration with Helia
- [x] Integrity proof system with Merkle trees
- [x] Auto-resolution engine with market data
- [x] Polygon Amoy testnet integration

### 🔄 **In Progress (Q4 2024)**
- [ ] Mobile responsive optimization
- [ ] Advanced analytics dashboard
- [ ] Webhook notifications
- [ ] GraphQL API layer
- [ ] Enhanced tournament features
- [ ] Prediction vaults implementation

### 📋 **Planned (Q1 2025)**
- [ ] $PREDIK token integration
- [ ] Staking mechanisms
- [ ] Cross-chain support (Arbitrum, Base)
- [ ] Zero-knowledge proofs
- [ ] DAO governance
- [ ] Institutional API tiers

### 🚀 **Future (Q2 2025+)**
- [ ] AI-powered prediction assistance
- [ ] Options and derivatives
- [ ] Advanced risk management tools
- [ ] Regulatory compliance framework
- [ ] Mobile applications (iOS/Android)
- [ ] Enterprise solutions suite

---

## 🤝 Contributing

We welcome community contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/predik-platform
cd predik-platform

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm run test
npm run lint

# Submit PR
git push origin feature/your-feature
```

### Code Style Guidelines
- **Frontend**: React functional components with hooks
- **Backend**: Next.js API routes with TypeScript
- **Database**: PostgreSQL with proper indexing
- **Smart Contracts**: Solidity 0.8+ with OpenZeppelin

---

## 📚 Documentation

### For Users
- [Getting Started Guide](docs/getting-started.md)
- [Prediction Strategies](docs/strategies.md)
- [Tournament Rules](docs/tournaments.md)
- [Reward Programs Explained](docs/rewards.md)
- [FAQ](docs/faq.md)

### For Developers
- [API Reference](docs/api-reference.md)
- [Smart Contract Docs](docs/smart-contracts.md)
- [Integration Guide](docs/integration.md)
- [Database Schema](docs/database.md)
- [Security Audit](docs/security.md)

### For Institutions
- [Enterprise API](docs/enterprise.md)
- [Data Licensing](docs/licensing.md)
- [Custom Indices](docs/indices.md)
- [Compliance](docs/compliance.md)

---

## 🔒 Security

### Audit Status
- **Smart Contracts**: Pending formal audit (Q4 2024)
- **Infrastructure**: Regular penetration testing
- **Encryption**: AES-256 for sensitive data
- **Access Control**: Multi-signature admin functions
- **Rate Limiting**: DDoS protection implemented

### Bug Bounty Program
Report security vulnerabilities to security@predik.ai
- **Critical**: Up to $10,000 USDC
- **High**: Up to $5,000 USDC
- **Medium**: Up to $1,000 USDC
- **Low**: Up to $250 USDC

### Security Best Practices
- Regular dependency updates
- Environment variable encryption
- SQL injection prevention
- XSS protection
- CORS configuration

---

## 📞 Support & Community

### Get Help
- **Discord**: [discord.gg/predik](https://discord.gg/predik)
- **Telegram**: [t.me/predikdotai](https://t.me/predikdotai)
- **Email**: support@predik.ai
- **Help Center**: [help.predik.ai](https://help.predik.ai)

### Stay Updated
- **Twitter**: [@predikdotai](https://twitter.com/predikdotai)
- **Medium**: [medium.com/@predik](https://medium.com/@predik)
- **YouTube**: [youtube.com/@predikdotai](https://youtube.com/@predikdotai)
- **LinkedIn**: [linkedin.com/company/predik](https://linkedin.com/company/predik)

### Resources
- **Website**: [predik.ai](https://predik.ai)
- **Game**: [game.predik.ai](https://game.predik.ai)
- **Docs**: [docs.predik.ai](https://docs.predik.ai)
- **GitHub**: [github.com/predik-ai](https://github.com/predik-ai)
- **Status Page**: [status.predik.ai](https://status.predik.ai)

---

## 🏆 Achievements & Recognition

- **🎯 10,000+** Predictions submitted
- **👥 500+** Active predictors
- **💰 50,000+** MATIC in rewards distributed
- **📊 67%** Platform-wide accuracy rate
- **🔗 100%** Uptime since launch
- **⭐ 4.8/5** User satisfaction rating

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 PREDIK

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Solactive** - Index methodology inspiration
- **Polygon** - Scalable blockchain infrastructure
- **IPFS** - Decentralized storage network
- **RainbowKit** - Web3 authentication
- **Vercel** - Hosting and deployment
- **NeonTech** - Database infrastructure
- **Community** - Our amazing predictors and supporters

---

## 🌟 Special Thanks

To our early adopters, beta testers, and community members who have helped shape PREDIK into what it is today. Your feedback, predictions, and support have been invaluable.

---

<div align="center">

# 🚀 Join the Prediction Revolution

**Built with ❤️ by the PREDIK Team**

*Transforming prediction markets through decentralized intelligence*

[![Star on GitHub](https://img.shields.io/github/stars/predik-ai/predik-platform.svg?style=social)](https://github.com/predik-ai/predik-platform)
[![Follow on Twitter](https://img.shields.io/twitter/follow/predikdotai.svg?style=social)](https://twitter.com/predikdotai)
[![Join Discord](https://img.shields.io/discord/123456789.svg?style=social)](https://discord.gg/predik)

**[Start Predicting](https://app.predik.ai) | [Read Docs](https://docs.predik.ai) | [Join Community](https://discord.gg/predik)**

</div>
