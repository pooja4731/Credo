const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Certificate contract with account:", deployer.address);

  const Certificate = await hre.ethers.getContractFactory("Certificate");
  const certificate = await Certificate.deploy();
  await certificate.waitForDeployment();

  const address = await certificate.getAddress();
  console.log("Certificate contract deployed to:", address);

  // Write address + ABI to backend so blockchainService.js can pick it up
  const artifact = await hre.artifacts.readArtifact("Certificate");
  const outDir = path.join(__dirname, "..", "..", "backend", "utils");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "contractConfig.json"),
    JSON.stringify(
      {
        address,
        abi: artifact.abi,
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log("Contract config written to backend/utils/contractConfig.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
