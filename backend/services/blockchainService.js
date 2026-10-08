const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

let cachedContractConfig = null;

/**
 * Loads the deployed contract's address + ABI. Prefers the config file
 * written automatically by blockchain/scripts/deploy.js; falls back to
 * CONTRACT_ADDRESS env var + a minimal inline ABI if that file is absent
 * (e.g. contract already deployed elsewhere and only the address is known).
 */
function loadContractConfig() {
  if (cachedContractConfig) return cachedContractConfig;

  const configPath = path.join(__dirname, "..", "utils", "contractConfig.json");
  if (fs.existsSync(configPath)) {
    cachedContractConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return cachedContractConfig;
  }

  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error(
      "No contractConfig.json found and CONTRACT_ADDRESS not set. Deploy the contract first (see blockchain/scripts/deploy.js)."
    );
  }

  cachedContractConfig = {
    address: process.env.CONTRACT_ADDRESS,
    abi: MINIMAL_ABI,
  };
  return cachedContractConfig;
}

// Minimal ABI fallback matching Certificate.sol's public interface.
const MINIMAL_ABI = [
  "function setIssuerApproval(address institution, bool approved) external",
  "function approvedIssuers(address) external view returns (bool)",
  "function owner() external view returns (address)",
  "function issueCertificate(bytes32 certificateId, bytes32 certificateHash, string ipfsCID) external",
  "function revokeCertificate(bytes32 certificateId) external",
  "function certificateExists(bytes32 certificateId) external view returns (bool)",
  "function verifyCertificate(bytes32 certificateId, bytes32 certificateHash) external view returns (bool valid, tuple(bytes32 certificateHash, string ipfsCID, address issuer, uint256 timestamp, bool revoked, bool exists) record)",
  "function getCertificate(bytes32 certificateId) external view returns (tuple(bytes32 certificateHash, string ipfsCID, address issuer, uint256 timestamp, bool revoked, bool exists))",
  "event Issued(bytes32 indexed certificateId, bytes32 certificateHash, string ipfsCID, address indexed issuer, uint256 timestamp)",
  "event Revoked(bytes32 indexed certificateId, address indexed revokedBy, uint256 timestamp)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.RPC_URL);
}

function getPlatformWallet() {
  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

function getContract(signerOrProvider) {
  const { address, abi } = loadContractConfig();
  return new ethers.Contract(address, abi, signerOrProvider || getProvider());
}

/** Converts a human-readable certificate ID into the bytes32 key used on-chain. */
function certificateIdToBytes32(certificateId) {
  return ethers.keccak256(ethers.toUtf8Bytes(certificateId));
}

/**
 * Issues a certificate on-chain using the platform wallet.
 * (In a fuller production design, institutions would sign with their own
 * wallets client-side; here the platform wallet acts on their behalf once
 * approved via setIssuerApproval, simplifying custody for the MVP.)
 */
async function issueCertificateOnChain({ certificateId, certificateHashHex, ipfsCID }) {
  const wallet = getPlatformWallet();
  const contract = getContract(wallet);

  // The platform wallet is the on-chain sender, so it is the address the
  // contract checks in onlyApprovedIssuer. Make sure it is approved (it is the
  // contract owner, so it may approve itself). Also covers a freshly
  // redeployed local Hardhat contract where approvals start empty.
  if (!(await contract.approvedIssuers(wallet.address))) {
    const approveTx = await contract.setIssuerApproval(wallet.address, true);
    await approveTx.wait();
  }

  const idBytes32 = certificateIdToBytes32(certificateId);
  const hashBytes32 = certificateHashHex.startsWith("0x")
    ? certificateHashHex
    : `0x${certificateHashHex}`;

  const tx = await contract.issueCertificate(idBytes32, hashBytes32, ipfsCID);
  const receipt = await tx.wait();

  return {
    certificateIdHash: idBytes32,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    issuerWallet: wallet.address,
    contractAddress: await contract.getAddress(),
  };
}

/** Revokes a certificate on-chain. */
async function revokeCertificateOnChain(certificateId) {
  const wallet = getPlatformWallet();
  const contract = getContract(wallet);
  const idBytes32 = certificateIdToBytes32(certificateId);

  const tx = await contract.revokeCertificate(idBytes32);
  const receipt = await tx.wait();

  return { transactionHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Verifies a certificate against the chain: existence, hash match, and
 * revocation status.
 */
async function verifyCertificateOnChain(certificateId, certificateHashHex) {
  const contract = getContract();
  const idBytes32 = certificateIdToBytes32(certificateId);
  const hashBytes32 = certificateHashHex.startsWith("0x")
    ? certificateHashHex
    : `0x${certificateHashHex}`;

  const [valid, record] = await contract.verifyCertificate(idBytes32, hashBytes32);

  return {
    valid,
    exists: record.exists,
    revoked: record.revoked,
    onChainHash: record.certificateHash,
    ipfsCID: record.ipfsCID,
    issuer: record.issuer,
    timestamp: Number(record.timestamp),
  };
}

/** Approves or revokes an institution wallet's ability to issue certificates. */
async function setIssuerApproval(institutionWallet, approved) {
  const wallet = getPlatformWallet();
  const contract = getContract(wallet);
  const tx = await contract.setIssuerApproval(institutionWallet, approved);
  const receipt = await tx.wait();
  return { transactionHash: receipt.hash };
}

module.exports = {
  getProvider,
  getPlatformWallet,
  getContract,
  certificateIdToBytes32,
  issueCertificateOnChain,
  revokeCertificateOnChain,
  verifyCertificateOnChain,
  setIssuerApproval,
};
