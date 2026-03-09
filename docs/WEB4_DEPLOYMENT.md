# 命运塔 V2.0 Web4.0 部署指南

## 概述

本文档提供命运塔 V2.0 从开发环境到生产环境的完整部署流程，包括智能合约部署、前端部署、后端部署及监控配置。

---

## 1. 环境准备

### 1.1 系统要求

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        系统要求清单                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  开发环境 (Development)                                                      │
│  ├── Node.js >= 18.0.0                                                      │
│  ├── npm >= 9.0.0 或 yarn >= 1.22.0                                         │
│  ├── Git >= 2.30.0                                                          │
│  ├── Docker >= 24.0.0                                                       │
│  ├── Docker Compose >= 2.20.0                                               │
│  └── Hardhat >= 2.19.0                                                      │
│                                                                             │
│  测试环境 (Staging)                                                          │
│  ├── Kubernetes >= 1.28                                                     │
│  ├── Helm >= 3.12.0                                                         │
│  ├── PostgreSQL >= 15.0                                                     │
│  ├── Redis >= 7.0                                                           │
│  └── Kafka >= 3.5                                                           │
│                                                                             │
│  生产环境 (Production)                                                       │
│  ├── AWS/Azure/GCP 账户                                                     │
│  ├── 域名与 SSL 证书                                                          │
│  ├── 多签钱包配置                                                            │
│  └── 监控告警系统                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 环境变量模板

```bash
# .env.example

# ==================== 基础配置 ====================
NODE_ENV=production
APP_NAME=tower-of-fate
APP_VERSION=2.0.0

# ==================== 数据库配置 ====================
DATABASE_URL=postgresql://user:password@host:5432/towerdb
REDIS_URL=redis://host:6379
MONGODB_URI=mongodb://user:password@host:27017/tower_analytics

# ==================== 区块链配置 ====================
# Ethereum Mainnet
ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
ETHEREUM_PRIVATE_KEY=0x...

# Polygon
POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
POLYGON_PRIVATE_KEY=0x...

# BSC
BSC_RPC=https://bsc-dataseed.binance.org
BSC_PRIVATE_KEY=0x...

# Arbitrum
ARBITRUM_RPC=https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
ARBITRUM_PRIVATE_KEY=0x...

# Optimism
OPTIMISM_RPC=https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
OPTIMISM_PRIVATE_KEY=0x...

# Base
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
BASE_PRIVATE_KEY=0x...

# Avalanche
AVALANCHE_RPC=https://api.avax.network/ext/bc/C/rpc
AVALANCHE_PRIVATE_KEY=0x...

# Solana
SOLANA_RPC=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=[...]

# ==================== 合约地址 ====================
FATE_TOKEN_ETH=0x...
FATE_TOKEN_POLYGON=0x...
TOWER_NFT_ETH=0x...
PREDICTION_MARKET_ETH=0x...

# ==================== 第三方服务 ====================
# Alchemy
ALCHEMY_API_KEY=your_alchemy_key

# Infura
INFURA_PROJECT_ID=your_infura_id
INFURA_PROJECT_SECRET=your_infura_secret

# Chainlink
CHAINLINK_VRF_COORDINATOR=0x...
CHAINLINK_LINK_TOKEN=0x...
CHAINLINK_KEY_HASH=0x...
CHAINLINK_FEE=100000000000000000

# The Graph
GRAPH_API_KEY=your_graph_key

# IPFS
IPFS_PROJECT_ID=your_ipfs_id
IPFS_PROJECT_SECRET=your_ipfs_secret

# Arweave
ARWEAVE_KEY_FILE=arweave-key.json

# OpenAI
OPENAI_API_KEY=sk-...

# ==================== 安全配置 ====================
JWT_SECRET=your_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key
ADMIN_WALLET=0x...
TREASURY_WALLET=0x...

# ==================== 监控配置 ====================
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=your_datadog_key
PROMETHEUS_RETENTION=30d

# ==================== 功能开关 ====================
ENABLE_STAKING=true
ENABLE_NFT_MINTING=true
ENABLE_TOURNAMENTS=true
ENABLE_PREDICTION_MARKET=true
MAINTENANCE_MODE=false
```

