// Shield core: signed canonical credentials + issuer trust registry.
// Pure logic (no DB) so it can be attack-tested; routes/DB adapters wrap it.
const crypto = require("crypto");
const b64u = (b) => Buffer.from(b).toString("base64url");
const canon = (o) => Array.isArray(o) ? "[" + o.map(canon).join(",") + "]"
  : o && typeof o === "object" ? "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canon(o[k])).join(",") + "}"
  : JSON.stringify(o);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const rawToKey = (raw) => crypto.createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(raw, "base64url")]), format: "der", type: "spki" });

function newKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return { privateKey, kid: "k-" + crypto.randomBytes(4).toString("hex"), publicKey: b64u(publicKey.export({ type: "spki", format: "der" }).subarray(-32)) };
}

/** Issuer signs the canonical credential. ID is 128-bit random (unguessable). */
function signCredential({ issuer, key, subject, portal, issuedAt }) {
  const body = { "@context": "https://www.w3.org/ns/credentials/v2", type: "AcademicCredential", id: "BCV-" + crypto.randomBytes(16).toString("hex"), issuer, kid: key.kid, issuedAt, portal, subject };
  return { ...body, proof: { alg: "Ed25519", kid: key.kid, sig: b64u(crypto.sign(null, Buffer.from(canon(body)), key.privateKey)) } };
}

class Registry {
  constructor() { this.t = 0; this.issuers = new Map(); this.anchors = new Map(); this.revoked = new Set(); this.dupes = new Set(); this.pres = new Map(); this.hits = new Map(); }
  now() { return ++this.t; } // logical clock (stands in for block time)
  /** Onboarding needs proof of domain control (DNS TXT) before approval. */
  onboard(id, { expectedTxt, foundTxt }) {
    const ok = !!expectedTxt && expectedTxt === foundTxt;
    this.issuers.set(id, { id, status: ok ? "approved" : "rejected", keys: [] });
    return ok;
  }
  addKey(id, k) { const i = this.issuers.get(id); if (i?.status !== "approved") throw new Error("issuer not approved"); i.keys.push({ kid: k.kid, publicKey: k.publicKey, retiredAt: null, compromisedAt: null }); }
  rotate(id, oldKid, nk) { const i = this.issuers.get(id); i.keys.find((k) => k.kid === oldKid).retiredAt = this.now(); this.addKey(id, nk); }
  compromise(id, kid) { this.issuers.get(id).keys.find((k) => k.kid === kid).compromisedAt = this.now(); }
  revoke(cid) { this.revoked.add(cid); }
  /** Anchoring gate (what the contract would enforce): approved issuer, active key, no duplicates. */
  anchor(vc) {
    const i = this.issuers.get(vc.issuer), k = i?.keys.find((x) => x.kid === vc.proof?.kid);
    if (i?.status !== "approved" || !k) return { ok: false, why: "unknown-issuer-or-key" };
    if (k.retiredAt || k.compromisedAt) return { ok: false, why: "key-not-active" };
    const dk = `${vc.issuer}|${vc.subject.roll}|${vc.subject.program}`;
    if (this.dupes.has(dk)) return { ok: false, why: "duplicate" };
    this.dupes.add(dk);
    this.anchors.set(sha(canon(stripProof(vc))), this.now());
    return { ok: true };
  }
  verify(vc, { origin } = {}) {
    const body = stripProof(vc);
    const i = this.issuers.get(vc.issuer);
    if (!i || i.status !== "approved") return rej("unknown-issuer");
    const k = i.keys.find((x) => x.kid === vc.proof?.kid);
    if (!k) return rej("unknown-key");
    let sigOk = false;
    try { sigOk = crypto.verify(null, Buffer.from(canon(body)), rawToKey(k.publicKey), Buffer.from(vc.proof.sig, "base64url")); } catch (_) {}
    if (!sigOk) return rej("bad-signature");
    const at = this.anchors.get(sha(canon(body)));
    if (!at) return rej("unanchored");
    if (k.compromisedAt && at >= k.compromisedAt) return rej("key-compromised");
    if (this.revoked.has(vc.id)) return rej("revoked");
    if (origin && origin !== vc.portal) return rej("lookalike-portal");
    return { valid: true };
  }
  /** Single-use presentation token (anti-replay). */
  present(vc) { const t = crypto.randomBytes(16).toString("hex"); this.pres.set(t, { vc, used: false }); return t; }
  redeem(t) { const p = this.pres.get(t); if (!p || p.used) return rej("replayed-or-unknown"); p.used = true; return this.verify(p.vc); }
  /** Rate-limited public lookup (30/window/ip) to stop ID scraping. */
  lookup(id, ip, store) { const n = (this.hits.get(ip) || 0) + 1; this.hits.set(ip, n); if (n > 30) return { blocked: true }; return { blocked: false, found: store.has(id) }; }
}
const stripProof = ({ proof, ...b }) => b;
const rej = (why) => ({ valid: false, why });

module.exports = { canon, sha, newKeyPair, signCredential, Registry, stripProof };
