# 命运塔 V2.0 区块链集成文档

## 概述

命运塔 V2.0 采用多链架构，支持8种主流加密货币，实现跨链资产互通与去中心化游戏体验。本文档详细说明智能合约架构、钱包配置、交易流程及Gas优化策略。

---

## 1. 智能合约清单

### 1.1 核心合约架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        智能合约架构图                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        治理层 (Governance)                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   TowerDAO   │  │  Timelock    │  │   Governor   │              │   │
│  │  │              │  │  Controller  │  │   Contract   │              │   │
│  │  │ - Proposals  │  │ - Delay Exec │  │ - Voting     │              │   │
│  │  │ - Execution  │  │ - Emergency  │  │ - Quorum     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        核心层 (Core)                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   FateToken  │  │   TowerNFT   │  │  Prediction  │              │   │
│  │  │    (FATE)    │  │              │  │   Market     │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ - ERC20      │  │ - ERC721     │  │ - Create     │              │   │
│  │  │ - Burnable   │  │ - Enumerable │  │ - Resolve    │              │   │
│  │  │ - Votes      │  │ - URIStorage │  │ - Settle     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Staking    │  │   Tournament │  │   Reward     │              │   │
│  │  │   Contract   │  │   Engine     │  │   Pool       │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ - Lock       │  │ - Register   │  │ - Calculate  │              │   │
│  │  │ - Rewards    │  │ - Score      │  │ - Distribute │              │   │
│  │  │ - Unstake    │  │ - Payout     │  │ - Vesting    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        扩展层 (Extensions)                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Bridge     │  │   AMM Pool   │  │   Lottery    │              │   │
│  │  │   Contract   │  │   (DEX)      │  │   System     │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ - Lock/Release│  │ - Swap       │  │ - Draw       │              │   │
│  │  │ - Mint/Burn  │  │ - Liquidity  │  │ - Jackpot    │              │   │
│  │  │ - Cross-chain│  │ - Fees       │  │ - Raffle     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Vesting    │  │   Airdrop    │  │   Referral   │              │   │
│  │  │   Contract   │  │   Contract   │  │   System     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        基础设施层 (Infrastructure)                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Proxy      │  │   Price      │  │   Random     │              │   │
│  │  │   Admin      │  │   Oracle     │  │   Generator  │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ - Upgrade    │  │ - Chainlink  │  │ - Chainlink  │              │   │
│  │  │ - Implementation│  - Pyth     │  │   VRF        │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 合约详细清单

#### 代币合约 (FateToken.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FateToken is ERC20, ERC20Burnable, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B FATE

    constructor() ERC20("Fate Token", "FATE") ERC20Permit("Fate Token") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, 100_000_000 * 10**18); // 初始流通 10%
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }

    // 实现 _afterTokenTransfer 和 _mint 以支持 ERC20Votes
}
```

#### NFT合约 (TowerNFT.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TowerNFT is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _tokenIdCounter;
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintPrice = 0.1 ether;

    mapping(uint256 => TowerAttributes) public towerAttributes;

    struct TowerAttributes {
        uint8 level;
        uint8 rarity;
        uint256 power;
        uint256 createdAt;
        string element;
    }

    constructor() ERC721("Tower of Fate", "TOWER") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, string memory uri, TowerAttributes memory attrs)
        public
        payable
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        towerAttributes[tokenId] = attrs;

        return tokenId;
    }
}
```

