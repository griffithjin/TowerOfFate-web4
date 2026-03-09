// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title GameEconomy
 * @dev Game Economy Contract for Tower of Fate V2.0
 * Handles deposits (USDT/BNB/ETH), withdrawals with multi-sig protection,
 * and in-game purchase records
 *
 * Supported Wallets:
 * - USDT (TRON): TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC
 * - BNB (BSC): 0x6b107f2a17f218df01367f94c4a77758ba9cb4df
 * - ETH (ETH): 0x6b107f2a17f218df01367f94c4a77758ba9cb4df
 * - SOL: BYQsmcAq16BQ1K7CUphfuQJephJrDNbm3NVXtsLG6tyN
 */
contract GameEconomy is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Supported token types
    enum TokenType {
        NATIVE,     // ETH, BNB (native chain tokens)
        USDT,       // USDT on various chains
        USDC,       // USDC stablecoin
        SOL         // Solana (handled off-chain)
    }

    // Deposit structure
    struct Deposit {
        address user;
        TokenType tokenType;
        uint256 amount;
        uint256 timestamp;
        string txHash;          // Transaction hash on source chain
        string sourceChain;     // Source blockchain
        bool confirmed;
    }

    // Purchase record structure
    struct Purchase {
        address user;
        string itemId;
        string itemName;
        uint256 price;
        TokenType paymentToken;
        uint256 timestamp;
        bool completed;
    }

    // Withdrawal request structure (multi-sig)
    struct WithdrawalRequest {
        address to;
        TokenType tokenType;
        uint256 amount;
        uint256 requestTime;
        uint256 confirmations;
        bool executed;
        mapping(address => bool) hasConfirmed;
    }

    // Token contract addresses
    mapping(TokenType => address) public tokenContracts;

    // Supported chains
    mapping(string => bool) public supportedChains;

    // Deposits mapping
    mapping(bytes32 => Deposit) public deposits;
    mapping(address => bytes32[]) public userDeposits;

    // Purchase records
    mapping(bytes32 => Purchase) public purchases;
    mapping(address => bytes32[]) public userPurchases;

    // Withdrawal requests
    mapping(bytes32 => WithdrawalRequest) public withdrawalRequests;
    bytes32[] public pendingWithdrawals;

    // Multi-sig signers
    mapping(address => bool) public isSigner;
    address[] public signers;
    uint256 public requiredConfirmations;

    // Game wallet addresses for each chain
    mapping(string => string) public gameWallets;

    // Deposit nonce for uniqueness
    uint256 public depositNonce;

    // Events
    event DepositReceived(
        bytes32 indexed depositId,
        address indexed user,
        TokenType tokenType,
        uint256 amount,
        string sourceChain,
        string txHash
    );
    event DepositConfirmed(bytes32 indexed depositId, address indexed confirmer);
    event PurchaseRecorded(
        bytes32 indexed purchaseId,
        address indexed user,
        string itemId,
        uint256 price,
        TokenType paymentToken
    );
    event WithdrawalRequested(
        bytes32 indexed requestId,
        address indexed to,
        TokenType tokenType,
        uint256 amount,
        address indexed requester
    );
    event WithdrawalConfirmed(bytes32 indexed requestId, address indexed confirmer);
    event WithdrawalExecuted(bytes32 indexed requestId, address indexed to, uint256 amount);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event TokenContractSet(TokenType indexed tokenType, address contractAddress);
    event GameWalletSet(string chain, string walletAddress);

    modifier onlySigner() {
        require(isSigner[msg.sender], "Economy: Not a signer");
        _;
    }

    constructor(
        address initialOwner,
        uint256 _requiredConfirmations
    ) Ownable(initialOwner) {
        requiredConfirmations = _requiredConfirmations;

        // Add owner as first signer
        isSigner[initialOwner] = true;
        signers.push(initialOwner);

        // Set supported chains
        supportedChains["ETH"] = true;
        supportedChains["BSC"] = true;
        supportedChains["TRON"] = true;
        supportedChains["SOLANA"] = true;
        supportedChains["POLYGON"] = true;
        supportedChains["ARBITRUM"] = true;
        supportedChains["OPTIMISM"] = true;

        // Set game wallet addresses
        gameWallets["TRON"] = "TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC";
        gameWallets["BSC"] = "0x6b107f2a17f218df01367f94c4a77758ba9cb4df";
        gameWallets["ETH"] = "0x6b107f2a17f218df01367f94c4a77758ba9cb4df";
        gameWallets["SOLANA"] = "BYQsmcAq16BQ1K7CUphfuQJephJrDNbm3NVXtsLG6tyN";
    }

    /**
     * @dev Record a deposit from user (called by oracle/backend after verifying cross-chain deposit)
     * @param user User address
     * @param tokenType Type of token deposited
     * @param amount Amount deposited
     * @param sourceChain Source blockchain
     * @param txHash Transaction hash on source chain
     */
    function recordDeposit(
        address user,
        TokenType tokenType,
        uint256 amount,
        string calldata sourceChain,
        string calldata txHash
    ) external onlySigner returns (bytes32 depositId) {
        require(user != address(0), "Economy: Invalid user address");
        require(amount > 0, "Economy: Invalid amount");
        require(supportedChains[sourceChain], "Economy: Unsupported chain");
        require(bytes(txHash).length > 0, "Economy: Invalid tx hash");

        depositNonce++;
        depositId = keccak256(abi.encodePacked(
            user,
            tokenType,
            amount,
            sourceChain,
            txHash,
            depositNonce,
            block.timestamp
        ));

        deposits[depositId] = Deposit({
            user: user,
            tokenType: tokenType,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash,
            sourceChain: sourceChain,
            confirmed: false
        });

        userDeposits[user].push(depositId);

        emit DepositReceived(depositId, user, tokenType, amount, sourceChain, txHash);

        // Auto-confirm by the recorder
        confirmDeposit(depositId);
    }

    /**
     * @dev Confirm a deposit (multi-sig)
     * @param depositId Deposit ID to confirm
     */
    function confirmDeposit(bytes32 depositId) public onlySigner {
        Deposit storage deposit = deposits[depositId];
        require(deposit.user != address(0), "Economy: Deposit not found");
        require(!deposit.confirmed, "Economy: Already confirmed");

        deposit.confirmed = true;

        emit DepositConfirmed(depositId, msg.sender);
    }

    /**
     * @dev Record an in-game purchase
     * @param user User address
     * @param itemId Item identifier
     * @param itemName Item name
     * @param price Purchase price
     * @param paymentToken Token type used for payment
     */
    function recordPurchase(
        address user,
        string calldata itemId,
        string calldata itemName,
        uint256 price,
        TokenType paymentToken
    ) external onlySigner returns (bytes32 purchaseId) {
        require(user != address(0), "Economy: Invalid user address");
        require(bytes(itemId).length > 0, "Economy: Invalid item ID");
        require(price > 0, "Economy: Invalid price");

        purchaseId = keccak256(abi.encodePacked(
            user,
            itemId,
            price,
            block.timestamp,
            block.number
        ));

        purchases[purchaseId] = Purchase({
            user: user,
            itemId: itemId,
            itemName: itemName,
            price: price,
            paymentToken: paymentToken,
            timestamp: block.timestamp,
            completed: true
        });

        userPurchases[user].push(purchaseId);

        emit PurchaseRecorded(purchaseId, user, itemId, price, paymentToken);
    }

    /**
     * @dev Request a withdrawal (initiates multi-sig process)
     * @param to Recipient address
     * @param tokenType Token type to withdraw
     * @param amount Amount to withdraw
     */
    function requestWithdrawal(
        address to,
        TokenType tokenType,
        uint256 amount
    ) external onlySigner returns (bytes32 requestId) {
        require(to != address(0), "Economy: Invalid recipient");
        require(amount > 0, "Economy: Invalid amount");

        requestId = keccak256(abi.encodePacked(
            to,
            tokenType,
            amount,
            block.timestamp,
            block.number
        ));

        WithdrawalRequest storage request = withdrawalRequests[requestId];
        request.to = to;
        request.tokenType = tokenType;
        request.amount = amount;
        request.requestTime = block.timestamp;
        request.confirmations = 0;
        request.executed = false;

        pendingWithdrawals.push(requestId);

        emit WithdrawalRequested(requestId, to, tokenType, amount, msg.sender);

        // Auto-confirm by requester
        confirmWithdrawal(requestId);
    }

    /**
     * @dev Confirm a withdrawal request (multi-sig)
     * @param requestId Request ID to confirm
     */
    function confirmWithdrawal(bytes32 requestId) public onlySigner {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.to != address(0), "Economy: Request not found");
        require(!request.executed, "Economy: Already executed");
        require(!request.hasConfirmed[msg.sender], "Economy: Already confirmed by this signer");

        request.hasConfirmed[msg.sender] = true;
        request.confirmations++;

        emit WithdrawalConfirmed(requestId, msg.sender);

        // Auto-execute if enough confirmations
        if (request.confirmations >= requiredConfirmations) {
            executeWithdrawal(requestId);
        }
    }

    /**
     * @dev Execute a withdrawal after sufficient confirmations
     * @param requestId Request ID to execute
     */
    function executeWithdrawal(bytes32 requestId) internal nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(!request.executed, "Economy: Already executed");
        require(request.confirmations >= requiredConfirmations, "Economy: Insufficient confirmations");

        request.executed = true;

        if (request.tokenType == TokenType.NATIVE) {
            // Native token (ETH/BNB)
            require(address(this).balance >= request.amount, "Economy: Insufficient native balance");
            (bool success, ) = payable(request.to).call{value: request.amount}("");
            require(success, "Economy: Native transfer failed");
        } else {
            // ERC20 token
            address tokenAddress = tokenContracts[request.tokenType];
            require(tokenAddress != address(0), "Economy: Token not supported");

            IERC20 token = IERC20(tokenAddress);
            require(
                token.balanceOf(address(this)) >= request.amount,
                "Economy: Insufficient token balance"
            );
            require(token.transfer(request.to, request.amount), "Economy: Token transfer failed");
        }

        emit WithdrawalExecuted(requestId, request.to, request.amount);
    }

    /**
     * @dev Deposit native tokens (ETH/BNB) directly to contract
     */
    function depositNative() external payable {
        require(msg.value > 0, "Economy: Must send native tokens");

        depositNonce++;
        bytes32 depositId = keccak256(abi.encodePacked(
            msg.sender,
            TokenType.NATIVE,
            msg.value,
            block.chainid,
            block.timestamp,
            depositNonce
        ));

        deposits[depositId] = Deposit({
            user: msg.sender,
            tokenType: TokenType.NATIVE,
            amount: msg.value,
            timestamp: block.timestamp,
            txHash: "",
            sourceChain: getCurrentChain(),
            confirmed: true
        });

        userDeposits[msg.sender].push(depositId);

        emit DepositReceived(
            depositId,
            msg.sender,
            TokenType.NATIVE,
            msg.value,
            getCurrentChain(),
            ""
        );
        emit DepositConfirmed(depositId, address(this));
    }

    /**
     * @dev Get current chain identifier
     */
    function getCurrentChain() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        if (chainId == 1) return "ETH";
        if (chainId == 56) return "BSC";
        if (chainId == 137) return "POLYGON";
        if (chainId == 42161) return "ARBITRUM";
        if (chainId == 10) return "OPTIMISM";
        return "UNKNOWN";
    }

    // Admin functions

    /**
     * @dev Add a signer (only owner)
     * @param signer Address to add as signer
     */
    function addSigner(address signer) external onlyOwner {
        require(signer != address(0), "Economy: Invalid address");
        require(!isSigner[signer], "Economy: Already a signer");

        isSigner[signer] = true;
        signers.push(signer);

        emit SignerAdded(signer);
    }

    /**
     * @dev Remove a signer (only owner)
     * @param signer Address to remove
     */
    function removeSigner(address signer) external onlyOwner {
        require(isSigner[signer], "Economy: Not a signer");
        require(signers.length > requiredConfirmations, "Economy: Cannot remove signer");

        isSigner[signer] = false;

        // Remove from signers array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        emit SignerRemoved(signer);
    }

    /**
     * @dev Set required confirmations (only owner)
     * @param newRequired New required confirmation count
     */
    function setRequiredConfirmations(uint256 newRequired) external onlyOwner {
        require(newRequired > 0, "Economy: Must be > 0");
        require(newRequired <= signers.length, "Economy: Cannot exceed signer count");
        requiredConfirmations = newRequired;
    }

    /**
     * @dev Set token contract address (only owner)
     * @param tokenType Token type
     * @param contractAddress Contract address
     */
    function setTokenContract(TokenType tokenType, address contractAddress) external onlyOwner {
        tokenContracts[tokenType] = contractAddress;
        emit TokenContractSet(tokenType, contractAddress);
    }

    /**
     * @dev Set game wallet address for a chain (only owner)
     * @param chain Chain identifier
     * @param walletAddress Wallet address
     */
    function setGameWallet(string calldata chain, string calldata walletAddress) external onlyOwner {
        gameWallets[chain] = walletAddress;
        emit GameWalletSet(chain, walletAddress);
    }

    /**
     * @dev Add supported chain (only owner)
     * @param chain Chain identifier
     */
    function addSupportedChain(string calldata chain) external onlyOwner {
        supportedChains[chain] = true;
    }

    /**
     * @dev Remove supported chain (only owner)
     * @param chain Chain identifier
     */
    function removeSupportedChain(string calldata chain) external onlyOwner {
        supportedChains[chain] = false;
    }

    // View functions

    /**
     * @dev Get user's deposit count
     * @param user User address
     */
    function getUserDepositCount(address user) external view returns (uint256) {
        return userDeposits[user].length;
    }

    /**
     * @dev Get user's purchase count
     * @param user User address
     */
    function getUserPurchaseCount(address user) external view returns (uint256) {
        return userPurchases[user].length;
    }

    /**
     * @dev Get pending withdrawal count
     */
    function getPendingWithdrawalCount() external view returns (uint256) {
        return pendingWithdrawals.length;
    }

    /**
     * @dev Get all signers
     */
    function getAllSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @dev Get contract native balance
     */
    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get contract token balance
     * @param tokenType Token type
     */
    function getTokenBalance(TokenType tokenType) external view returns (uint256) {
        address tokenAddress = tokenContracts[tokenType];
        if (tokenAddress == address(0)) return 0;
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    /**
     * @dev Emergency withdraw native tokens (only owner, for emergencies)
     */
    function emergencyWithdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Economy: No balance");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Economy: Withdraw failed");
    }

    /**
     * @dev Emergency withdraw ERC20 tokens (only owner, for emergencies)
     * @param tokenType Token type
     */
    function emergencyWithdrawToken(TokenType tokenType) external onlyOwner {
        address tokenAddress = tokenContracts[tokenType];
        require(tokenAddress != address(0), "Economy: Token not set");

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "Economy: No balance");

        require(token.transfer(owner(), balance), "Economy: Transfer failed");
    }

    receive() external payable {
        // Accept native token deposits
    }
}
