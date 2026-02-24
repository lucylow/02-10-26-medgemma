/**
 * Deploy PediScreenRegistry (hash-only screening registry).
 * Usage: npx hardhat run scripts/deploy-registry.js --network <network>
 * e.g. --network polygonAmoy | mumbai | hardhat
 * Set DEPLOYER_PRIVATE_KEY (and RPC URLs if needed) in .env.
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PediScreenRegistry with account:", deployer.address);

  const PediScreenRegistry = await hre.ethers.getContractFactory("PediScreenRegistry");
  const registry = await PediScreenRegistry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("PediScreenRegistry deployed to:", address);

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log("Chain ID:", chainId.toString());
  console.log("\nSet in .env:");
  console.log("VITE_REGISTRY_ADDRESS=" + address);
  console.log("VITE_CHAIN_ID=" + chainId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