#### 预测市场合约 (PredictionMarket.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PredictionMarket is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Market {
        string question;
        uint256 endTime;
        uint256[] outcomes;
        uint256 totalStake;
        bool resolved;
        uint256 winningOutcome;
        mapping(address => Position) positions;
    }

    struct Position {
        uint256 outcome;
        uint256 amount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    uint256 public marketCounter;
    uint256 public platformFee = 250; // 2.5%

    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime);
    event PositionTaken(uint256 indexed marketId, address indexed user, uint256 outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint256 winningOutcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
}
```

### 1.3 合约部署地址

| 合约名称 | Ethereum | Polygon | BSC | Arbitrum |
|----------|----------|---------|-----|----------|
| FateToken | TBD | TBD | TBD | TBD |
| TowerNFT | TBD | TBD | TBD | TBD |
| PredictionMarket | TBD | TBD | TBD | TBD |
| Staking | TBD | TBD | TBD | TBD |
| Tournament | TBD | TBD | TBD | TBD |

---

## 2. 钱包配置（8种货币）

### 2.1 支持的加密货币

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        多链钱包架构                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        EVM 兼容链                                    │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  Ethereum   │  │   Polygon   │  │     BSC     │  │  Arbitrum  │  │   │
│  │  │    (ETH)    │  │   (MATIC)   │  │    (BNB)    │  │    (ETH)   │  │   │
│  │  │             │  │             │  │             │  │            │  │   │
│  │  │ ChainID: 1  │  │ ChainID: 137│  │ ChainID: 56 │  │ ChainID:   │  │   │
│  │  │ Decimals: 18│  │ Decimals: 18│  │ Decimals: 18│  │ 42161      │  │   │
│  │  │             │  │             │  │             │  │ Decimals:18│  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Optimism   │  │    Base     │  │  Avalanche  │                  │   │
│  │  │    (ETH)    │  │    (ETH)    │  │    (AVAX)   │                  │   │
│  │  │             │  │             │  │             │                  │   │
│  │  │ ChainID: 10 │  │ ChainID:    │  │ ChainID:    │                  │   │
│  │  │ Decimals: 18│  │ 8453        │  │ 43114       │                  │   │
│  │  │             │  │ Decimals: 18│  │ Decimals: 18│                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        非 EVM 链                                     │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                          Solana                              │   │   │
│  │  │                          (SOL)                               │   │   │
│  │  │                                                              │   │   │
│  │  │  - Program ID: TOWERxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx     │   │   │
│  │  │  - Decimals: 9                                               │   │   │
│  │  │  - Token Standard: SPL                                       │   │   │
│  │  │  - Wallet Adapter: @solana/wallet-adapter-react              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 钱包配置详情

#### 钱包 #1: 主资金库 (多签)
- **类型**: Gnosis Safe 多签钱包
- **签名阈值**: 3/5
- **用途**: 协议资金存储、大额转账
- **支持链**: All EVM chains

#### 钱包 #2: 运营热钱包
- **类型**: EOA (MetaMask/WalletConnect)
- **用途**: 日常运营、自动支付
- **限额**: 每日 100 ETH 等值
- **支持链**: Ethereum, Polygon, BSC

#### 钱包 #3: 奖励分发钱包
- **类型**: EOA + 智能合约
- **用途**: 用户奖励、空投发放
- **支持链**: All chains

#### 钱包 #4: NFT 铸造钱包
- **类型**: EOA
- **用途**: NFT 铸造、元数据更新
- **支持链**: Ethereum, Polygon

#### 钱包 #5: 跨链桥接钱包
- **类型**: EOA + 跨链合约
- **用途**: 跨链资产转移
- **支持链**: All chains

#### 钱包 #6: 营销钱包
- **类型**: EOA
- **用途**: 市场推广、KOL合作
- **支持链**: Ethereum, BSC

#### 钱包 #7: 开发团队钱包
- **类型**: 多签 (2/3)
- **用途**: 开发资金、工资发放
- **支持链**: All chains

#### 钱包 #8: 紧急储备钱包
- **类型**: 硬件钱包 (冷存储)
- **用途**: 紧急资金、保险储备
- **支持链**: Ethereum only

### 2.3 RPC 配置

```javascript
// chains.config.js
const chains = {
  ethereum: {
    id: 1,
    name: 'Ethereum Mainnet',
    rpc: [
      'https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}',
      'https://mainnet.infura.io/v3/${INFURA_KEY}'
    ],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://etherscan.io'
  },
  polygon: {
    id: 137,
    name: 'Polygon Mainnet',
    rpc: [
      'https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}',
      'https://polygon-rpc.com'
    ],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://polygonscan.com'
  },
  bsc: {
    id: 56,
    name: 'BNB Smart Chain',
    rpc: [
      'https://bsc-dataseed.binance.org',
      'https://bsc-dataseed1.defibit.io'
    ],
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorer: 'https://bscscan.com'
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    rpc: [
      'https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}',
      'https://arb1.arbitrum.io/rpc'
    ],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io'
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpc: [
      'https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}',
      'https://mainnet.optimism.io'
    ],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://optimistic.etherscan.io'
  },
  base: {
    id: 8453,
    name: 'Base',
    rpc: [
      'https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}',
      'https://mainnet.base.org'
    ],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org'
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche C-Chain',
    rpc: [
      'https://avalanche-mainnet.infura.io/v3/${INFURA_KEY}',
      'https://api.avax.network/ext/bc/C/rpc'
    ],
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockExplorer: 'https://snowtrace.io'
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    rpc: [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com'
    ],
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorer: 'https://explorer.solana.com'
  }
};
```

---

## 3. 交易流程

### 3.1 游戏参与流程

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────►│  Connect    │────►│   Select    │────►│   Deposit   │
│ Start   │     │   Wallet    │     │   Game      │     │   Funds     │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                               │
                                                               ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Receive │◄────│  Contract   │◄────│  Confirm    │◄────│   Sign      │
│ Result  │     │  Execute    │     │   Tx        │     │  Transaction│
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐
│   Claim     │────►│   Withdraw  │
│   Winnings  │     │   Funds     │
└─────────────┘     └─────────────┘
```

