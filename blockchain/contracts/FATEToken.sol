// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title FATEToken
 * @dev $FATE Game Token for Tower of Fate V2.0
 * Total Supply: 1 Billion (1,000,000,000)
 * Features: Staking with 10% APY, Game Rewards Distribution
 */
contract FATEToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    using Math for uint256;

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens
    uint256 public constant ANNUAL_PERCENTAGE_YIELD = 1000; // 10% APY (in basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Staking structure
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 accumulatedRewards;
    }

    // Mapping of user stakes
    mapping(address => Stake) public stakes;

    // Total staked amount
    uint256 public totalStaked;

    // Game reward pool
    uint256 public gameRewardPool;

    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 rewards, uint256 timestamp);
    event GameRewardDistributed(address indexed player, uint256 amount, string gameSessionId);
    event RewardPoolFunded(address indexed funder, uint256 amount);

    constructor(address initialOwner) ERC20("FATE Token", "FATE") Ownable(initialOwner) {
        _mint(initialOwner, TOTAL_SUPPLY);
    }

    /**
     * @dev Stake tokens to earn rewards
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "FATE: Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "FATE: Insufficient balance");

        Stake storage userStake = stakes[msg.sender];

        // If user already has a stake, claim pending rewards first
        if (userStake.amount > 0) {
            uint256 pendingRewards = calculatePendingRewards(msg.sender);
            userStake.accumulatedRewards += pendingRewards;
        }

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);

        // Update stake info
        userStake.amount += amount;
        userStake.startTime = block.timestamp;
        userStake.lastClaimTime = block.timestamp;

        totalStaked += amount;

        emit Staked(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Unstake tokens and claim rewards
     * @param amount Amount of tokens to unstake (0 for all)
     */
    function unstake(uint256 amount) external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "FATE: No active stake");

        uint256 unstakeAmount = amount == 0 ? userStake.amount : amount;
        require(unstakeAmount <= userStake.amount, "FATE: Insufficient staked amount");

        // Calculate and claim pending rewards
        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        uint256 totalRewards = userStake.accumulatedRewards + pendingRewards;

        // Update stake info
        userStake.amount -= unstakeAmount;
        userStake.lastClaimTime = block.timestamp;
        userStake.accumulatedRewards = 0;

        if (userStake.amount == 0) {
            userStake.startTime = 0;
        }

        totalStaked -= unstakeAmount;

        // Return staked tokens
        _transfer(address(this), msg.sender, unstakeAmount);

        // Mint rewards
        if (totalRewards > 0) {
            _mint(msg.sender, totalRewards);
        }

        emit Unstaked(msg.sender, unstakeAmount, totalRewards, block.timestamp);
    }

    /**
     * @dev Claim staking rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "FATE: No active stake");

        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        uint256 totalRewards = userStake.accumulatedRewards + pendingRewards;
        require(totalRewards > 0, "FATE: No rewards to claim");

        userStake.accumulatedRewards = 0;
        userStake.lastClaimTime = block.timestamp;

        _mint(msg.sender, totalRewards);

        emit RewardsClaimed(msg.sender, totalRewards, block.timestamp);
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user Address of the user
     * @return Pending rewards amount
     */
    function calculatePendingRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - userStake.lastClaimTime;
        uint256 annualReward = (userStake.amount * ANNUAL_PERCENTAGE_YIELD) / BASIS_POINTS;
        uint256 reward = (annualReward * timeElapsed) / SECONDS_PER_YEAR;

        return reward;
    }

    /**
     * @dev Get full stake info for a user
     * @param user Address of the user
     */
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 accumulatedRewards,
        uint256 pendingRewards
    ) {
        Stake memory userStake = stakes[user];
        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastClaimTime,
            userStake.accumulatedRewards,
            calculatePendingRewards(user)
        );
    }

    /**
     * @dev Distribute game rewards to players (only owner)
     * @param player Address of the player
     * @param amount Amount of tokens to reward
     * @param gameSessionId Unique game session identifier
     */
    function distributeGameReward(
        address player,
        uint256 amount,
        string calldata gameSessionId
    ) external onlyOwner {
        require(player != address(0), "FATE: Invalid player address");
        require(amount > 0, "FATE: Invalid reward amount");
        require(amount <= gameRewardPool, "FATE: Insufficient reward pool");

        gameRewardPool -= amount;
        _mint(player, amount);

        emit GameRewardDistributed(player, amount, gameSessionId);
    }

    /**
     * @dev Fund the game reward pool
     * @param amount Amount of tokens to add to the pool
     */
    function fundRewardPool(uint256 amount) external {
        require(amount > 0, "FATE: Invalid amount");
        require(balanceOf(msg.sender) >= amount, "FATE: Insufficient balance");

        _transfer(msg.sender, address(this), amount);
        gameRewardPool += amount;

        emit RewardPoolFunded(msg.sender, amount);
    }

    /**
     * @dev Batch distribute rewards to multiple players
     * @param players Array of player addresses
     * @param amounts Array of reward amounts
     * @param gameSessionIds Array of game session IDs
     */
    function batchDistributeRewards(
        address[] calldata players,
        uint256[] calldata amounts,
        string[] calldata gameSessionIds
    ) external onlyOwner {
        require(
            players.length == amounts.length && amounts.length == gameSessionIds.length,
            "FATE: Array length mismatch"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalAmount <= gameRewardPool, "FATE: Insufficient reward pool");

        for (uint256 i = 0; i < players.length; i++) {
            gameRewardPool -= amounts[i];
            _mint(players[i], amounts[i]);
            emit GameRewardDistributed(players[i], amounts[i], gameSessionIds[i]);
        }
    }

    /**
     * @dev Burn tokens from the reward pool (for deflationary mechanics)
     * @param amount Amount to burn
     */
    function burnFromRewardPool(uint256 amount) external onlyOwner {
        require(amount <= gameRewardPool, "FATE: Insufficient reward pool");
        gameRewardPool -= amount;
        _burn(address(this), amount);
    }

    /**
     * @dev Get current reward pool balance
     */
    function getRewardPoolBalance() external view returns (uint256) {
        return gameRewardPool;
    }

    /**
     * @dev Get total staked amount
     */
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    /**
     * @dev Get staking APY
     */
    function getAPY() external pure returns (uint256) {
        return ANNUAL_PERCENTAGE_YIELD;
    }
}
