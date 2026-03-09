/**
 * Tower of Fate - Web3 Payment System
 * Supports 8 cryptocurrencies with address validation and transaction tracking
 * @version 2.0.0
 */

class PaymentSystem {
  constructor() {
    // Payment addresses configuration
    this.paymentAddresses = {
      USDT: {
        address: 'TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC',
        network: 'TRON',
        chainId: null,
        decimals: 6,
        symbol: 'USDT',
        name: 'Tether USD',
        icon: '💵',
        color: '#26A17B'
      },
      BNB: {
        address: '0x6b107f2a17f218df01367f94c4a77758ba9cb4df',
        network: 'BSC',
        chainId: 56,
        decimals: 18,
        symbol: 'BNB',
        name: 'BNB',
        icon: '🟡',
        color: '#F3BA2F'
      },
      ETH: {
        address: '0x6b107f2a17f218df01367f94c4a77758ba9cb4df',
        network: 'Ethereum',
        chainId: 1,
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        icon: '💎',
        color: '#627EEA'
      },
      SOL: {
        address: 'BYQsmcAq16BQ1K7CUphfuQJephJrDNbm3NVXtsLG6tyN',
        network: 'Solana',
        chainId: null,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
        icon: '🟣',
        color: '#14F195'
      },
      BTC: {
        address: 'bc1pnjg9z5el0xt3uzm82symufy3lm56x82vg75dv7xm4eqvvec6j45sx9xzs0',
        network: 'Bitcoin',
        chainId: null,
        decimals: 8,
        symbol: 'BTC',
        name: 'Bitcoin',
        icon: '🟠',
        color: '#F7931A'
      },
      MATIC: {
        address: '0x6b107f2a17f218df01367f94c4a77758ba9cb4df',
        network: 'Polygon',
        chainId: 137,
        decimals: 18,
        symbol: 'MATIC',
        name: 'Polygon',
        icon: '🟪',
        color: '#8247E5'
      },
      USDC: {
        address: '0x6b107f2a17f218df01367f94c4a77758ba9cb4df',
        network: 'Ethereum',
        chainId: 1,
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        icon: '💲',
        color: '#2775CA'
      },
      FATE: {
        address: '0x6b107f2a17f218df01367f94c4a77758ba9cb4df',
        network: 'BSC',
        chainId: 56,
        decimals: 18,
        symbol: 'FATE',
        name: 'Fate Token',
        icon: '🎲',
        color: '#FF6B6B'
      }
    };

    // ERC20 ABI for token transfers
    this.erc20Abi = [
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
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Token contract addresses (mainnet)
    this.tokenContracts = {
      USDT: {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum
        56: '0x55d398326f99059fF775485246999027B3197955', // BSC
        137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon
      },
      USDC: {
        1: '0xA0b86a33E6441e0A421e56E4773C3C4b0Db7E5b0', // Ethereum
        56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC
        137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // Polygon
      },
      FATE: {
        56: '0xFATE_TOKEN_CONTRACT_ADDRESS' // BSC - placeholder
      }
    };

    // Transaction tracking
    this.transactions = new Map();
    this.pollingInterval = null;

    this.init();
  }

  init() {
    this.startTransactionPolling();
  }

  /**
   * Validate cryptocurrency address
   */
  validateAddress(address, currency) {
    if (!address || typeof address !== 'string') {
      return { valid: false, error: 'Address is required' };
    }

    const validators = {
      ETH: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
      BNB: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
      MATIC: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
      USDT: (addr) => {
        // TRON address validation
        if (addr.startsWith('T') && addr.length === 34) return true;
        // EVM address validation
        return /^0x[a-fA-F0-9]{40}$/.test(addr);
      },
      USDC: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
      SOL: (addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr),
      BTC: (addr) => {
        // Legacy, SegWit, and Bech32 addresses
        return /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(addr);
      },
      FATE: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr)
    };

    const validator = validators[currency];
    if (!validator) {
      return { valid: false, error: `Unsupported currency: ${currency}` };
    }

    const valid = validator(address);
    return {
      valid,
      error: valid ? null : `Invalid ${currency} address format`
    };
  }

