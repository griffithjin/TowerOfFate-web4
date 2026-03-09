/**
 * Tower of Fate - NFT Interaction Module
 * NFT querying, minting, trading, and metadata display
 * @version 2.0.0
 */

class NFTManager {
  constructor() {
    // Contract configurations
    this.contracts = {
      1: { // Ethereum Mainnet
        towerNFT: '0xTOWER_NFT_ETH_ADDRESS',
        marketplace: '0xMARKETPLACE_ETH_ADDRESS'
      },
      56: { // BSC Mainnet
        towerNFT: '0xTOWER_NFT_BSC_ADDRESS',
        marketplace: '0xMARKETPLACE_BSC_ADDRESS'
      },
      137: { // Polygon Mainnet
        towerNFT: '0xTOWER_NFT_POLYGON_ADDRESS',
        marketplace: '0xMARKETPLACE_POLYGON_ADDRESS'
      },
      97: { // BSC Testnet
        towerNFT: '0xTOWER_NFT_TESTNET_ADDRESS',
        marketplace: '0xMARKETPLACE_TESTNET_ADDRESS'
      }
    };

    // ERC721 ABI
    this.erc721Abi = [
      {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "ownerOf",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "address", "name": "from", "type": "address" },
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "tokenURI",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "uint256", "name": "index", "type": "uint256" }
        ],
        "name": "tokenOfOwnerByIndex",
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
        "inputs": [
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "string", "name": "uri", "type": "string" }
        ],
        "name": "mint",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "getApproved",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Marketplace ABI
    this.marketplaceAbi = [
      {
        "inputs": [
          { "internalType": "address", "name": "nftContract", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
          { "internalType": "uint256", "name": "price", "type": "uint256" }
        ],
        "name": "createListing",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "address", "name": "nftContract", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "buyItem",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "address", "name": "nftContract", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "cancelListing",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getActiveListings",
        "outputs": [{
          "components": [
            { "internalType": "address", "name": "seller", "type": "address" },
            { "internalType": "address", "name": "nftContract", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "uint256", "name": "price", "type": "uint256" },
            { "internalType": "bool", "name": "active", "type": "bool" }
          ],
          "internalType": "struct Marketplace.Listing[]",
          "name": "",
          "type": "tuple[]"
        }],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // NFT metadata cache
    this.metadataCache = new Map();
    this.nftCache = new Map();

    // IPFS gateway
    this.ipfsGateway = 'https://ipfs.io/ipfs/';
  }

  /**
   * Get NFT contract address for current network
   */
  getContractAddress(chainId, contractType = 'towerNFT') {
    const networkContracts = this.contracts[chainId];
    if (!networkContracts) {
      throw new Error(`Network ${chainId} not supported`);
    }
    return networkContracts[contractType];
  }

  /**
   * Query user's NFTs
   */
  async getUserNFTs(ownerAddress, chainId, options = {}) {
    try {
      const contractAddress = this.getContractAddress(chainId, 'towerNFT');

      // Get balance
      const balanceData = this.encodeFunctionData('balanceOf', [ownerAddress]);
      const balanceHex = await this.callContract(contractAddress, balanceData, chainId);
      const balance = parseInt(balanceHex, 16);

      if (balance === 0) {
        return { nfts: [], total: 0 };
      }

      const nfts = [];
      const batchSize = options.batchSize || 10;

      // Fetch token IDs in batches
      for (let i = 0; i < balance; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, balance); j++) {
          const tokenIdData = this.encodeFunctionData('tokenOfOwnerByIndex', [ownerAddress, j]);
          batch.push(this.callContract(contractAddress, tokenIdData, chainId));
        }

        const tokenIds = await Promise.all(batch);

        // Fetch metadata for each token
        for (const tokenIdHex of tokenIds) {
          const tokenId = parseInt(tokenIdHex, 16);
          const nft = await this.getNFTDetails(tokenId, contractAddress, chainId);
          nfts.push(nft);
        }
      }

      return {
        nfts: nfts.sort((a, b) => b.tokenId - a.tokenId),
        total: balance
      };

    } catch (error) {
      console.error('Failed to fetch user NFTs:', error);
      throw error;
    }
  }

  /**
   * Get NFT details
   */
  async getNFTDetails(tokenId, contractAddress, chainId) {
    const cacheKey = `${chainId}-${tokenId}`;

    if (this.nftCache.has(cacheKey)) {
      return this.nftCache.get(cacheKey);
    }

    try {
      // Get token URI
      const uriData = this.encodeFunctionData('tokenURI', [tokenId]);
      const tokenURI = await this.callContract(contractAddress, uriData, chainId);

      // Parse URI (remove padding if needed)
      const cleanURI = this.parseStringResponse(tokenURI);

      // Fetch metadata
      const metadata = await this.fetchMetadata(cleanURI);

      const nft = {
        tokenId,
        contractAddress,
        chainId,
        tokenURI: cleanURI,
        metadata,
        name: metadata?.name || `Tower NFT #${tokenId}`,
        description: metadata?.description || '',
        image: this.resolveIPFSUrl(metadata?.image),
        attributes: metadata?.attributes || [],
        rarity: this.calculateRarity(metadata?.attributes)
      };

      this.nftCache.set(cacheKey, nft);
      return nft;

    } catch (error) {
      console.error(`Failed to fetch NFT details for token ${tokenId}:`, error);
      return {
        tokenId,
        contractAddress,
        chainId,
        error: error.message,
        name: `Tower NFT #${tokenId}`,
        image: '/assets/images/nft-placeholder.png'
      };
    }
  }

  /**
   * Fetch metadata from URI
   */
  async fetchMetadata(uri) {
    if (!uri) return null;

    // Check cache
    if (this.metadataCache.has(uri)) {
      return this.metadataCache.get(uri);
    }

    try {
      const url = this.resolveIPFSUrl(uri);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const metadata = await response.json();
      this.metadataCache.set(uri, metadata);
      return metadata;

    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      return null;
    }
  }

  /**
   * Resolve IPFS URL
   */
  resolveIPFSUrl(url) {
    if (!url) return '';

    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', this.ipfsGateway);
    }

    if (url.startsWith('ar://')) {
      return url.replace('ar://', 'https://arweave.net/');
    }

    return url;
  }

  /**
   * Calculate NFT rarity score
   */
  calculateRarity(attributes) {
    if (!attributes || attributes.length === 0) return 'common';

    // Simple rarity calculation based on trait rarity
    let rarityScore = 0;

    for (const attr of attributes) {
      if (attr.rarity) {
        rarityScore += parseFloat(attr.rarity);
      }
    }

    if (rarityScore >= 90) return 'legendary';
    if (rarityScore >= 70) return 'epic';
    if (rarityScore >= 50) return 'rare';
    if (rarityScore >= 30) return 'uncommon';
    return 'common';
  }

  /**
   * Mint new NFT
   */
  async mintNFT(metadataURI, provider, options = {}) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const contractAddress = this.getContractAddress(chainId, 'towerNFT');

    try {
      const mintData = this.encodeFunctionData('mint', [provider.account, metadataURI]);

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: contractAddress,
          data: mintData,
          value: options.value ? '0x' + BigInt(options.value).toString(16) : '0x0'
        }]
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'NFT minting transaction submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transfer NFT
   */
  async transferNFT(tokenId, toAddress, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const contractAddress = this.getContractAddress(chainId, 'towerNFT');

    try {
      const transferData = this.encodeFunctionData(
        'safeTransferFrom',
        [provider.account, toAddress, tokenId]
      );

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: contractAddress,
          data: transferData
        }]
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'NFT transfer transaction submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List NFT for sale
   */
  async listNFT(tokenId, price, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const nftContract = this.getContractAddress(chainId, 'towerNFT');
    const marketplace = this.getContractAddress(chainId, 'marketplace');

    try {
      // First approve marketplace
      const approveData = this.encodeFunctionData('approve', [marketplace, tokenId]);

      await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: nftContract,
          data: approveData
        }]
      });

      // Then create listing
      const priceWei = '0x' + BigInt(Math.floor(price * 1e18)).toString(16);
      const listData = this.encodeFunctionData(
        'createListing',
        [nftContract, tokenId, priceWei]
      );

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: marketplace,
          data: listData
        }]
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'NFT listed successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buy NFT from marketplace
   */
  async buyNFT(tokenId, price, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const nftContract = this.getContractAddress(chainId, 'towerNFT');
    const marketplace = this.getContractAddress(chainId, 'marketplace');

    try {
      const priceWei = '0x' + BigInt(Math.floor(price * 1e18)).toString(16);
      const buyData = this.encodeFunctionData('buyItem', [nftContract, tokenId]);

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: marketplace,
          data: buyData,
          value: priceWei
        }]
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'Purchase transaction submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get marketplace listings
   */
  async getMarketplaceListings(chainId, filters = {}) {
    try {
      const marketplace = this.getContractAddress(chainId, 'marketplace');
      const listingsData = this.encodeFunctionData('getActiveListings', []);

      const result = await this.callContract(marketplace, listingsData, chainId);

      // Parse listings (this would need proper decoding based on ABI)
      const listings = this.parseListingsResponse(result);

      // Apply filters
      if (filters.minPrice) {
        listings.filter(l => l.price >= filters.minPrice);
      }
      if (filters.maxPrice) {
        listings.filter(l => l.price <= filters.maxPrice);
      }

      // Fetch NFT details for each listing
      const enrichedListings = await Promise.all(
        listings.map(async (listing) => {
          const nft = await this.getNFTDetails(
            listing.tokenId,
            listing.nftContract,
            chainId
          );
          return { ...listing, nft };
        })
      );

      return enrichedListings;

    } catch (error) {
      console.error('Failed to fetch marketplace listings:', error);
      return [];
    }
  }

  /**
   * Cancel NFT listing
   */
  async cancelListing(tokenId, provider) {
    if (!provider || !provider.account) {
      throw new Error('Wallet not connected');
    }

    const chainId = provider.chainId;
    const nftContract = this.getContractAddress(chainId, 'towerNFT');
    const marketplace = this.getContractAddress(chainId, 'marketplace');

    try {
      const cancelData = this.encodeFunctionData('cancelListing', [nftContract, tokenId]);

      const txHash = await provider.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: provider.account,
          to: marketplace,
          data: cancelData
        }]
      });

      return {
        success: true,
        txHash,
        status: 'pending',
        message: 'Listing cancelled'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Encode function call data
   */
  encodeFunctionData(functionName, params) {
    const functionAbi = this.erc721Abi.find(f => f.name === functionName);
    if (!functionAbi) {
      throw new Error(`Function ${functionName} not found in ABI`);
    }

    // Simple encoding (in production, use ethers.js or web3.js)
    const signature = this.getFunctionSignature(functionAbi);
    const encodedParams = params.map(p => this.encodeParam(p, functionAbi.inputs.find(i => i.name === p)?.type || 'address')).join('');

    return signature + encodedParams;
  }

  getFunctionSignature(functionAbi) {
    // This is a simplified version - use proper library in production
    const types = functionAbi.inputs.map(i => i.type).join(',');
    const signature = `${functionAbi.name}(${types})`;
    // Return first 4 bytes of keccak256 hash
    return '0x' + this.simpleHash(signature).slice(0, 8);
  }

  simpleHash(str) {
    // Placeholder - use proper hashing in production
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
    if (type === 'uint256') {
      return BigInt(param).toString(16).padStart(64, '0');
    }
    return param.toString().padStart(64, '0');
  }

  /**
   * Call contract method (read-only)
   */
  async callContract(contractAddress, data, chainId) {
    // This would use the provider to make eth_call
    // Placeholder implementation
    return '0x0';
  }

  /**
   * Parse string response from contract
   */
  parseStringResponse(hex) {
    if (!hex || hex === '0x') return '';

    // Remove 0x prefix and offset
    const clean = hex.slice(2);
    const offset = parseInt(clean.slice(0, 64), 16) * 2;
    const length = parseInt(clean.slice(offset, offset + 64), 16) * 2;
    const stringData = clean.slice(offset + 64, offset + 64 + length);

    // Convert hex to string
    let str = '';
    for (let i = 0; i < stringData.length; i += 2) {
      str += String.fromCharCode(parseInt(stringData.substr(i, 2), 16));
    }

    return str;
  }

  /**
   * Parse listings response
   */
  parseListingsResponse(hex) {
    // Placeholder - implement proper decoding
    return [];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.metadataCache.clear();
    this.nftCache.clear();
  }

  emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  on(eventName, callback) {
    window.addEventListener(eventName, (e) => callback(e.detail));
  }
}

// Export singleton instance
const nftManager = new NFTManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NFTManager, nftManager };
}

if (typeof window !== 'undefined') {
  window.NFTManager = NFTManager;
  window.nftManager = nftManager;
}
