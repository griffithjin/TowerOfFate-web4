# 命运塔 Tower of Fate V2.0

<p align="center">
  <img src="assets/logo.png" alt="Tower of Fate Logo" width="200"/>
</p>

<p align="center">
  <strong>Web4.0 去中心化预测市场与游戏平台</strong>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#特性">特性</a> •
  <a href="#架构">架构</a> •
  <a href="#文档">文档</a> •
  <a href="#钱包配置">钱包配置</a> •
  <a href="#贡献">贡献</a>
</p>

---

## 概述

命运塔 V2.0 是一个基于 Web4.0 架构的下一代去中心化预测市场与游戏平台。融合区块链技术、人工智能和去中心化存储，打造透明、公平、可验证的数字命运体验。

### 核心数据
- **8** 种加密货币支持 (ETH, MATIC, BNB, ARB, OP, ETH(Base), AVAX, SOL)
- **74** 个塔楼 NFT 艺术资产
- **196** 个国家/地区锦标赛覆盖
- **$10M** 年收入目标

---

## Web4.0 新特性

### 多链架构
- 支持 8 条主流区块链
- 跨链资产互通
- Layer2 高速低费交易

### AI 驱动
- 智能赔率计算
- 欺诈检测系统
- NFT 艺术生成
- 个性化推荐

### 去中心化存储
- IPFS 资产存储
- Arweave 永久存档
- 抗审查内容分发

### Web3 身份
- 去中心化身份 (DID)
- 灵魂绑定代币 (SBT)
- 可验证凭证

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0
- Git >= 2.30.0
- Docker >= 24.0.0 (可选)

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/toweroffate/toweroffate_v2.0.git
cd toweroffate_v2.0

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置

# 4. 启动开发服务器
npm run dev

