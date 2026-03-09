const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Tower of Fate V2.0 - Blockchain Layer Deployment Script
 *
 * Deploys:
 * 1. FATEToken - $FATE Game Token (ERC-20)
 * 2. TowerNFT - Tower Floor NFTs (ERC-721)
 * 3. GameEconomy - Game Economy Contract
 * 4. TournamentPrize - Tournament Prize Pool
 *
 * Wallet Configuration:
 * - USDT (TRON): TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC
 * - BNB (BSC): 0x6b107f2a17f218df01367f94c4a77758ba9cb4df
 * - ETH (ETH): 0x6b107f2a17f218df01367f94c4a77758ba9cb4df
 * - SOL: BYQsmcAq16BQ1K7CUphfuQJephJrDNbm3NVXtsLG6tyN
 */

// Configuration
const CONFIG = {
  // Token Configuration
  fateToken: {
    name: "FATE Token",
    symbol: "FATE",
    totalSupply: ethers.parseEther("1000000000"), // 1 Billion
  },

  // NFT Configuration
  towerNFT: {
    name: "Tower of Fate NFT",
    symbol: "TOWER",
    baseMetadataURI: "ipfs://QmTowerOfFate/", // Replace with actual IPFS URI
    mintPrice: ethers.parseEther("0.01"), // 0.01 ETH/BNB
    upgradeBasePrice: ethers.parseEther("0.005"), // 0.005 ETH/BNB
  },

  // Game Economy Configuration
  gameEconomy: {
    requiredConfirmations: 2, // Multi-sig requires 2 confirmations
  },

  // Tournament Configuration
  tournamentPrize: {
    platformFeePercent: 500, // 5% in basis points
  },

  // Game Wallet Addresses (as specified)
  wallets: {
    usdtTron: "TUKf5QXj8nvNhsqy2va8gCnRoG77wKVwwC",
    bnbBsc: "0x6b107f2a17f218df01367f94c4a77758ba9cb4df",
    ethEth: "0x6b107f2a17f218df01367f94c4a77758ba9cb4df",
    sol: "BYQsmcAq16BQ1K7CUphfuQJephJrDNbm3NVXtsLG6tyN",
  },
};

// Deployment state
const deploymentState = {
  network: "",
  chainId: 0,
  deployer: "",
  timestamp: "",
  contracts: {},
};

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     Tower of Fate V2.0 - Blockchain Deployment             ║");
  console.log("║     Web4.0 Gaming Layer                                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  // Get network info
  const [deployer] = await ethers.getSigners();
  deploymentState.network = network.name;
  deploymentState.chainId = network.config.chainId;
  deploymentState.deployer = deployer.address;
  deploymentState.timestamp = new Date().toISOString();

  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // Verify deployer balance
  const balance = await deployer.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.1")) {
    console.warn("WARNING: Deployer balance is low. Deployment may fail.");
  }

  // Deploy contracts
  await deployFATEToken(deployer);
  await deployTowerNFT(deployer);
  await deployGameEconomy(deployer);
  await deployTournamentPrize(deployer);

  // Save deployment info
  await saveDeploymentInfo();

  // Verify contracts if not on local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    await verifyContracts();
  }

  console.log();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     Deployment Complete!                                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  printSummary();
}

async function deployFATEToken(deployer) {
  console.log("Deploying FATEToken...");
  console.log("  - Total Supply:", ethers.formatEther(CONFIG.fateToken.totalSupply), "FATE");
  console.log("  - APY: 10%");

  const FATEToken = await ethers.getContractFactory("FATEToken");
  const fateToken = await FATEToken.deploy(deployer.address);
  await fateToken.waitForDeployment();

  const address = await fateToken.getAddress();
  deploymentState.contracts.FATEToken = {
    name: "FATEToken",
    address: address,
    constructorArgs: [deployer.address],
    verified: false,
  };

  console.log("  FATEToken deployed to:", address);
  console.log();
}

async function deployTowerNFT(deployer) {
  console.log("Deploying TowerNFT...");
  console.log("  - Base Metadata URI:", CONFIG.towerNFT.baseMetadataURI);
  console.log("  - Mint Price:", ethers.formatEther(CONFIG.towerNFT.mintPrice), "ETH");
  console.log("  - Upgrade Base Price:", ethers.formatEther(CONFIG.towerNFT.upgradeBasePrice), "ETH");

  const TowerNFT = await ethers.getContractFactory("TowerNFT");
  const towerNFT = await TowerNFT.deploy(
    deployer.address,
    CONFIG.towerNFT.baseMetadataURI,
    CONFIG.towerNFT.mintPrice,
    CONFIG.towerNFT.upgradeBasePrice
  );
  await towerNFT.waitForDeployment();

  const address = await towerNFT.getAddress();
  deploymentState.contracts.TowerNFT = {
    name: "TowerNFT",
    address: address,
    constructorArgs: [
      deployer.address,
      CONFIG.towerNFT.baseMetadataURI,
      CONFIG.towerNFT.mintPrice.toString(),
      CONFIG.towerNFT.upgradeBasePrice.toString(),
    ],
    verified: false,
  };

  console.log("  TowerNFT deployed to:", address);
  console.log();
}

