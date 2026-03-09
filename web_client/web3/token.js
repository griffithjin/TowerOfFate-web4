/**
 * Tower of Fate - Token Interaction Module
 * $FATE token balance, staking, and rewards
 * @version 2.0.0
 */

class TokenManager {
  constructor() {
    // $FATE Token contract addresses
    this.tokenContracts = {
      1: '0xFATE_TOKEN_ETH_ADDRESS',      // Ethereum Mainnet
      56: '0xFATE_TOKEN_BSC_ADDRESS',     // BSC Mainnet
      137: '0xFATE_TOKEN_POLYGON_ADDRESS', // Polygon Mainnet
      97: '0xFATE_TOKEN_TESTNET_ADDRESS'  // BSC Testnet
    };

    // Staking contract addresses
    this.stakingContracts = {
      1: '0xFATE_STAKING_ETH_ADDRESS',
      56: '0xFATE_STAKING_BSC_ADDRESS',
      137: '0xFATE_STAKING_POLYGON_ADDRESS',
      97: '0xFATE_STAKING_TESTNET_ADDRESS'
    };

    // Token ABI (ERC20 + custom functions)
    this.tokenAbi = [
      // ERC20 Standard
      {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          { "name": "_to", "type": "address" },
          { "name": "_value", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          { "name": "_from", "type": "address" },
          { "name": "_to", "type": "address" },
          { "name": "_value", "type": "uint256" }
        ],
        "name": "transferFrom",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          { "name": "_spender", "type": "address" },
          { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          { "name": "_owner", "type": "address" },
          { "name": "_spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      // Custom $FATE functions
      {
        "constant": true,
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "earned",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "rewardRate",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalStaked",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Staking ABI
    this.stakingAbi = [
      {
        "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "stake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getReward",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "exit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "earned",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "rewardPerToken",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "lastTimeRewardApplicable",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "periodFinish",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "rewardRate",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Token info cache
    this.tokenInfo = {
      symbol: 'FATE',
      name: 'Fate Token',
      decimals: 18,
      totalSupply: null
    };

    // User data cache
    this.userCache = new Map();
    this.cacheExpiry = 30000; // 30 seconds
  }

  /**
   * Get token contract address for chain
   */
  getTokenContract(chainId) {
    const address = this.tokenContracts[chainId];
    if (!address) {
      throw new Error(`$FATE token not deployed on chain ${chainId}`);
    }
    return address;
  }

  /**
   * Get staking contract address for chain
   */
  getStakingContract(chainId) {
    const address = this.stakingContracts[chainId];
    if (!address) {
      throw new Error(`Staking not available on chain ${chainId}`);
    }
    return address;
  }

  /**
   * Get $FATE balance
   */
  async getBalance(address, chainId, provider) {
    const cacheKey = `balance-${address}-${chainId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const contractAddress = this.getTokenContract(chainId);

      const balanceData = this.encodeFunctionData('balanceOf', [address], this.tokenAbi);
      const result = await this.callContract(contractAddress, balanceData, provider);

      const balance = this.parseUint256(result);
      const formatted = this.fromWei(balance);

      const data = {
        raw: balance.toString(),
        formatted: formatted,
        symbol: this.tokenInfo.symbol
      };

      this.setCached(cacheKey, data);
      return data;

    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Get token info
   */
  async getTokenInfo(chainId, provider) {
    if (this.tokenInfo.totalSupply) {
      return this.tokenInfo;
    }

    try {
      const contractAddress = this.getTokenContract(chainId);

      const [nameData, symbolData, decimalsData, supplyData] = await Promise.all([
        this.callContract(contractAddress, this.encodeFunctionData('name', [], this.tokenAbi), provider),
        this.callContract(contractAddress, this.encodeFunctionData('symbol', [], this.tokenAbi), provider),
        this.callContract(contractAddress, this.encodeFunctionData('decimals', [], this.tokenAbi), provider),
        this.callContract(contractAddress, this.encodeFunctionData('totalSupply', [], this.tokenAbi), provider)
      ]);

      this.tokenInfo = {
        name: this.parseString(nameData) || 'Fate Token',
        symbol: this.parseString(symbolData) || 'FATE',
        decimals: parseInt(decimalsData, 16) || 18,
        totalSupply: this.fromWei(this.parseUint256(supplyData)),
        address: contractAddress
      };

      return this.tokenInfo;

    } catch (error) {
      console.error('Failed to get token info:', error);
      return this.tokenInfo;
    }
  }

  /**
   * Get staking info
   */
  async getStakingInfo(address, chainId, provider) {
    const cacheKey = `staking-${address}-${chainId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const stakingContract = this.getStakingContract(chainId);

      const [stakedData, earnedData, totalStakedData, rewardRateData] = await Promise.all([
        this.callContract(stakingContract, this.encodeFunctionData('balanceOf', [address], this.stakingAbi), provider),
        this.callContract(stakingContract, this.encodeFunctionData('earned', [address], this.stakingAbi), provider),
        this.callContract(stakingContract, this.encodeFunctionData('totalSupply', [], this.stakingAbi), provider),
        this.callContract(stakingContract, this.encodeFunctionData('rewardRate', [], this.stakingAbi), provider)
      ]);

      const staked = this.parseUint256(stakedData);
      const earned = this.parseUint256(earnedData);
      const totalStaked = this.parseUint256(totalStakedData);
      const rewardRate = this.parseUint256(rewardRateData);

      // Calculate APY (simplified)
      const apy = totalStaked > 0
        ? ((rewardRate * 365 * 24 * 60 * 60) / totalStaked * 100).toFixed(2)
        : '0';

      const data = {
        staked: {
          raw: staked.toString(),
          formatted: this.fromWei(staked)
        },
        earned: {
          raw: earned.toString(),
          formatted: this.fromWei(earned)
        },
        totalStaked: {
          raw: totalStaked.toString(),
          formatted: this.fromWei(totalStaked)
        },
        rewardRate: this.fromWei(rewardRate),
        apy: parseFloat(apy),
        canClaim: earned > 0
      };

      this.setCached(cacheKey, data);
      return data;

    } catch (error) {
      console.error('Failed to get staking info:', error);
      throw error;
    }
  }

  /**
   * Stake $FATE tokens
   */
  async stake(amount, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const tokenContract = this.getTokenContract(chainId);
    const stakingContract = this.getStakingContract(chainId);

    try {
      const amountWei = this.toWei(amount);

      // First approve staking contract
      const approveData = this.encodeFunctionData(
        'approve',
        [stakingContract, amountWei.toString()],
        this.tokenAbi
      );

      const approveTx = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: tokenContract,
          data: approveData
        }]
      });

      // Wait for approval (simplified - in production, wait for confirmation)
      await this.delay(3000);

      // Then stake
      const stakeData = this.encodeFunctionData(
        'stake',
        [amountWei.toString()],
        this.stakingAbi
      );

      const stakeTx = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: stakingContract,
          data: stakeData
        }]
      });

      // Clear cache
      this.clearUserCache(provider.account, chainId);

      this.emit('token:staked', {
        amount,
        txHash: stakeTx,
        status: 'pending'
      });

      return {
        success: true,
        approveTx,
        stakeTx,
        status: 'pending',
        message: 'Stake transaction submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unstake $FATE tokens
   */
  async unstake(amount, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const stakingContract = this.getStakingContract(chainId);

    try {
      const amountWei = this.toWei(amount);

      const withdrawData = this.encodeFunctionData(
        'withdraw',
        [amountWei.toString()],
        this.stakingAbi
      );

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: stakingContract,
          data: withdrawData
        }]
      });

