// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TowerNFT
 * @dev ERC-721 NFT Contract for Tower of Fate V2.0
 * 13 Floors with different rarities, IPFS metadata, upgrade and trading features
 */
contract TowerNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // Floor constants (13 floors)
    uint8 public constant FLOOR_COUNT = 13;

    // Rarity levels
    enum Rarity {
        COMMON,      // Floors 1-4
        UNCOMMON,    // Floors 5-7
        RARE,        // Floors 8-10
        EPIC,        // Floor 11
        LEGENDARY    // Floors 12-13
    }

    // Floor data structure
    struct Floor {
        uint8 floorNumber;      // 1-13
        Rarity rarity;
        uint256 power;          // Floor power level
        uint256 creationTime;
        uint256 upgradeCount;   // Number of upgrades performed
        string metadataURI;     // IPFS metadata URI
    }

    // Mapping from token ID to Floor data
    mapping(uint256 => Floor) public floors;

    // Mapping from floor number to base power
    mapping(uint8 => uint256) public floorBasePower;

    // Mapping from rarity to upgrade cost multiplier
    mapping(Rarity => uint256) public rarityUpgradeCost;

    // Base URI for IPFS metadata
    string public baseMetadataURI;

    // Minting price (in wei)
    uint256 public mintPrice;

    // Upgrade price base (in wei)
    uint256 public upgradeBasePrice;

    // Maximum upgrades per floor
    uint256 public constant MAX_UPGRADES = 10;

    // Events
    event FloorMinted(address indexed owner, uint256 tokenId, uint8 floorNumber, Rarity rarity);
    event FloorUpgraded(uint256 indexed tokenId, uint256 newPower, uint256 upgradeCount);
    event MetadataUpdated(uint256 indexed tokenId, string newMetadataURI);
    event BaseMetadataURIUpdated(string newBaseURI);
    event MintPriceUpdated(uint256 newPrice);
    event UpgradePriceUpdated(uint256 newPrice);

    constructor(
        address initialOwner,
        string memory _baseMetadataURI,
        uint256 _mintPrice,
        uint256 _upgradeBasePrice
    ) ERC721("Tower of Fate NFT", "TOWER") Ownable(initialOwner) {
        baseMetadataURI = _baseMetadataURI;
        mintPrice = _mintPrice;
        upgradeBasePrice = _upgradeBasePrice;

        // Initialize floor base power (increases with floor number)
        floorBasePower[1] = 100;
        floorBasePower[2] = 150;
        floorBasePower[3] = 200;
        floorBasePower[4] = 280;
        floorBasePower[5] = 380;
        floorBasePower[6] = 500;
        floorBasePower[7] = 650;
        floorBasePower[8] = 850;
        floorBasePower[9] = 1100;
        floorBasePower[10] = 1400;
        floorBasePower[11] = 1800;
        floorBasePower[12] = 2300;
        floorBasePower[13] = 3000;

        // Initialize upgrade cost multipliers (in basis points)
        rarityUpgradeCost[Rarity.COMMON] = 100;      // 1x
        rarityUpgradeCost[Rarity.UNCOMMON] = 150;    // 1.5x
        rarityUpgradeCost[Rarity.RARE] = 220;        // 2.2x
        rarityUpgradeCost[Rarity.EPIC] = 320;        // 3.2x
        rarityUpgradeCost[Rarity.LEGENDARY] = 500;   // 5x
    }

    /**
     * @dev Get rarity based on floor number
     * @param floorNumber Floor number (1-13)
     * @return Rarity level
     */
    function getRarityByFloor(uint8 floorNumber) public pure returns (Rarity) {
        require(floorNumber >= 1 && floorNumber <= FLOOR_COUNT, "TOWER: Invalid floor number");

        if (floorNumber <= 4) return Rarity.COMMON;
        if (floorNumber <= 7) return Rarity.UNCOMMON;
        if (floorNumber <= 10) return Rarity.RARE;
        if (floorNumber == 11) return Rarity.EPIC;
        return Rarity.LEGENDARY;
    }

    /**
     * @dev Mint a new floor NFT
     * @param floorNumber Floor number to mint (1-13)
     * @param metadataURI IPFS metadata URI for this specific floor
     */
    function mintFloor(uint8 floorNumber, string calldata metadataURI) external payable nonReentrant {
        require(floorNumber >= 1 && floorNumber <= FLOOR_COUNT, "TOWER: Invalid floor number");
        require(msg.value >= mintPrice, "TOWER: Insufficient payment");
        require(bytes(metadataURI).length > 0, "TOWER: Metadata URI required");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        Rarity rarity = getRarityByFloor(floorNumber);

        floors[tokenId] = Floor({
            floorNumber: floorNumber,
            rarity: rarity,
            power: floorBasePower[floorNumber],
            creationTime: block.timestamp,
            upgradeCount: 0,
            metadataURI: metadataURI
        });

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit FloorMinted(msg.sender, tokenId, floorNumber, rarity);
    }

    /**
     * @dev Batch mint floors
     * @param floorNumbers Array of floor numbers to mint
     * @param metadataURIs Array of metadata URIs
     */
    function batchMintFloors(
        uint8[] calldata floorNumbers,
        string[] calldata metadataURIs
    ) external payable nonReentrant {
        require(floorNumbers.length == metadataURIs.length, "TOWER: Array length mismatch");
        require(msg.value >= mintPrice * floorNumbers.length, "TOWER: Insufficient payment");

        for (uint256 i = 0; i < floorNumbers.length; i++) {
            require(floorNumbers[i] >= 1 && floorNumbers[i] <= FLOOR_COUNT, "TOWER: Invalid floor number");
            require(bytes(metadataURIs[i]).length > 0, "TOWER: Metadata URI required");

            _tokenIdCounter.increment();
            uint256 tokenId = _tokenIdCounter.current();

            Rarity rarity = getRarityByFloor(floorNumbers[i]);

            floors[tokenId] = Floor({
                floorNumber: floorNumbers[i],
                rarity: rarity,
                power: floorBasePower[floorNumbers[i]],
                creationTime: block.timestamp,
                upgradeCount: 0,
                metadataURI: metadataURIs[i]
            });

            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);

            emit FloorMinted(msg.sender, tokenId, floorNumbers[i], rarity);
        }
    }

    /**
     * @dev Upgrade a floor NFT to increase its power
     * @param tokenId Token ID to upgrade
     */
    function upgradeFloor(uint256 tokenId) external payable nonReentrant {
        require(_exists(tokenId), "TOWER: Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "TOWER: Not token owner");

        Floor storage floor = floors[tokenId];
        require(floor.upgradeCount < MAX_UPGRADES, "TOWER: Max upgrades reached");

        uint256 upgradeCost = getUpgradeCost(tokenId);
        require(msg.value >= upgradeCost, "TOWER: Insufficient upgrade payment");

        // Increase power by 10% per upgrade
        floor.power = (floor.power * 110) / 100;
        floor.upgradeCount++;

        emit FloorUpgraded(tokenId, floor.power, floor.upgradeCount);
    }

    /**
     * @dev Calculate upgrade cost for a floor
     * @param tokenId Token ID
     * @return Upgrade cost in wei
     */
    function getUpgradeCost(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "TOWER: Token does not exist");

        Floor memory floor = floors[tokenId];
        uint256 baseCost = upgradeBasePrice * rarityUpgradeCost[floor.rarity] / 100;

        // Cost increases by 20% per upgrade
        for (uint256 i = 0; i < floor.upgradeCount; i++) {
            baseCost = (baseCost * 120) / 100;
        }

        return baseCost;
    }

    /**
     * @dev Update metadata URI for a floor (only owner)
     * @param tokenId Token ID
     * @param newMetadataURI New IPFS metadata URI
     */
    function updateMetadataURI(uint256 tokenId, string calldata newMetadataURI) external onlyOwner {
        require(_exists(tokenId), "TOWER: Token does not exist");
        require(bytes(newMetadataURI).length > 0, "TOWER: Invalid metadata URI");

        floors[tokenId].metadataURI = newMetadataURI;
        _setTokenURI(tokenId, newMetadataURI);

        emit MetadataUpdated(tokenId, newMetadataURI);
    }

    /**
     * @dev Get floor details
     * @param tokenId Token ID
     */
    function getFloorDetails(uint256 tokenId) external view returns (Floor memory) {
        require(_exists(tokenId), "TOWER: Token does not exist");
        return floors[tokenId];
    }

    /**
     * @dev Get all token IDs owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);

        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev Get floors by rarity
     * @param rarity Rarity level to filter
     * @return Array of token IDs with specified rarity
     */
    function getFloorsByRarity(Rarity rarity) external view returns (uint256[] memory) {
        uint256 count = 0;
        uint256 totalSupply = totalSupply();

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (floors[i].rarity == rarity) {
                count++;
            }
        }

        uint256[] memory tokenIds = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (floors[i].rarity == rarity) {
                tokenIds[index] = i;
                index++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Get total power of all floors owned by an address
     * @param owner Address to query
     * @return Total power
     */
    function getTotalPower(address owner) external view returns (uint256) {
        uint256 totalPower = 0;
        uint256 tokenCount = balanceOf(owner);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            totalPower += floors[tokenId].power;
        }

        return totalPower;
    }

    /**
     * @dev Set base metadata URI (only owner)
     * @param newBaseURI New base URI
     */
    function setBaseMetadataURI(string calldata newBaseURI) external onlyOwner {
        baseMetadataURI = newBaseURI;
        emit BaseMetadataURIUpdated(newBaseURI);
    }

    /**
     * @dev Set mint price (only owner)
     * @param newPrice New mint price in wei
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    /**
     * @dev Set upgrade base price (only owner)
     * @param newPrice New upgrade base price in wei
     */
    function setUpgradeBasePrice(uint256 newPrice) external onlyOwner {
        upgradeBasePrice = newPrice;
        emit UpgradePriceUpdated(newPrice);
    }

    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "TOWER: No balance to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "TOWER: Withdrawal failed");
    }

    /**
     * @dev Check if token exists
     * @param tokenId Token ID to check
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // Override required functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
