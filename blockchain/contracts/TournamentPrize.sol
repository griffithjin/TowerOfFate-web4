// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title TournamentPrize
 * @dev Tournament Prize Pool Contract for Tower of Fate V2.0
 * Manages prize pools, automatic distribution logic, and leaderboard attestation
 *
 * Supported Wallets:
 * - USDT (TRON): TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC
 * - BNB (BSC): 0x6b107f2a17f218df01367f94c4a77758ba9cb4df
 * - ETH (ETH): 0x6b107f2a17f218df01367f94c4a77758ba9cb4df
 * - SOL: BYQsmcAq16BQ1K7CUphfuQJephJrDNbm3NVXtsLG6tyN
 */
contract TournamentPrize is Ownable, ReentrancyGuard, Pausable {
    using Math for uint256;

    // Tournament status
    enum TournamentStatus {
        PENDING,      // Tournament created, registration open
        ACTIVE,       // Tournament in progress
        ENDED,        // Tournament ended, prizes not yet distributed
        DISTRIBUTED,  // Prizes distributed
        CANCELLED     // Tournament cancelled
    }

    // Prize distribution model
    enum DistributionModel {
        WINNER_TAKES_ALL,    // 100% to 1st place
        TOP_THREE,           // 50/30/20 split
        TOP_FIVE,            // 40/25/15/12/8 split
        TOP_TEN,             // 30/20/15/10/8/6/5/3/2/1 split
        CUSTOM               // Custom distribution
    }

    // Tournament structure
    struct Tournament {
        string tournamentId;
        string name;
        uint256 startTime;
        uint256 endTime;
        uint256 entryFee;
        uint256 totalPrizePool;
        uint256 participantCount;
        TournamentStatus status;
        DistributionModel distributionModel;
        address prizeToken;
        bool exists;
    }

    // Leaderboard entry
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 rank;
        uint256 prize;
        bool claimed;
    }

    // Prize distribution percentages (in basis points, 10000 = 100%)
    mapping(DistributionModel => uint256[]) public distributionPercentages;

    // Tournaments mapping
    mapping(bytes32 => Tournament) public tournaments;
    mapping(string => bytes32) public tournamentIdToKey;
    bytes32[] public tournamentList;

    // Leaderboards mapping: tournamentKey => rank => entry
    mapping(bytes32 => mapping(uint256 => LeaderboardEntry)) public leaderboards;

    // Player tournament history: player => tournamentKey[]
    mapping(address => bytes32[]) public playerTournaments;

    // Prize claims: tournamentKey => player => claimed
    mapping(bytes32 => mapping(address => bool)) public prizesClaimed;

    // Platform fee (in basis points, default 5%)
    uint256 public platformFeePercent = 500;
    uint256 public constant BASIS_POINTS = 10000;

    // Platform fee recipient
    address public feeRecipient;

    // Minimum tournament duration
    uint256 public constant MIN_TOURNAMENT_DURATION = 1 hours;

    // Maximum tournament duration
    uint256 public constant MAX_TOURNAMENT_DURATION = 30 days;

    // Events
    event TournamentCreated(
        bytes32 indexed tournamentKey,
        string tournamentId,
        string name,
        uint256 startTime,
        uint256 endTime,
        uint256 entryFee,
        DistributionModel distributionModel
    );
    event TournamentStarted(bytes32 indexed tournamentKey, uint256 startTime);
    event TournamentEnded(bytes32 indexed tournamentKey, uint256 endTime, uint256 finalPrizePool);
    event LeaderboardSubmitted(
        bytes32 indexed tournamentKey,
        address[] players,
        uint256[] scores,
        uint256[] ranks
    );
    event PrizeDistributed(
        bytes32 indexed tournamentKey,
        address indexed player,
        uint256 rank,
        uint256 prize
    );
    event PrizeClaimed(
        bytes32 indexed tournamentKey,
        address indexed player,
        uint256 prize
    );
    event PrizePoolFunded(
        bytes32 indexed tournamentKey,
        address indexed funder,
        uint256 amount
    );
    event PlatformFeeUpdated(uint256 newFeePercent);
    event FeeRecipientUpdated(address newRecipient);
    event TournamentCancelled(bytes32 indexed tournamentKey, string reason);

    constructor(address initialOwner, address _feeRecipient) Ownable(initialOwner) {
        feeRecipient = _feeRecipient;

        // Initialize distribution models
        // WINNER_TAKES_ALL: 100%
        distributionPercentages[DistributionModel.WINNER_TAKES_ALL] = [10000];

        // TOP_THREE: 50%, 30%, 20%
        distributionPercentages[DistributionModel.TOP_THREE] = [5000, 3000, 2000];

        // TOP_FIVE: 40%, 25%, 15%, 12%, 8%
        distributionPercentages[DistributionModel.TOP_FIVE] = [4000, 2500, 1500, 1200, 800];

        // TOP_TEN: 30%, 20%, 15%, 10%, 8%, 6%, 5%, 3%, 2%, 1%
        distributionPercentages[DistributionModel.TOP_TEN] = [
            3000, 2000, 1500, 1000, 800, 600, 500, 300, 200, 100
        ];
    }

    /**
     * @dev Create a new tournament
     * @param tournamentId Unique tournament identifier
     * @param name Tournament name
     * @param startTime Tournament start timestamp
     * @param endTime Tournament end timestamp
     * @param entryFee Entry fee amount
     * @param distributionModel Prize distribution model
     * @param prizeToken Token address for prizes (address(0) for native)
     */
    function createTournament(
        string calldata tournamentId,
        string calldata name,
        uint256 startTime,
        uint256 endTime,
        uint256 entryFee,
        DistributionModel distributionModel,
        address prizeToken
    ) external onlyOwner whenNotPaused returns (bytes32 tournamentKey) {
        require(bytes(tournamentId).length > 0, "Prize: Invalid tournament ID");
        require(tournamentIdToKey[tournamentId] == bytes32(0), "Prize: Tournament ID exists");
        require(startTime > block.timestamp, "Prize: Start time must be future");
        require(
            endTime >= startTime + MIN_TOURNAMENT_DURATION,
            "Prize: Duration too short"
        );
        require(
            endTime <= startTime + MAX_TOURNAMENT_DURATION,
            "Prize: Duration too long"
        );

        tournamentKey = keccak256(abi.encodePacked(tournamentId, block.timestamp, msg.sender));

        tournaments[tournamentKey] = Tournament({
            tournamentId: tournamentId,
            name: name,
            startTime: startTime,
            endTime: endTime,
            entryFee: entryFee,
            totalPrizePool: 0,
            participantCount: 0,
            status: TournamentStatus.PENDING,
            distributionModel: distributionModel,
            prizeToken: prizeToken,
            exists: true
        });

        tournamentIdToKey[tournamentId] = tournamentKey;
        tournamentList.push(tournamentKey);

        emit TournamentCreated(
            tournamentKey,
            tournamentId,
            name,
            startTime,
            endTime,
            entryFee,
            distributionModel
        );
    }

    /**
     * @dev Fund prize pool for a tournament
     * @param tournamentKey Tournament key
     */
    function fundPrizePool(bytes32 tournamentKey) external payable nonReentrant whenNotPaused {
        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(
            tournament.status == TournamentStatus.PENDING ||
            tournament.status == TournamentStatus.ACTIVE,
            "Prize: Tournament not active"
        );

        if (tournament.prizeToken == address(0)) {
            // Native token
            require(msg.value > 0, "Prize: Must send native tokens");
            tournament.totalPrizePool += msg.value;
            emit PrizePoolFunded(tournamentKey, msg.sender, msg.value);
        } else {
            // ERC20 token - requires approval
            require(msg.value == 0, "Prize: Do not send native tokens");
            // Token transfer handled separately via approve/transferFrom
        }
    }

    /**
     * @dev Fund prize pool with ERC20 tokens
     * @param tournamentKey Tournament key
     * @param amount Amount to fund
     */
    function fundPrizePoolERC20(
        bytes32 tournamentKey,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Prize: Invalid amount");

        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(tournament.prizeToken != address(0), "Prize: Use native token funding");

        IERC20 token = IERC20(tournament.prizeToken);
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Prize: Transfer failed"
        );

        tournament.totalPrizePool += amount;

        emit PrizePoolFunded(tournamentKey, msg.sender, amount);
    }

    /**
     * @dev Start tournament
     * @param tournamentKey Tournament key
     */
    function startTournament(bytes32 tournamentKey) external onlyOwner {
        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(tournament.status == TournamentStatus.PENDING, "Prize: Invalid status");
        require(block.timestamp >= tournament.startTime, "Prize: Too early to start");

        tournament.status = TournamentStatus.ACTIVE;

        emit TournamentStarted(tournamentKey, block.timestamp);
    }

    /**
     * @dev End tournament and submit leaderboard
     * @param tournamentKey Tournament key
     * @param players Array of player addresses
     * @param scores Array of player scores
     * @param ranks Array of player ranks (1-based)
     */
    function endTournament(
        bytes32 tournamentKey,
        address[] calldata players,
        uint256[] calldata scores,
        uint256[] calldata ranks
    ) external onlyOwner {
        require(
            players.length == scores.length && scores.length == ranks.length,
            "Prize: Array length mismatch"
        );

        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(tournament.status == TournamentStatus.ACTIVE, "Prize: Tournament not active");
        require(block.timestamp >= tournament.endTime, "Prize: Too early to end");

        tournament.status = TournamentStatus.ENDED;
        tournament.participantCount = players.length;

        // Calculate and store prizes
        uint256[] memory percentages = distributionPercentages[tournament.distributionModel];
        uint256 prizePoolAfterFee = (tournament.totalPrizePool * (BASIS_POINTS - platformFeePercent)) / BASIS_POINTS;

        for (uint256 i = 0; i < players.length; i++) {
            uint256 rank = ranks[i];
            uint256 prize = 0;

            if (rank > 0 && rank <= percentages.length) {
                prize = (prizePoolAfterFee * percentages[rank - 1]) / BASIS_POINTS;
            }

            leaderboards[tournamentKey][rank] = LeaderboardEntry({
                player: players[i],
                score: scores[i],
                rank: rank,
                prize: prize,
                claimed: false
            });

            playerTournaments[players[i]].push(tournamentKey);
        }

        emit TournamentEnded(tournamentKey, block.timestamp, tournament.totalPrizePool);
        emit LeaderboardSubmitted(tournamentKey, players, scores, ranks);
    }

    /**
     * @dev Distribute prizes automatically (owner initiated)
     * @param tournamentKey Tournament key
     */
    function distributePrizes(bytes32 tournamentKey) external onlyOwner nonReentrant {
        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(tournament.status == TournamentStatus.ENDED, "Prize: Tournament not ended");

        uint256[] memory percentages = distributionPercentages[tournament.distributionModel];
        uint256 prizePoolAfterFee = (tournament.totalPrizePool * (BASIS_POINTS - platformFeePercent)) / BASIS_POINTS;

        // Transfer platform fee
        uint256 platformFee = tournament.totalPrizePool - prizePoolAfterFee;
        if (platformFee > 0 && feeRecipient != address(0)) {
            _transferPrize(tournamentKey, feeRecipient, platformFee, tournament.prizeToken);
        }

        // Distribute prizes to winners
        for (uint256 i = 1; i <= percentages.length; i++) {
            LeaderboardEntry storage entry = leaderboards[tournamentKey][i];
            if (entry.player != address(0) && entry.prize > 0 && !entry.claimed) {
                entry.claimed = true;
                prizesClaimed[tournamentKey][entry.player] = true;

                _transferPrize(tournamentKey, entry.player, entry.prize, tournament.prizeToken);

                emit PrizeDistributed(tournamentKey, entry.player, i, entry.prize);
                emit PrizeClaimed(tournamentKey, entry.player, entry.prize);
            }
        }

        tournament.status = TournamentStatus.DISTRIBUTED;
    }

    /**
     * @dev Claim prize (for winners to claim themselves)
     * @param tournamentKey Tournament key
     * @param rank Player's rank
     */
    function claimPrize(bytes32 tournamentKey, uint256 rank) external nonReentrant {
        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(tournament.status == TournamentStatus.ENDED, "Prize: Tournament not ended");

        LeaderboardEntry storage entry = leaderboards[tournamentKey][rank];
        require(entry.player == msg.sender, "Prize: Not your prize");
        require(entry.prize > 0, "Prize: No prize to claim");
        require(!entry.claimed, "Prize: Already claimed");

        entry.claimed = true;
        prizesClaimed[tournamentKey][msg.sender] = true;

        _transferPrize(tournamentKey, msg.sender, entry.prize, tournament.prizeToken);

        emit PrizeClaimed(tournamentKey, msg.sender, entry.prize);
    }

    /**
     * @dev Internal function to transfer prizes
     */
    function _transferPrize(
        bytes32 tournamentKey,
        address to,
        uint256 amount,
        address token
    ) internal {
        if (token == address(0)) {
            // Native token
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "Prize: Native transfer failed");
        } else {
            // ERC20 token
            require(IERC20(token).transfer(to, amount), "Prize: Token transfer failed");
        }
    }

    /**
     * @dev Cancel tournament and refund prizes
     * @param tournamentKey Tournament key
     * @param reason Cancellation reason
     */
    function cancelTournament(
        bytes32 tournamentKey,
        string calldata reason
    ) external onlyOwner {
        Tournament storage tournament = tournaments[tournamentKey];
        require(tournament.exists, "Prize: Tournament not found");
        require(
            tournament.status == TournamentStatus.PENDING ||
            tournament.status == TournamentStatus.ACTIVE,
            "Prize: Cannot cancel"
        );

        tournament.status = TournamentStatus.CANCELLED;

        // Refund prize pool to owner
        if (tournament.totalPrizePool > 0) {
            uint256 refundAmount = tournament.totalPrizePool;
            tournament.totalPrizePool = 0;
            _transferPrize(tournamentKey, owner(), refundAmount, tournament.prizeToken);
        }

        emit TournamentCancelled(tournamentKey, reason);
    }

    /**
     * @dev Set custom distribution percentages (for CUSTOM model)
     * @param percentages Array of percentages in basis points
     */
    function setCustomDistribution(uint256[] calldata percentages) external onlyOwner {
        require(percentages.length > 0, "Prize: Empty distribution");

        uint256 total = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            total += percentages[i];
        }
        require(total == BASIS_POINTS, "Prize: Must total 100%");

        distributionPercentages[DistributionModel.CUSTOM] = percentages;
    }

    /**
     * @dev Set platform fee percentage
     * @param newFeePercent New fee in basis points (max 20%)
     */
    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 2000, "Prize: Fee too high (max 20%)");
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(newFeePercent);
    }

    /**
     * @dev Set fee recipient address
     * @param newRecipient New fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Prize: Invalid address");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @dev Get tournament details
     * @param tournamentKey Tournament key
     */
    function getTournament(bytes32 tournamentKey)
        external
        view
        returns (Tournament memory)
    {
        return tournaments[tournamentKey];
    }

    /**
     * @dev Get leaderboard entry
     * @param tournamentKey Tournament key
     * @param rank Rank position
     */
    function getLeaderboardEntry(bytes32 tournamentKey, uint256 rank)
        external
        view
        returns (LeaderboardEntry memory)
    {
        return leaderboards[tournamentKey][rank];
    }

    /**
     * @dev Get player's tournament history
     * @param player Player address
     */
    function getPlayerTournaments(address player)
        external
        view
        returns (bytes32[] memory)
    {
        return playerTournaments[player];
    }

    /**
     * @dev Get distribution percentages for a model
     * @param model Distribution model
     */
    function getDistributionPercentages(DistributionModel model)
        external
        view
        returns (uint256[] memory)
    {
        return distributionPercentages[model];
    }

    /**
     * @dev Get tournament count
     */
    function getTournamentCount() external view returns (uint256) {
        return tournamentList.length;
    }

    /**
     * @dev Check if player can claim prize
     * @param tournamentKey Tournament key
     * @param player Player address
     */
    function canClaimPrize(bytes32 tournamentKey, address player)
        external
        view
        returns (bool)
    {
        if (prizesClaimed[tournamentKey][player]) return false;

        Tournament storage tournament = tournaments[tournamentKey];
        if (tournament.status != TournamentStatus.ENDED) return false;

        uint256[] memory percentages = distributionPercentages[tournament.distributionModel];
        for (uint256 i = 1; i <= percentages.length; i++) {
            if (leaderboards[tournamentKey][i].player == player) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {
        // Accept native token deposits
    }
}