      // Clear cache
      this.clearUserCache(provider.account, chainId);

      this.emit('token:unstaked', {
        amount,
        txHash,
        status: 'pending'
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'Unstake transaction submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Claim rewards
   */
  async claimRewards(provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const stakingContract = this.getStakingContract(chainId);

    try {
      const claimData = this.encodeFunctionData('getReward', [], this.stakingAbi);

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: stakingContract,
          data: claimData
        }]
      });

      // Clear cache
      this.clearUserCache(provider.account, chainId);

      this.emit('token:rewardsClaimed', {
        txHash,
        status: 'pending'
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'Reward claim submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Exit staking (withdraw all + claim rewards)
   */
  async exitStaking(provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const stakingContract = this.getStakingContract(chainId);

    try {
      const exitData = this.encodeFunctionData('exit', [], this.stakingAbi);

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: stakingContract,
          data: exitData
        }]
      });

      // Clear cache
      this.clearUserCache(provider.account, chainId);

      this.emit('token:exited', {
        txHash,
        status: 'pending'
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'Exit transaction submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transfer $FATE tokens
   */
  async transfer(to, amount, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const tokenContract = this.getTokenContract(chainId);

    try {
      const amountWei = this.toWei(amount);

      const transferData = this.encodeFunctionData(
        'transfer',
        [to, amountWei.toString()],
        this.tokenAbi
      );

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: tokenContract,
          data: transferData
        }]
      });

