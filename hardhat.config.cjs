require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-toolbox");
try { require("dotenv").config(); } catch (_) {}

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
  },
  networks: {
    hardhat: {},
    mainnet: {
      url: process.env.ETH_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || ""}`,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.ETH_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || ""}`,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || ""}`,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || ""}`,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC || `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_KEY || ""}`,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    "base-mainnet": {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
      "base-mainnet": process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
      "base-sepolia": process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
    },
  },
};

// Exclude contracts/node_modules from compilation (HH1006 when sources include node_modules)
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } = require("hardhat/builtin-tasks/task-names");

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async ({ sourcePath }, { config }) => {
  const fs = require("fs");
  const path = require("path");
  const dir = path.resolve(sourcePath ?? config.paths.sources);
  const out = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules") continue;
        walk(full);
      } else if (e.name.endsWith(".sol")) out.push(full);
    }
  }
  walk(dir);
  return out;
});

module.exports = config;
