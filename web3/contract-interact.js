/**
 * Tower of Fate - Web4.0 Contract Interaction
 * 合约交互模块
 */

const { ethers } = require('ethers');

// 合约配置
const CONTRACT_CONFIG = {
  // $FATE Token 合约
  FATE_TOKEN: {
    address: '0x0000000000000000000000000000000000000000', // 需替换为实际地址
    abi: [
      'function balanceOf(address account) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function claimReward(uint256 amount) returns (bool)',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'event RewardClaimed(address indexed player, uint256 amount)'
    ]
  },

  // NFT 合约
  FATE_NFT: {
    address: '0x0000000000000000000000000000000000000000', // 需替换为实际地址
    abi: [
      'function mint(address to, string memory tokenURI) returns (uint256)',
      'function batchMint(address to, string[] memory tokenURIs) returns (uint256[])',
      'function balanceOf(address owner) view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function tokenURI(uint256 tokenId) view returns (string memory)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
    ]
  },

  // 游戏奖励分发合约
  REWARD_DISTRIBUTOR: {
    address: '0x0000000000000000000000000000000000000000', // 需替换为实际地址
    abi: [
      'function distributeFateReward(address player, uint256 amount)',
      'function distributeBatchRewards(address[] memory players, uint256[] memory amounts)',
      'function claimAccumulatedRewards()',
      'function getPendingRewards(address player) view returns (uint256)',
      'function getTotalDistributed() view returns (uint256)',
      'event RewardDistributed(address indexed player, uint256 amount)',
      'event BatchRewardDistributed(uint256 totalAmount, uint256 playerCount)'
    ]
  }
};

// 钱包配置
const WALLET_CONFIG = {
  USDT: 'TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC',
  BNB: '0x6b107f2a17f218df01367f94c4a77758ba9cb4df'
};