      // Clear cache
      this.clearUserCache(provider.account, chainId);

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'Transfer submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get allowance
   */
  async getAllowance(owner, spender, chainId, provider) {
    try {
      const contractAddress = this.getTokenContract(chainId);

      const allowanceData = this.encodeFunctionData(
        'allowance',
        [owner, spender],
        this.tokenAbi
      );

      const result = await this.callContract(contractAddress, allowanceData, provider);
      const allowance = this.parseUint256(result);

      return {
        raw: allowance.toString(),
        formatted: this.fromWei(allowance)
      };

    } catch (error) {
      console.error('Failed to get allowance:', error);
      return { raw: '0', formatted: '0' };
    }
  }

  /**
   * Approve spender
   */
  async approve(spender, amount, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const tokenContract = this.getTokenContract(chainId);

    try {
      const amountWei = this.toWei(amount);

      const approveData = this.encodeFunctionData(
        'approve',
        [spender, amountWei.toString()],
        this.tokenAbi
      );

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: tokenContract,
          data: approveData
        }]
      });

      return {
        success: true,
        txHash,
        status: 'pending'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate rewards projection
   */
  calculateRewardsProjection(stakedAmount, apy, days) {
    const dailyRate = apy / 365 / 100;
    const projectedRewards = stakedAmount * dailyRate * days;

    return {
      daily: stakedAmount * dailyRate,
      weekly: stakedAmount * dailyRate * 7,
      monthly: stakedAmount * dailyRate * 30,
      yearly: stakedAmount * (apy / 100),
      projection: projectedRewards
    };
  }

  // Helper methods

  encodeFunctionData(functionName, params, abi) {
    const functionAbi = abi.find(f => f.name === functionName);
    if (!functionAbi) {
      throw new Error(`Function ${functionName} not found in ABI`);
    }

    const signature = this.getFunctionSignature(functionAbi);
    const encodedParams = params.map((p, i) => {
      const type = functionAbi.inputs[i]?.type || 'address';
      return this.encodeParam(p, type);
    }).join('');

    return signature + encodedParams;
  }

  getFunctionSignature(functionAbi) {
    const types = functionAbi.inputs.map(i => i.type).join(',');
    const signature = `${functionAbi.name}(${types})`;
    return '0x' + this.keccak256(signature).slice(0, 8);
  }

  keccak256(str) {
    // Placeholder - use proper library in production
    // This should use ethers.js or web3.js keccak256
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  encodeParam(param, type) {
    if (type === 'address') {
      return param.slice(2).padStart(64, '0');
    }
    if (type.startsWith('uint')) {
      return BigInt(param).toString(16).padStart(64, '0');
    }
    return param.toString().padStart(64, '0');
  }

  async callContract(contractAddress, data, provider) {
    // Placeholder - implement actual contract call
    // This would use provider.request with eth_call
    return '0x0';
  }

  parseUint256(hex) {
    if (!hex || hex === '0x') return BigInt(0);
    return BigInt(hex);
  }

  parseString(hex) {
    if (!hex || hex === '0x') return '';
    // Simplified string parsing
    return hex;
  }

  toWei(amount) {
    return BigInt(Math.floor(amount * 1e18));
  }

  fromWei(wei) {
    if (typeof wei === 'string') {
      wei = BigInt(wei);
    }
    return Number(wei) / 1e18;
  }

  getCached(key) {
    const cached = this.userCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    this.userCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearUserCache(address, chainId) {
    const prefix = `${address}-${chainId}`;
    for (const key of this.userCache.keys()) {
      if (key.includes(prefix)) {
        this.userCache.delete(key);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  on(eventName, callback) {
    window.addEventListener(eventName, (e) => callback(e.detail));
  }
}

// Export singleton instance
const tokenManager = new TokenManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TokenManager, tokenManager };
}

if (typeof window !== 'undefined') {
  window.TokenManager = TokenManager;
  window.tokenManager = tokenManager;
}