---

## 2. 智能合约部署

### 2.1 部署流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        合约部署流程                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Compile │───►│  Test   │───►│  Audit  │───►│ Deploy  │───►│ Verify  │   │
│  │         │    │         │    │         │    │         │    │         │   │
│  │ Hardhat │    │ Coverage│    │ Slither │    │ Scripts │    │ Etherscan│   │
│  │ Foundry │    │ Fuzzing │    │ Mythril │    │ Multi-sig│   │ Sourcify│   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │              │              │              │              │         │
│       ▼              ▼              ▼              ▼              ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        部署检查清单                                  │   │
│  │                                                                     │   │
│  │  □ 编译无警告    □ 测试覆盖率>90%  □ 安全审计通过  □ 多签确认      │   │
│  │  □ Gas优化      □ 升级测试       □ 紧急暂停测试  □ 源码验证      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 部署脚本

#### 主网部署脚本
```javascript
// scripts/deploy-mainnet.js
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting mainnet deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

  // 1. 部署 FateToken
  console.log("\n1. Deploying FateToken...");
  const FateToken = await ethers.getContractFactory("FateToken");
  const fateToken = await FateToken.deploy();
  await fateToken.deployed();
  console.log("FateToken deployed to:", fateToken.address);

  // 2. 部署 TowerNFT
  console.log("\n2. Deploying TowerNFT...");
  const TowerNFT = await ethers.getContractFactory("TowerNFT");
  const towerNFT = await TowerNFT.deploy();
  await towerNFT.deployed();
  console.log("TowerNFT deployed to:", towerNFT.address);

  // 3. 部署 PredictionMarket
  console.log("\n3. Deploying PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(fateToken.address);
  await predictionMarket.deployed();
  console.log("PredictionMarket deployed to:", predictionMarket.address);

  // 4. 部署 Staking
  console.log("\n4. Deploying Staking...");
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(fateToken.address);
  await staking.deployed();
  console.log("Staking deployed to:", staking.address);

  // 5. 部署 Tournament
  console.log("\n5. Deploying Tournament...");
  const Tournament = await ethers.getContractFactory("Tournament");
  const tournament = await Tournament.deploy(fateToken.address, towerNFT.address);
  await tournament.deployed();
  console.log("Tournament deployed to:", tournament.address);

  // 6. 配置权限
  console.log("\n6. Configuring permissions...");

  // 授予 MINTER_ROLE
  const MINTER_ROLE = await fateToken.MINTER_ROLE();
  await fateToken.grantRole(MINTER_ROLE, staking.address);
  await fateToken.grantRole(MINTER_ROLE, tournament.address);
  console.log("Minter roles granted");

  // 7. 保存部署信息
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      FateToken: fateToken.address,
      TowerNFT: towerNFT.address,
      PredictionMarket: predictionMarket.address,
      Staking: staking.address,
      Tournament: tournament.address
    }
  };

  const fs = require('fs');
  fs.writeFileSync(
    `deployments/${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(JSON.stringify(deploymentInfo.contracts, null, 2));

  // 8. 验证合约
  console.log("\n7. Verifying contracts...");
  await verifyContract(fateToken.address, []);
  await verifyContract(towerNFT.address, []);
  await verifyContract(predictionMarket.address, [fateToken.address]);
  await verifyContract(staking.address, [fateToken.address]);
  await verifyContract(tournament.address, [fateToken.address, towerNFT.address]);
}

