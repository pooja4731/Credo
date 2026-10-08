const crypto = require("crypto");

/**
 * Produces a canonical JSON string for a certificate payload so that
 * hashing the same logical certificate always yields the same hash,
 * regardless of key insertion order.
 */
function canonicalize(obj) {
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(",")}]`;
  }
  if (obj !== null && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(obj);
}

/** SHA-256 hex digest of a canonicalized certificate JSON payload. */
function hashCertificateData(certificateData) {
  const canonical = canonicalize(certificateData);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/** SHA-256 hex digest of raw file bytes (e.g. the generated PDF). */
function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Converts a hex-encoded SHA-256 digest into a 0x-prefixed bytes32 string
 * suitable for passing to the Certificate smart contract.
 */
function hexToBytes32(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 64) {
    throw new Error("hexToBytes32: expected a 32-byte (64 hex char) SHA-256 digest");
  }
  return `0x${clean}`;
}

module.exports = { canonicalize, hashCertificateData, hashBuffer, hexToBytes32 };
