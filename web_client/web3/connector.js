/**
 * Tower of Fate - Web3 Wallet Connector
 * Multi-chain wallet integration supporting MetaMask, WalletConnect
 * Networks: Ethereum, BSC, Polygon
 * @version 2.0.0
 */

class WalletConnector {
  constructor() {
    this.provider = null;
    this.web3 = null;
    this.account = null;
    this.chainId = null;
    this.walletType = null;
    this.isConnected = false;

    // Supported networks
    this.networks = {
      1: {
        name: 'Ethereum Mainnet',
        chainId: '0x1',
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        currency: 'ETH',
        explorer: 'https://etherscan.io'
      },
      56: {
        name: 'BNB Smart Chain',
        chainId: '0x38',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        currency: 'BNB',
        explorer: 'https://bscscan.com'
      },
      137: {
        name: 'Polygon Mainnet',
        chainId: '0x89',
        rpcUrl: 'https://polygon-rpc.com',
        currency: 'MATIC',
        explorer: 'https://polygonscan.com'
      },
      97: {
        name: 'BSC Testnet',
        chainId: '0x61',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        currency: 'tBNB',
        explorer: 'https://testnet.bscscan.com'
      }
    };

    // WalletConnect configuration
    this.walletConnectConfig = {
      projectId: 'tower_of_fate_web3_v2',
      chains: [1, 56, 137],
      showQrModal: true,
      methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
      events: ['chainChanged', 'accountsChanged']
    };

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkExistingConnection();
  }

  setupEventListeners() {
    // MetaMask events
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        this.handleAccountsChanged(accounts);
      });

      window.ethereum.on('chainChanged', (chainId) => {
        this.handleChainChanged(chainId);
      });

      window.ethereum.on('disconnect', () => {
        this.handleDisconnect();
      });
    }

    // Custom events
    window.addEventListener('wallet:connect', (e) => this.connect(e.detail?.type || 'metamask'));
    window.addEventListener('wallet:disconnect', () => this.disconnect());
    window.addEventListener('wallet:switchNetwork', (e) => this.switchNetwork(e.detail?.chainId));
  }

  async checkExistingConnection() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.account = accounts[0];
          this.chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }));
          this.walletType = 'metamask';
          this.isConnected = true;
          this.provider = window.ethereum;
          this.emit('wallet:connected', {
            account: this.account,
            chainId: this.chainId,
            walletType: this.walletType
          });
        }
      } catch (error) {
        console.warn('Failed to check existing connection:', error);
      }
    }
  }

  async connect(walletType = 'metamask') {
    try {
      this.walletType = walletType;

      switch (walletType) {
        case 'metamask':
          await this.connectMetaMask();
          break;
        case 'walletconnect':
          await this.connectWalletConnect();
          break;
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      this.isConnected = true;
      this.emit('wallet:connected', {
        account: this.account,
        chainId: this.chainId,
        walletType: this.walletType
      });

      return {
        success: true,
        account: this.account,
        chainId: this.chainId,
        walletType: this.walletType
      };
    } catch (error) {
      this.emit('wallet:error', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  async connectMetaMask() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask extension.');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      this.account = accounts[0];
      this.chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }));
      this.provider = window.ethereum;

    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request.');
      }
      throw error;
    }
  }

  async connectWalletConnect() {
    // Dynamic import for WalletConnect
    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

      this.provider = await EthereumProvider.init({
        projectId: this.walletConnectConfig.projectId,
        chains: this.walletConnectConfig.chains,
        showQrModal: this.walletConnectConfig.showQrModal,
        methods: this.walletConnectConfig.methods,
        events: this.walletConnectConfig.events
      });

      await this.provider.enable();

      this.account = this.provider.accounts[0];
      this.chainId = this.provider.chainId;

      // Setup WalletConnect event listeners
      this.provider.on('accountsChanged', (accounts) => {
        this.handleAccountsChanged(accounts);
      });

      this.provider.on('chainChanged', (chainId) => {
        this.handleChainChanged(chainId);
      });

      this.provider.on('disconnect', () => {
        this.handleDisconnect();
      });

    } catch (error) {
      throw new Error(`WalletConnect failed: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      if (this.walletType === 'walletconnect' && this.provider) {
        await this.provider.disconnect();
      }
    } catch (error) {
      console.warn('Disconnect error:', error);
    }

    this.provider = null;
    this.account = null;
    this.chainId = null;
    this.walletType = null;
    this.isConnected = false;

    this.emit('wallet:disconnected', {});
  }

  async switchNetwork(targetChainId) {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    const network = this.networks[targetChainId];
    if (!network) {
      throw new Error(`Network ${targetChainId} not supported`);
    }

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }]
      });
    } catch (switchError) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: network.chainId,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              nativeCurrency: {
                name: network.currency,
                symbol: network.currency,
                decimals: 18
              },
              blockExplorerUrls: [network.explorer]
            }]
          });
        } catch (addError) {
          throw new Error(`Failed to add network: ${addError.message}`);
        }
      } else {
        throw switchError;
      }
    }
  }

  handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.handleDisconnect();
    } else {
      this.account = accounts[0];
      this.emit('wallet:accountChanged', { account: this.account });
    }
  }

  handleChainChanged(chainId) {
    this.chainId = parseInt(chainId);
    this.emit('wallet:chainChanged', { chainId: this.chainId });
  }

  handleDisconnect() {
    this.isConnected = false;
    this.emit('wallet:disconnected', {});
  }

  getNetworkName() {
    return this.networks[this.chainId]?.name || 'Unknown Network';
  }

  getExplorerUrl(txHash) {
    const explorer = this.networks[this.chainId]?.explorer;
    return explorer ? `${explorer}/tx/${txHash}` : null;
  }

  formatAddress(address, length = 6) {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  async getBalance() {
    if (!this.provider || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [this.account, 'latest']
      });
      return parseInt(balance, 16) / 1e18;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
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
const walletConnector = new WalletConnector();

// Also export class for custom instances
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WalletConnector, walletConnector };
}

// Browser global
if (typeof window !== 'undefined') {
  window.WalletConnector = WalletConnector;
  window.walletConnector = walletConnector;
}