# 5. 访问应用
open http://localhost:3000
```

### 智能合约部署

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署到测试网
npx hardhat run scripts/deploy-testnet.js --network sepolia

# 部署到主网
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

---

## 特性

### 游戏功能
- **塔楼对战**: 策略性 PvP 战斗系统
- **预测市场**: 去中心化事件预测
- **锦标赛**: 196 国家/地区排名赛
- **抽奖系统**: 公平透明的随机抽奖

### NFT 生态
- **塔楼 NFT**: 74 个独特艺术资产
- **赛季限定**: 定期推出限定 NFT
- **升级系统**: NFT 属性强化与进化
- **租赁市场**: NFT 收益权租赁

### 经济系统
- **FATE 代币**: 平台原生代币
- **质押收益**: 多层级质押奖励
- **治理 DAO**: 社区驱动决策
- **收益分享**: 平台收入回馈用户

---

## 架构

### Web4.0 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      表现层 (Presentation)                   │
│  Web App • Mobile App • Mini App • VR/AR Client            │
├─────────────────────────────────────────────────────────────┤
│                      逻辑层 (Logic)                          │
│  API Services • Game Engine • AI Layer • Blockchain          │
├─────────────────────────────────────────────────────────────┤
│                      数据层 (Data)                           │
│  Blockchain • IPFS • PostgreSQL • Redis • MongoDB           │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, Next.js 14, Tailwind CSS, Three.js |
| 后端 | Node.js 20, NestJS, GraphQL, Socket.io |
| 区块链 | Solidity, Hardhat, Ethers.js, wagmi |
| AI/ML | TensorFlow.js, OpenAI API, Stable Diffusion |
| 存储 | IPFS, Arweave, PostgreSQL, Redis |
| 基础设施 | Docker, Kubernetes, Prometheus, Grafana |

---

## 文档

### 核心文档

| 文档 | 描述 | 路径 |
|------|------|------|
| [架构文档](./docs/ARCHITECTURE_V2.md) | Web4.0 系统架构详解 | `docs/ARCHITECTURE_V2.md` |
| [区块链集成](./docs/BLOCKCHAIN_INTEGRATION.md) | 智能合约与多链配置 | `docs/BLOCKCHAIN_INTEGRATION.md` |
| [部署指南](./docs/WEB4_DEPLOYMENT.md) | 完整部署流程 | `docs/WEB4_DEPLOYMENT.md` |
| [商业化计划](./docs/COMMERCIAL_PLAN.md) | 收入模型与增长策略 | `docs/COMMERCIAL_PLAN.md` |

### 快速链接

- [API 文档](https://api.toweroffate.io/docs)
- [智能合约地址](#钱包配置)
- [品牌资源](./assets/)

---

## 钱包配置

### 支持的区块链

| 链 | Chain ID | 原生代币 | 用途 |
|----|----------|----------|------|
| Ethereum | 1 | ETH | 主网资产、大额交易 |
| Polygon | 137 | MATIC | 游戏交易、低Gas |
| BSC | 56 | BNB | 桥接资产、流动性 |
| Arbitrum | 42161 | ETH | Layer2 高速交易 |
| Optimism | 10 | ETH | Layer2 低成本 |
| Base | 8453 | ETH | Coinbase 生态 |
| Avalanche | 43114 | AVAX | 子网部署 |
| Solana | - | SOL | 高频交易、NFT |

### 合约地址

> 注意：以下地址为示例，部署后请更新为实际地址

#### Ethereum Mainnet
| 合约 | 地址 |
|------|------|
| FateToken (FATE) | `0x...` |
| TowerNFT | `0x...` |
| PredictionMarket | `0x...` |
| Staking | `0x...` |
| Tournament | `0x...` |

#### Polygon
| 合约 | 地址 |
|------|------|
| FateToken (FATE) | `0x...` |
| TowerNFT | `0x...` |

#### BSC
| 合约 | 地址 |
|------|------|
| FateToken (FATE) | `0x...` |

### 钱包设置

```javascript
// 配置示例
const chainConfig = {
  ethereum: {
    chainId: 1,
    rpc: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  polygon: {
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  }
  // ... 其他链配置
};
```

---

## 项目结构

```
toweroffate_v2.0/
├── assets/                    # 静态资源
│   └── postcards/            # 明信片模板与奖励配置
├── blockchain/               # 区块链相关
│   ├── contracts/           # 智能合约
│   └── scripts/             # 部署脚本
├── docs/                     # 文档
│   ├── ARCHITECTURE_V2.md   # 架构文档
│   ├── BLOCKCHAIN_INTEGRATION.md  # 区块链集成
│   ├── WEB4_DEPLOYMENT.md   # 部署指南
│   └── COMMERCIAL_PLAN.md   # 商业化计划
├── server/                   # 后端服务
│   ├── src/                 # 源代码
│   └── tests/               # 测试
├── web_client/              # 前端应用
│   ├── src/                 # 源代码
│   └── public/              # 静态文件
├── README.md                # 本文件
└── package.json             # 项目配置
```

---

## 贡献

我们欢迎所有形式的贡献！请阅读我们的 [贡献指南](./CONTRIBUTING.md) 了解如何参与。

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 ESLint 和 Prettier 保持代码风格一致
- 所有合约代码必须通过安全审计
- 测试覆盖率需达到 90% 以上

---

## 安全

### 审计报告

- [CertiK 审计报告](./audits/certik-audit.pdf)
- [Trail of Bits 审计报告](./audits/trailofbits-audit.pdf)
- [OpenZeppelin 审计报告](./audits/openzeppelin-audit.pdf)

### 漏洞赏金

我们提供漏洞赏金计划，详情请访问 [Bug Bounty](./SECURITY.md)

---

## 社区

- **Discord**: [加入社区](https://discord.gg/toweroffate)
- **Twitter**: [@TowerOfFate](https://twitter.com/TowerOfFate)
- **Telegram**: [官方频道](https://t.me/TowerOfFate)
- **论坛**: [社区论坛](https://forum.toweroffate.io)

---

## 许可证

本项目采用 [MIT 许可证](./LICENSE)

---

## 致谢

感谢所有为命运塔项目做出贡献的开发者、设计师和社区成员。

特别感谢：
- OpenZeppelin 提供的安全合约库
- Chainlink 提供的预言机服务
- The Graph 提供的索引服务

---

<p align="center">
  <strong>命运由你掌控 | Fate is in Your Hands</strong>
</p>

<p align="center">
  <sub>Built with ❤️ by the Tower of Fate Team</sub>
</p>
