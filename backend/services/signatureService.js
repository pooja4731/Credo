const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Ed25519 registry key. Set SIGNING_PRIVATE_KEY (PEM, \n-escaped) in production.
// In dev a key is generated once and stored in .signing-key.pem (git-ignored).
const KEY_FILE = path.join(__dirname, "..", ".signing-key.pem");

function loadPrivateKey() {
  if (process.env.SIGNING_PRIVATE_KEY) {
    return crypto.createPrivateKey(process.env.SIGNING_PRIVATE_KEY.replace(/\\n/g, "\n"));
  }
  if (!fs.existsSync(KEY_FILE)) {
    const { privateKey } = crypto.generateKeyPairSync("ed25519");
    fs.writeFileSync(KEY_FILE, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  }
  return crypto.createPrivateKey(fs.readFileSync(KEY_FILE));
}

const privateKey = loadPrivateKey();
const publicKey = crypto.createPublicKey(privateKey);

const b64u = (buf) => Buffer.from(buf).toString("base64url");

/** Raw 32-byte public key, base64url — usable with WebCrypto for offline checks. */
function getPublicKeyB64u() {
  return b64u(publicKey.export({ type: "spki", format: "der" }).subarray(-32));
}

/**
 * Signed offline pass: `CRD1.<payload>.<signature>`.
 * Payload holds only what is needed to verify: ID, hash, issuer, issue date.
 * No personal data is embedded.
 */
function createOfflinePass(cert) {
  const payload = {
    v: 1,
    id: cert.certificateId,
    h: cert.certificateHash,
    iss: cert.institution?.code || String(cert.institution),
    iat: new Date(cert.issueDate).toISOString().slice(0, 10),
  };
  const p = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.sign(null, Buffer.from(p), privateKey));
  return `CRD1.${p}.${sig}`;
}

/** Server-side check of a pass; the same maths the browser does with WebCrypto. */
function verifyOfflinePass(pass) {
  const parts = String(pass || "").split(".");
  if (parts.length !== 3 || parts[0] !== "CRD1") return { signatureValid: false };
  const [, p, sig] = parts;
  const signatureValid = crypto.verify(null, Buffer.from(p), publicKey, Buffer.from(sig, "base64url"));
  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(p, "base64url").toString());
  } catch (_) {}
  return { signatureValid, payload };
}

module.exports = { createOfflinePass, verifyOfflinePass, getPublicKeyB64u };