  /**
   * Get payment address for specific currency
   */
  getPaymentAddress(currency) {
    const config = this.paymentAddresses[currency.toUpperCase()];
    if (!config) {
      throw new Error(`Payment address not configured for ${currency}`);
    }
    return config;
  }

  /**
   * Copy address to clipboard
   */
  async copyAddress(currency) {
    try {
      const config = this.getPaymentAddress(currency);
      await navigator.clipboard.writeText(config.address);
      return { success: true, message: `${currency} address copied to clipboard` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate QR code data for payment
   */
  generateQRData(currency, amount = null) {
    const config = this.getPaymentAddress(currency);
    const { address, network } = config;

    let qrData = '';

    switch (network) {
      case 'Bitcoin':
        qrData = amount ? `bitcoin:${address}?amount=${amount}` : `bitcoin:${address}`;
        break;
      case 'Ethereum':
      case 'BSC':
      case 'Polygon':
        qrData = amount
          ? `ethereum:${address}?value=${amount}`
          : `ethereum:${address}`;
        break;
      case 'TRON':
        qrData = amount
          ? `tron:${address}?amount=${amount}`
          : `tron:${address}`;
        break;
      case 'Solana':
        qrData = amount
          ? `solana:${address}?amount=${amount}`
          : `solana:${address}`;
        break;
      default:
        qrData = address;
    }

    return qrData;
  }

  /**
   * Create payment transaction
   */
  async createPayment(currency, amount, fromAddress = null) {
    const config = this.getPaymentAddress(currency);
    const validation = this.validateAddress(config.address, currency);

    if (!validation.valid) {
      throw new Error(`Invalid payment address: ${validation.error}`);
    }

    const txId = this.generateTxId();
    const transaction = {
      id: txId,
      currency,
      amount,
      fromAddress,
      toAddress: config.address,
      status: 'pending',
      timestamp: Date.now(),
      network: config.network,
      confirmations: 0
    };

    this.transactions.set(txId, transaction);
    this.emit('payment:created', transaction);

    return transaction;
  }

  /**
   * Execute on-chain payment (requires connected wallet)
   */
  async executeOnChainPayment(currency, amount, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const config = this.getPaymentAddress(currency);
    const { chainId } = config;

    // Check if on correct network
    if (chainId && provider.chainId !== chainId) {
      await provider.switchNetwork(chainId);
    }

    const txId = this.generateTxId();

    try {
      let txHash;

      if (['ETH', 'BNB', 'MATIC'].includes(currency)) {
        // Native token transfer
        const value = this.toWei(amount, config.decimals);
        txHash = await provider.provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: provider.account,
            to: config.address,
            value: '0x' + BigInt(value).toString(16)
          }]
        });
      } else {
        // ERC20 token transfer
        txHash = await this.executeTokenTransfer(
          currency,
          config.address,
          amount,
          provider
        );
      }

      const transaction = {
        id: txId,
        currency,
        amount,
        fromAddress: provider.account,
        toAddress: config.address,
        txHash,
        status: 'submitted',
        timestamp: Date.now(),
        network: config.network,
        confirmations: 0
      };

      this.transactions.set(txId, transaction);
      this.trackTransaction(txId, txHash, config.network);

      this.emit('payment:submitted', transaction);
      return transaction;

    } catch (error) {
      const failedTx = {
        id: txId,
        currency,
        amount,
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      };
      this.transactions.set(txId, failedTx);
      this.emit('payment:failed', failedTx);
      throw error;
    }
  }

  /**
   * Execute ERC20 token transfer
   */
  async executeTokenTransfer(currency, to, amount, provider) {
    const contractAddress = this.tokenContracts[currency]?.[provider.chainId];
    if (!contractAddress) {
      throw new Error(`${currency} not supported on current network`);
    }

    const config = this.paymentAddresses[currency];
    const value = this.toWei(amount, config.decimals);

    // Encode transfer function call
    const data = this.encodeTransferData(to, value);

    return await provider.provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: provider.account,
        to: contractAddress,
        data
      }]
    });
  }

  /**
   * Encode ERC20 transfer function data
   */
  encodeTransferData(to, value) {
    // Simple encoding for transfer(address,uint256)
    const methodId = '0xa9059cbb';
    const paddedAddress = to.slice(2).padStart(64, '0');
    const paddedValue = BigInt(value).toString(16).padStart(64, '0');
    return methodId + paddedAddress + paddedValue;
  }

  /**
   * Track transaction status
   */
  trackTransaction(txId, txHash, network) {
    const transaction = this.transactions.get(txId);
    if (!transaction) return;

    transaction.txHash = txHash;
    transaction.status = 'pending';

    // Start polling for confirmation
    this.pollTransactionStatus(txId, txHash, network);
  }

  /**
   * Poll for transaction status
   */
  async pollTransactionStatus(txId, txHash, network) {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      attempts++;

      try {
        const status = await this.getTransactionStatus(txHash, network);
        const transaction = this.transactions.get(txId);

        if (!transaction) return;

        transaction.confirmations = status.confirmations;
        transaction.status = status.status;

        if (status.status === 'confirmed') {
          this.emit('payment:confirmed', transaction);
        } else if (status.status === 'failed') {
          this.emit('payment:failed', transaction);
        } else if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        }

        this.transactions.set(txId, transaction);

      } catch (error) {
        console.error('Transaction polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        }
      }
    };

    checkStatus();
  }

  /**
   * Get transaction status from network
   */
  async getTransactionStatus(txHash, network) {
    // This would integrate with actual blockchain APIs
    // For now, return mock status
    return {
      status: 'pending',
      confirmations: 0,
      blockNumber: null
    };
  }

  /**
   * Get all transactions
   */
  getTransactions(filters = {}) {
    let txs = Array.from(this.transactions.values());

    if (filters.currency) {
      txs = txs.filter(tx => tx.currency === filters.currency);
    }

    if (filters.status) {
      txs = txs.filter(tx => tx.status === filters.status);
    }

    if (filters.from) {
      txs = txs.filter(tx => tx.timestamp >= filters.from);
    }

    if (filters.to) {
      txs = txs.filter(tx => tx.timestamp <= filters.to);
    }

    return txs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transaction by ID
   */
  getTransaction(txId) {
    return this.transactions.get(txId);
  }

  /**
   * Convert amount to wei
   */
  toWei(amount, decimals = 18) {
    return BigInt(Math.floor(amount * Math.pow(10, decimals)));
  }

  /**
   * Convert wei to amount
   */
  fromWei(wei, decimals = 18) {
    return Number(wei) / Math.pow(10, decimals);
  }

  /**
   * Format currency amount
   */
  formatAmount(amount, currency) {
    const config = this.paymentAddresses[currency];
    if (!config) return amount.toString();

    return amount.toFixed(config.decimals > 8 ? 4 : 8);
  }

  /**
   * Generate unique transaction ID
   */
  generateTxId() {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Start transaction polling
   */
  startTransactionPolling() {
    // Cleanup old transactions periodically
    this.pollingInterval = setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      for (const [id, tx] of this.transactions) {
        if (tx.timestamp < cutoff && tx.status !== 'pending') {
          this.transactions.delete(id);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Stop transaction polling
   */
  stopTransactionPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies() {
    return Object.keys(this.paymentAddresses).map(key => ({
      symbol: key,
      ...this.paymentAddresses[key]
    }));
  }

  emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  on(eventName, callback) {
    window.addEventListener(eventName, (e) => callback(e.detail));
  }

  off(eventName, callback) {
    window.removeEventListener(eventName, callback);
  }
}

// Export singleton instance
const paymentSystem = new PaymentSystem();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PaymentSystem, paymentSystem };
}

if (typeof window !== 'undefined') {
  window.PaymentSystem = PaymentSystem;
  window.paymentSystem = paymentSystem;
}