### 3.2 NFT 交易流程

```solidity
// 铸造流程
function mintTower(
    address to,
    uint8 level,
    uint8 rarity,
    string memory metadataURI
) external payable nonReentrant {
    require(msg.value >= calculateMintPrice(level, rarity), "Insufficient payment");
    require(totalSupply() < MAX_SUPPLY, "Sold out");

    uint256 tokenId = _tokenIdCounter++;

    _safeMint(to, tokenId);
    _setTokenURI(tokenId, metadataURI);

    towerAttributes[tokenId] = TowerAttributes({
        level: level,
        rarity: rarity,
        power: calculatePower(level, rarity),
        createdAt: block.timestamp,
        element: generateElement()
    });

    emit TowerMinted(tokenId, to, level, rarity);
}

// 交易流程
function purchaseTower(uint256 tokenId) external payable nonReentrant {
    address seller = ownerOf(tokenId);
    uint256 price = getListingPrice(tokenId);

    require(msg.value >= price, "Insufficient payment");
    require(seller != msg.sender, "Cannot buy own tower");

    // 计算费用
    uint256 platformFee = (price * PLATFORM_FEE) / 10000;
    uint256 sellerProceeds = price - platformFee;

    // 转移资金
    (bool success, ) = payable(seller).call{value: sellerProceeds}("");
    require(success, "Transfer failed");

    // 转移NFT
    _transfer(seller, msg.sender, tokenId);

    emit TowerPurchased(tokenId, seller, msg.sender, price);
}
```

### 3.3 锦标赛流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        锦标赛生命周期                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Registration          Tournament           Settlement         Reward      │
│   Phase                 Phase                Phase              Phase       │
│                                                                             │
│  ┌─────────┐          ┌─────────┐          ┌─────────┐        ┌─────────┐  │
│  │  Open   │          │  Live   │          │  Verify │        │ Distribute│  │
│  │ Entry   │─────────►│ Matches │─────────►│ Results │───────►│ Prizes   │  │
│  │         │  7 days  │         │  30 days │         │ 2 days │          │  │
│  │ - Fee   │          │ - Score │          │ - Oracle│        │ - Winner │  │
│  │ - Stake │          │ - Update│          │ - Verify│        │ - Pool   │  │
│  └─────────┘          └─────────┘          └─────────┘        └─────────┘  │
│       │                   │                   │                   │         │
│       ▼                   ▼                   ▼                   ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        智能合约交互                                  │   │
│  │                                                                     │   │
│  │  registerPlayer() ──► updateScore() ──► resolveTournament() ──►    │   │
│  │                                             claimPrize()           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Gas优化策略

### 4.1 合约层优化

#### 存储优化
```solidity
// 优化前：使用多个存储变量
contract Unoptimized {
    uint256 public totalPlayers;
    uint256 public totalGames;
    uint256 public totalRewards;
    uint256 public platformFees;
}

// 优化后：打包存储
contract Optimized {
    struct Stats {
        uint128 totalPlayers;  // 打包到同一个slot
        uint128 totalGames;
        uint128 totalRewards;  // 打包到同一个slot
        uint128 platformFees;
    }
    Stats public stats;
}
```

#### 事件 vs 存储
```solidity
// 优化：使用事件替代存储
contract GasOptimized {
    // 避免存储历史数据
    // mapping(uint256 => History) public histories;

    // 使用事件记录
    event GamePlayed(
        uint256 indexed gameId,
        address indexed player,
        uint256 result,
        uint256 timestamp
    );

    function playGame(uint256 gameId) external {
        // 游戏逻辑...

        // 使用事件而非存储
        emit GamePlayed(gameId, msg.sender, result, block.timestamp);
    }
}
```

### 4.2 交易层优化

#### 批量操作
```solidity
// 批量转账
function batchTransfer(
    address[] calldata recipients,
    uint256[] calldata amounts
) external onlyOwner {
    require(recipients.length == amounts.length, "Length mismatch");

    for (uint256 i = 0; i < recipients.length; i++) {
        _transfer(msg.sender, recipients[i], amounts[i]);
    }
}

// 批量领取奖励
function batchClaim(uint256[] calldata tournamentIds) external {
    for (uint256 i = 0; i < tournamentIds.length; i++) {
        _claimReward(tournamentIds[i], msg.sender);
    }
}
```