async function deployGameEconomy(deployer) {
  console.log("Deploying GameEconomy...");
  console.log("  - Required Confirmations:", CONFIG.gameEconomy.requiredConfirmations);
  console.log("  - Multi-sig Enabled: Yes");

  const GameEconomy = await ethers.getContractFactory("GameEconomy");
  const gameEconomy = await GameEconomy.deploy(
    deployer.address,
    CONFIG.gameEconomy.requiredConfirmations
  );
  await gameEconomy.waitForDeployment();

  const address = await gameEconomy.getAddress();
  deploymentState.contracts.GameEconomy = {
    name: "GameEconomy",
    address: address,
    constructorArgs: [deployer.address, CONFIG.gameEconomy.requiredConfirmations],
    verified: false,
  };

  console.log("  GameEconomy deployed to:", address);

  // Log configured wallets
  console.log("  Configured Wallets:");
  console.log("    - USDT (TRON):", CONFIG.wallets.usdtTron);
  console.log("    - BNB (BSC):", CONFIG.wallets.bnbBsc);
  console.log("    - ETH (ETH):", CONFIG.wallets.ethEth);
  console.log("    - SOL:", CONFIG.wallets.sol);
  console.log();
}

async function deployTournamentPrize(deployer) {
  console.log("Deploying TournamentPrize...");
  console.log("  - Platform Fee:", CONFIG.tournamentPrize.platformFeePercent / 100, "%");
  console.log("  - Fee Recipient:", deployer.address);

  const TournamentPrize = await ethers.getContractFactory("TournamentPrize");
  const tournamentPrize = await TournamentPrize.deploy(
    deployer.address,
    deployer.address // Fee recipient (can be changed later)
  );
  await tournamentPrize.waitForDeployment();

  const address = await tournamentPrize.getAddress();
  deploymentState.contracts.TournamentPrize = {
    name: "TournamentPrize",
    address: address,
    constructorArgs: [deployer.address, deployer.address],
    verified: false,
  };

  console.log("  TournamentPrize deployed to:", address);
  console.log();
}

async function saveDeploymentInfo() {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(deploymentState, null, 2));
  console.log("Deployment info saved to:", filepath);

  // Also save as latest
  const latestPath = path.join(deploymentsDir, `deployment-${network.name}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentState, null, 2));
}

async function verifyContracts() {
  console.log("Verifying contracts on block explorer...");
  console.log("Waiting 30 seconds for block confirmations...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  for (const [name, info] of Object.entries(deploymentState.contracts)) {
    try {
      console.log(`Verifying ${name} at ${info.address}...`);
      await run("verify:verify", {
        address: info.address,
        constructorArguments: info.constructorArgs,
      });
      console.log(`  ${name} verified successfully!`);
      info.verified = true;
    } catch (error) {
      console.log(`  ${name} verification failed:`, error.message);
    }
  }
}

function printSummary() {
  console.log("Deployed Contracts:");
  console.log("────────────────────────────────────────────────────────────");
  for (const [name, info] of Object.entries(deploymentState.contracts)) {
    console.log(`${name}:`);
    console.log(`  Address: ${info.address}`);
    console.log(`  Verified: ${info.verified ? "Yes" : "No"}`);
    console.log();
  }

  console.log("Game Wallet Addresses:");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`USDT (TRON): ${CONFIG.wallets.usdtTron}`);
  console.log(`BNB (BSC):   ${CONFIG.wallets.bnbBsc}`);
  console.log(`ETH (ETH):   ${CONFIG.wallets.ethEth}`);
  console.log(`SOL:         ${CONFIG.wallets.sol}`);
  console.log();

  console.log("Next Steps:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("1. Update IPFS metadata URIs in TowerNFT");
  console.log("2. Configure token contracts in GameEconomy");
  console.log("3. Add additional signers to GameEconomy for multi-sig");
  console.log("4. Fund TournamentPrize contract for initial tournaments");
  console.log("5. Verify contracts on block explorer");
  console.log();
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
