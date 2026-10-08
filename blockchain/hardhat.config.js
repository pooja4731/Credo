require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    // Local node: `npx hardhat node`
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Any EVM testnet (Sepolia, Amoy, etc.) — set RPC_URL and PRIVATE_KEY in .env
    testnet: {
      url: RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