#### 默克尔树空投
```solidity
// Merkle Tree Airdrop
contract MerkleAirdrop {
    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;

    function claim(
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        require(!claimed[msg.sender], "Already claimed");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        claimed[msg.sender] = true;
        _transfer(address(this), msg.sender, amount);
    }
}
```

### 4.3 跨链Gas优化

| 链 | Gas价格策略 | 优化技术 | 预估成本 |
|----|-------------|----------|----------|
| Ethereum | EIP-1559 | L2桥接 | $5-50 |
| Polygon | 固定低Gas | 原生部署 | $0.001-0.01 |
| BSC | 固定低Gas | 批量交易 | $0.01-0.1 |
| Arbitrum | 压缩数据 | 乐观Rollup | $0.1-1 |
| Optimism | 压缩数据 | 乐观Rollup | $0.1-1 |
| Base | 压缩数据 | 乐观Rollup | $0.01-0.1 |
| Avalanche | 动态Gas | 子网部署 | $0.01-0.1 |
| Solana | 固定低Gas | 并行执行 | $0.0001-0.001 |

### 4.4 Gas费用估算

```javascript
// gasEstimator.js
const gasEstimates = {
  // 基础操作
  tokenTransfer: 65000,
  nftMint: 150000,
  nftTransfer: 85000,

  // 游戏操作
  placeBet: 120000,
  claimWinnings: 90000,
  enterTournament: 180000,

  // 质押操作
  stake: 200000,
  unstake: 180000,
  claimRewards: 120000,

  // 治理操作
  createProposal: 250000,
  castVote: 100000,
  executeProposal: 300000
};

// 计算预估费用
async function estimateTransactionCost(operation, chain) {
  const gasPrice = await getGasPrice(chain);
  const gasLimit = gasEstimates[operation];
  const costWei = gasPrice * gasLimit;

  return {
    gasLimit,
    gasPrice: gasPrice.toString(),
    costWei,
    costEth: ethers.utils.formatEther(costWei),
    costUsd: await convertToUsd(costWei, chain)
  };
}
```

---

## 5. 监控与告警

### 5.1 链上监控指标

| 指标 | 阈值 | 告警级别 |
|------|------|----------|
| 合约余额异常 | >10%变化 | 高 |
| 交易失败率 | >5% | 高 |
| Gas价格 | >200 gwei | 中 |
| 预言机延迟 | >1小时 | 高 |
| 异常大额交易 | >100 ETH | 高 |

### 5.2 监控脚本

```javascript
// monitor.js
const { ethers } = require('ethers');

class BlockchainMonitor {
  constructor(config) {
    this.providers = {};
    this.alerts = [];
    this.initializeProviders(config);
  }

  async monitorContract(contractAddress, abi, chain) {
    const provider = this.providers[chain];
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // 监听所有事件
    contract.on('*', (event) => {
      this.processEvent(event, chain);
    });

    // 定期检查余额
    setInterval(async () => {
      const balance = await provider.getBalance(contractAddress);
      this.checkBalanceAlert(contractAddress, balance, chain);
    }, 60000);
  }

  processEvent(event, chain) {
    // 大额交易检测
    if (event.args && event.args.value) {
      const value = ethers.utils.formatEther(event.args.value);
      if (parseFloat(value) > 100) {
        this.sendAlert('LARGE_TRANSFER', {
          chain,
          value,
          from: event.args.from,
          to: event.args.to,
          txHash: event.transactionHash
        });
      }
    }
  }
}
```

---

## 6. 附录

### 6.1 合约ABI

完整ABI文件位于 `/contracts/abis/` 目录。

### 6.2 测试网配置

| 网络 | Chain ID | RPC | Faucet |
|------|----------|-----|--------|
| Sepolia | 11155111 | https://rpc.sepolia.org | sepoliafaucet.com |
| Mumbai | 80001 | https://rpc-mumbai.maticvigil.com | faucet.polygon.technology |
| BSC Testnet | 97 | https://data-seed-prebsc-1-s1.binance.org:8545 | testnet.bnbchain.org |

### 6.3 相关文档

- [部署指南](./WEB4_DEPLOYMENT.md)
- [架构文档](./ARCHITECTURE_V2.md)
- [商业化计划](./COMMERCIAL_PLAN.md)

---

*文档版本: 2.0.0*
*最后更新: 2026-03-10*