class ContractInteractor {
  constructor(providerUrl, privateKey = null) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);

    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
    } else {
      this.signer = this.provider;
    }

    // 初始化合约实例
    this.fateToken = new ethers.Contract(
      CONTRACT_CONFIG.FATE_TOKEN.address,
      CONTRACT_CONFIG.FATE_TOKEN.abi,
      this.signer
    );

    this.fateNFT = new ethers.Contract(
      CONTRACT_CONFIG.FATE_NFT.address,
      CONTRACT_CONFIG.FATE_NFT.abi,
      this.signer
    );

    this.rewardDistributor = new ethers.Contract(
      CONTRACT_CONFIG.REWARD_DISTRIBUTOR.address,
      CONTRACT_CONFIG.REWARD_DISTRIBUTOR.abi,
      this.signer
    );

    this.pendingTransactions = new Map();
  }

  /**
   * 设置合约地址
   * @param {string} fateToken - $FATE合约地址
   * @param {string} fateNFT - NFT合约地址
   * @param {string} rewardDistributor - 奖励分发合约地址
   */
  setContractAddresses(fateToken, fateNFT, rewardDistributor) {
    CONTRACT_CONFIG.FATE_TOKEN.address = fateToken;
    CONTRACT_CONFIG.FATE_NFT.address = fateNFT;
    CONTRACT_CONFIG.REWARD_DISTRIBUTOR.address = rewardDistributor;

    this.fateToken = new ethers.Contract(
      fateToken,
      CONTRACT_CONFIG.FATE_TOKEN.abi,
      this.signer
    );

    this.fateNFT = new ethers.Contract(
      fateNFT,
      CONTRACT_CONFIG.FATE_NFT.abi,
      this.signer
    );

    this.rewardDistributor = new ethers.Contract(
      rewardDistributor,
      CONTRACT_CONFIG.REWARD_DISTRIBUTOR.abi,
      this.signer
    );
  }

  // ==================== $FATE Token 交互 ====================

  /**
   * 查询$FATE余额
   * @param {string} address - 钱包地址
   * @returns {Promise<Object>} 余额信息
   */
  async getFateBalance(address) {
    try {
      const balance = await this.fateToken.balanceOf(address);
      return {
        success: true,
        address,
        balance: ethers.formatUnits(balance, 18),
        rawBalance: balance.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 领取$FATE奖励
   * @param {string} playerAddress - 玩家地址
   * @param {number} amount - 奖励数量
   * @returns {Promise<Object>} 交易结果
   */
  async claimFateReward(playerAddress, amount) {
    try {
      const amountWei = ethers.parseUnits(amount.toString(), 18);

      // 发送交易
      const tx = await this.rewardDistributor.distributeFateReward(
        playerAddress,
        amountWei
      );

      // 记录待确认交易
      this.pendingTransactions.set(tx.hash, {
        type: 'fate_reward',
        playerAddress,
        amount,
        timestamp: Date.now()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        status: 'pending',
        playerAddress,
        amount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量分发奖励
   * @param {Array} rewards - 奖励列表 [{address, amount}]
   * @returns {Promise<Object>} 交易结果
   */
  async batchDistributeRewards(rewards) {
    try {
      const addresses = rewards.map(r => r.address);
      const amounts = rewards.map(r =>
        ethers.parseUnits(r.amount.toString(), 18)
      );

      const tx = await this.rewardDistributor.distributeBatchRewards(
        addresses,
        amounts
      );

      this.pendingTransactions.set(tx.hash, {
        type: 'batch_reward',
        rewards,
        timestamp: Date.now()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        status: 'pending',
        playerCount: rewards.length,
        totalAmount: rewards.reduce((sum, r) => sum + r.amount, 0)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 查询待领取奖励
   * @param {string} playerAddress - 玩家地址
   * @returns {Promise<Object>} 待领取奖励
   */
  async getPendingRewards(playerAddress) {
    try {
      const pending = await this.rewardDistributor.getPendingRewards(playerAddress);
      return {
        success: true,
        address: playerAddress,
        pendingAmount: ethers.formatUnits(pending, 18),
        rawPending: pending.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== NFT 交互 ====================

  /**
   * 铸造NFT
   * @param {string} playerAddress - 玩家地址
   * @param {Object} nftMetadata - NFT元数据
   * @returns {Promise<Object>} 交易结果
   */
  async mintNFT(playerAddress, nftMetadata) {
    try {
      const tokenURI = this.generateTokenURI(nftMetadata);
      const tx = await this.fateNFT.mint(playerAddress, tokenURI);

      this.pendingTransactions.set(tx.hash, {
        type: 'nft_mint',
        playerAddress,
        metadata: nftMetadata,
        timestamp: Date.now()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        status: 'pending',
        playerAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量铸造NFT
   * @param {string} playerAddress - 玩家地址
   * @param {Array} nftsMetadata - NFT元数据列表
   * @returns {Promise<Object>} 交易结果
   */
  async batchMintNFT(playerAddress, nftsMetadata) {
    try {
      const tokenURIs = nftsMetadata.map(nft => this.generateTokenURI(nft));
      const tx = await this.fateNFT.batchMint(playerAddress, tokenURIs);

      this.pendingTransactions.set(tx.hash, {
        type: 'nft_batch_mint',
        playerAddress,
        count: nftsMetadata.length,
        timestamp: Date.now()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        status: 'pending',
        playerAddress,
        count: nftsMetadata.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 查询NFT余额
   * @param {string} address - 钱包地址
   * @returns {Promise<Object>} NFT余额
   */
  async getNFTBalance(address) {
    try {
      const balance = await this.fateNFT.balanceOf(address);
      return {
        success: true,
        address,
        balance: balance.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取玩家所有NFT
   * @param {string} address - 钱包地址
   * @returns {Promise<Object>} NFT列表
   */
  async getPlayerNFTs(address) {
    try {
      const balance = await this.fateNFT.balanceOf(address);
      const tokens = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await this.fateNFT.tokenOfOwnerByIndex(address, i);
        const tokenURI = await this.fateNFT.tokenURI(tokenId);
        tokens.push({
          tokenId: tokenId.toString(),
          tokenURI
        });
      }

      return {
        success: true,
        address,
        tokens,
        total: tokens.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== 交易确认 ====================

  /**
   * 确认交易
   * @param {string} txHash - 交易哈希
   * @param {number} confirmations - 确认数
   * @returns {Promise<Object>} 确认结果
   */
  async confirmTransaction(txHash, confirmations = 1) {
    try {
      const receipt = await this.provider.waitForTransaction(
        txHash,
        confirmations
      );

      const pendingTx = this.pendingTransactions.get(txHash);
      if (pendingTx) {
        this.pendingTransactions.delete(txHash);
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        confirmations,
        type: pendingTx?.type || 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 轮询交易状态
   * @param {string} txHash - 交易哈希
   * @param {number} maxAttempts - 最大尝试次数
   * @param {number} interval - 轮询间隔(ms)
   * @returns {Promise<Object>} 交易结果
   */
  async pollTransaction(txHash, maxAttempts = 30, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (receipt) {
        return {
          success: true,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status === 1 ? 'success' : 'failed',
          gasUsed: receipt.gasUsed.toString(),
          attempts: i + 1
        };
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return {
      success: false,
      error: 'Transaction confirmation timeout',
      attempts: maxAttempts
    };
  }

  /**
   * 获取待确认交易列表
   * @returns {Array} 待确认交易
   */
  getPendingTransactions() {
    return Array.from(this.pendingTransactions.entries()).map(([hash, data]) => ({
      hash,
      ...data
    }));
  }

  // ==================== 辅助方法 ====================

  /**
   * 生成Token URI
   * @param {Object} metadata - 元数据
   * @returns {string} Token URI
   */
  generateTokenURI(metadata) {
    const json = JSON.stringify({
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes || []
    });
    return `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
  }

  /**
   * 获取区块信息
   * @param {number} blockNumber - 区块号
   * @returns {Promise<Object>} 区块信息
   */
  async getBlockInfo(blockNumber = 'latest') {
    try {
      const block = await this.provider.getBlock(blockNumber);
      return {
        success: true,
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        transactions: block.transactions.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取Gas价格
   * @returns {Promise<Object>} Gas价格
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      return {
        success: true,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?
          ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = {
  ContractInteractor,
  CONTRACT_CONFIG,
  WALLET_CONFIG
};