async function verifyContract(address, constructorArguments) {
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`Contract ${address} verified successfully`);
  } catch (error) {
    console.error(`Failed to verify ${address}:`, error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 多链部署脚本
```javascript
// scripts/deploy-multichain.js
const networks = ['ethereum', 'polygon', 'bsc', 'arbitrum'];

async function deployToAllNetworks() {
  const deployments = {};

  for (const network of networks) {
    console.log(`\n🚀 Deploying to ${network}...`);

    try {
      // 切换到对应网络
      hre.changeNetwork(network);

      // 执行部署
      await hre.run('run', {
        script: 'scripts/deploy-mainnet.js',
        network: network
      });

      // 读取部署结果
      const deploymentFile = require(`../deployments/${network}-latest.json`);
      deployments[network] = deploymentFile.contracts;

      console.log(`✅ ${network} deployment completed`);
    } catch (error) {
      console.error(`❌ ${network} deployment failed:`, error.message);
      deployments[network] = { error: error.message };
    }
  }

  // 保存多链部署汇总
  fs.writeFileSync(
    `deployments/multichain-${Date.now()}.json`,
    JSON.stringify(deployments, null, 2)
  );

  return deployments;
}
```

### 2.3 部署检查清单

#### 部署前检查
- [ ] 合约已通过安全审计
- [ ] 测试网部署并测试完成
- [ ] 多签钱包已配置
- [ ] 部署账户有足够资金
- [ ] 环境变量已配置
- [ ] 回滚计划已准备

#### 部署中检查
- [ ] Gas价格监控
- [ ] 每笔交易确认
- [ ] 合约地址记录
- [ ] 权限配置验证

#### 部署后检查
- [ ] 合约源码验证
- [ ] 初始参数检查
- [ ] 权限配置审计
- [ ] 前端配置更新
- [ ] 监控告警配置

---

## 3. 前端部署

### 3.1 构建配置

```javascript
// next.config.js
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION,
    NEXT_PUBLIC_CHAIN_ID: process.env.CHAIN_ID,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### 3.2 部署流程

```bash
#!/bin/bash
# scripts/deploy-frontend.sh

set -e

echo "🚀 Starting frontend deployment..."

# 1. 安装依赖
echo "📦 Installing dependencies..."
npm ci

# 2. 运行测试
echo "🧪 Running tests..."
npm run test

# 3. 构建应用
echo "🔨 Building application..."
npm run build

# 4. 上传到 IPFS (可选)
if [ "$DEPLOY_TO_IPFS" = "true" ]; then
  echo "📤 Uploading to IPFS..."
  npx ipfs-deploy dist --pinata --cloudflare
fi

# 5. 部署到 Vercel
echo "🌐 Deploying to Vercel..."
npx vercel --prod --yes

# 6. 部署到 Cloudflare Pages
echo "☁️ Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=tower-of-fate

echo "✅ Frontend deployment completed!"
```

### 3.3 CDN 配置

```yaml
# cloudflare-config.yaml
zone_id: your_zone_id
rules:
  # 缓存静态资源
  - name: "Cache Static Assets"
    expression: '(http.request.uri.path contains ".js" or http.request.uri.path contains ".css" or http.request.uri.path contains ".png")'
    actions:
      cache_level: "cache_everything"
      edge_cache_ttl: 86400

  # API 请求不缓存
  - name: "No Cache API"
    expression: 'http.request.uri.path contains "/api/"'
    actions:
      cache_level: "bypass"

  # 安全头部
  - name: "Security Headers"
    expression: 'true'
    actions:
      response_headers:
        X-Frame-Options: "DENY"
        X-Content-Type-Options: "nosniff"
        Referrer-Policy: "strict-origin-when-cross-origin"
        Content-Security-Policy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

---

## 4. 后端部署

### 4.1 Docker 配置

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

# 安装安全更新
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 4.2 Kubernetes 配置

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tower-of-fate-api
  namespace: production
  labels:
    app: tower-of-fate-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: tower-of-fate-api
  template:
    metadata:
      labels:
        app: tower-of-fate-api
    spec:
      serviceAccountName: tower-of-fate
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: api
          image: toweroffate/api:v2.0.0
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: tower-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: tower-secrets
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: tower-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: tower-of-fate-api
  namespace: production
spec:
  selector:
    app: tower-of-fate-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tower-of-fate-api
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
    - hosts:
        - api.toweroffate.io
      secretName: tower-api-tls
  rules:
    - host: api.toweroffate.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tower-of-fate-api
                port:
                  number: 80
```

### 4.3 数据库迁移

```javascript
// scripts/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 创建迁移记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 获取已执行的迁移
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations'
    );
    const executedSet = new Set(executedMigrations.map(r => r.name));

    // 读取迁移文件
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      if (!executedSet.has(file)) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        console.log(`✅ Migration ${file} completed`);
      }
    }

    await client.query('COMMIT');
    console.log('All migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
```

---

## 5. 监控配置

### 5.1 Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'tower-api'
    static_configs:
      - targets: ['tower-of-fate-api:3000']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### 5.2 告警规则

```yaml
# rules/alerts.yml
groups:
  - name: tower-of-fate
    rules:
      # API 高错误率
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for the last 5 minutes"

      # API 高延迟
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "95th percentile latency is above 500ms"

      # 合约余额低
      - alert: LowContractBalance
        expr: contract_balance / 1e18 < 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Low contract balance"
          description: "Contract balance is below 10 ETH"

      # 数据库连接数高
      - alert: HighDBConnections
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database connections are above 80"

      # 区块链同步延迟
      - alert: BlockchainSyncDelay
        expr: blockchain_block_height - blockchain_synced_height > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Blockchain sync delay"
          description: "Blockchain is more than 10 blocks behind"
```

### 5.3 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Tower of Fate - Production",
    "panels": [
      {
        "title": "API Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Contract Balance",
        "type": "stat",
        "targets": [
          {
            "expr": "contract_balance / 1e18",
            "legendFormat": "ETH"
          }
        ]
      },
      {
        "title": "Transaction Volume",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(transactions_total[1h])",
            "legendFormat": "TX/s"
          }
        ]
      }
    ]
  }
}
```

### 5.4 日志聚合

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /tmp/loki
  storage:
    filesystem:
      chunks_directory: /tmp/loki/chunks
      rules_directory: /tmp/loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093

# Promtail 配置
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: tower-api-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: tower-api
          __path__: /var/log/tower/*.log
```

---

## 6. 灾难恢复

### 6.1 备份策略

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/tower-of-fate"
DATE=$(date +%Y%m%d_%H%M%S)

# 数据库备份
echo "Backing up database..."
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Redis 备份
echo "Backing up Redis..."
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# 合约状态备份
echo "Backing up contract states..."
node scripts/backup-contracts.js > "$BACKUP_DIR/contracts_$DATE.json"

# 上传到 S3
echo "Uploading to S3..."
aws s3 sync "$BACKUP_DIR" s3://tower-backups/production/

# 清理旧备份 (保留30天)
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 6.2 回滚程序

```bash
#!/bin/bash
# scripts/rollback.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

echo "🔄 Rolling back to version $VERSION..."

# 回滚合约 (通过代理)
echo "Rolling back contracts..."
node scripts/upgrade-contracts.js --rollback --version $VERSION

# 回滚后端
echo "Rolling back backend..."
kubectl set image deployment/tower-of-fate-api api=toweroffate/api:$VERSION -n production

# 回滚前端
echo "Rolling back frontend..."
vercel --version $VERSION --prod

echo "✅ Rollback completed"
```

---

## 7. 附录

### 7.1 部署命令速查

```bash
# 合约部署
npx hardhat run scripts/deploy-mainnet.js --network mainnet

# 前端部署
npm run build && npx vercel --prod

# 后端部署
docker build -t toweroffate/api:v2.0.0 .
docker push toweroffate/api:v2.0.0
kubectl apply -f k8s/

# 数据库迁移
node scripts/migrate.js

# 监控部署
kubectl apply -f monitoring/
```

### 7.2 相关文档

- [架构文档](./ARCHITECTURE_V2.md)
- [区块链集成](./BLOCKCHAIN_INTEGRATION.md)
- [商业化计划](./COMMERCIAL_PLAN.md)

---

*文档版本: 2.0.0*
*最后更新: 2026-03-10*
