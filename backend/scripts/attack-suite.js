// Runs the same attacks against (A) the original hash-only design and (B) Shield.
// Results are measured from these runs only. Logic-level test: no DB, chain or PDF engine.
const crypto = require("crypto");
const fs = require("fs");
const { canon, sha, newKeyPair, signCredential, Registry } = require("../services/credentialCore");
const N = 100;
const rnd = () => crypto.randomBytes(4).toString("hex");
const subj = () => ({ name: "Student " + rnd(), roll: "R" + rnd(), program: "BE-CSE" });

// ---- Baseline: original design (hash of PDF bytes anchored; issuer approved from a form; no limits)
const render = (s, stamp) => `%PDF|${s.name}|${s.roll}|${s.program}|rendered:${stamp}`;
class Baseline {
  constructor() { this.hashes = new Set(); this.revoked = new Set(); this.approved = new Set(); this.ids = new Set(); }
  approve(id) { this.approved.add(id); } // no domain proof in the current flow
  issue(issuer, pdf) { if (!this.approved.has(issuer)) return false; this.hashes.add(sha(pdf)); return true; }
  verify(pdf) { const h = sha(pdf); return this.hashes.has(h) && !this.revoked.has(h) ? { valid: true } : { valid: false }; }
}

function shieldWorld() {
  const reg = new Registry();
  const key = newKeyPair();
  reg.onboard("acet.edu", { expectedTxt: "bc=abc", foundTxt: "bc=abc" });
  reg.addKey("acet.edu", key);
  const issue = (s = subj(), k = key) => { const vc = signCredential({ issuer: "acet.edu", key: k, subject: s, portal: "https://verify.acet.edu", issuedAt: "2026-08-04" }); return { vc, a: reg.anchor(vc) }; };
  return { reg, key, issue };
}

const rows = [];
const add = (attack, base, shield, note) => rows.push({ attack, base, shield, note });
const pct = (n) => `${n}/${N}`;

// Benign: genuine verification, and re-rendered PDF (same data, new render stamp)
{ const b = new Baseline(); b.approve("acet"); const w = shieldWorld(); let bOk = 0, sOk = 0, bRe = 0, sRe = 0;
  for (let i = 0; i < N; i++) { const s = subj(); b.issue("acet", render(s, 1)); bOk += b.verify(render(s, 1)).valid; bRe += b.verify(render(s, 2)).valid;
    const { vc } = w.issue(s); sOk += w.reg.verify(vc).valid; sRe += w.reg.verify(JSON.parse(JSON.stringify(vc))).valid; }
  add("Genuine credential accepted", pct(bOk), pct(sOk), "higher is better");
  add("Genuine, re-rendered copy accepted", pct(bRe), pct(sRe), "baseline hashes PDF bytes; Shield hashes canonical data"); }

// Attacks: value = number DETECTED (rejected) out of N
const detect = (fnBase, fnShield, name, note) => { let b = 0, s = 0; for (let i = 0; i < N; i++) { b += fnBase() ? 1 : 0; s += fnShield() ? 1 : 0; } add(name, pct(b), pct(s), note); };

detect(() => { const b = new Baseline(); b.approve("acet"); const s = subj(); b.issue("acet", render(s, 1)); return !b.verify(render(s, 1) + "x").valid; },
  () => { const w = shieldWorld(); const { vc } = w.issue(); const e = JSON.parse(JSON.stringify(vc)); e.subject.roll += "x"; return !w.reg.verify(e).valid; }, "Edited document data", "Shield: embedded signed credential edited");
detect(() => { const b = new Baseline(); b.approve("acet"); const s = subj(); b.issue("acet", render(s, 1)); return !b.verify(render({ ...s, name: "Forged Name" }, 1)).valid; },
  () => { const w = shieldWorld(); const { vc } = w.issue(); const e = JSON.parse(JSON.stringify(vc)); e.subject.name = "Forged Name"; return !w.reg.verify(e).valid; }, "Changed holder name", "");
detect(() => { const b = new Baseline(); b.approve("fake-uni"); const s = subj(); b.issue("fake-uni", render(s, 1)); return !b.verify(render(s, 1)).valid; },
  () => { const w = shieldWorld(); const reg = w.reg; const ok = reg.onboard("fake-uni.xyz", { expectedTxt: "bc=zzz", foundTxt: undefined }); const fk = newKeyPair(); try { reg.addKey("fake-uni.xyz", fk); } catch (_) {} const vc = signCredential({ issuer: "fake-uni.xyz", key: fk, subject: subj(), portal: "x", issuedAt: "2026-08-04" }); reg.anchor(vc); return !reg.verify(vc).valid; },
  "Fake issuer (no domain control)", "Assumes admin approves from the form, as today's flow allows");
detect(() => { const b = new Baseline(); b.approve("acet"); const s = subj(); const p = render(s, 1); b.issue("acet", p); b.revoked.add(sha(p)); return !b.verify(p).valid; },
  () => { const w = shieldWorld(); const { vc } = w.issue(); w.reg.revoke(vc.id); return !w.reg.verify(vc).valid; }, "Revoked credential", "both designs should catch this");
detect(() => false, // baseline has no key concept: a stolen issuing wallet keeps working
  () => { const w = shieldWorld(); w.reg.compromise("acet.edu", w.key.kid); const { vc, a } = w.issue(subj(), w.key); return !a.ok || !w.reg.verify(vc).valid; }, "Compromised key issuing after revocation", "Baseline: no key revocation mechanism (counted as undetected)");
detect(() => false, // baseline QR is a plain URL, nothing binds it to the real portal
  () => { const w = shieldWorld(); const { vc } = w.issue(); return !w.reg.verify(vc, { origin: "https://verify-acet.xyz" }).valid; }, "QR sent to lookalike portal", "Needs the verifying client to pass its origin");
detect(() => false, // static QR: same response every time
  () => { const w = shieldWorld(); const { vc } = w.issue(); const t = w.reg.present(vc); w.reg.redeem(t); return !w.reg.redeem(t).valid; }, "Replayed presentation", "Shield: single-use token. A plain public QR is still replayable by design");
detect(() => { const b = new Baseline(); b.approve("acet"); const s = subj(); b.issue("acet", render(s, 1)); return !b.issue("acet", render(s, 2)); }, // baseline has no duplicate rule
  () => { const w = shieldWorld(); const s = subj(); w.issue(s); return !w.issue(s).a.ok; }, "Duplicate issuance (same holder + program)", "Baseline accepts re-issue");

// ID enumeration: attacker makes 10,000 guesses from one IP; report guesses SERVED and hits.
{ const G = 10000, ISSUED = 10000;
  const bIds = new Set(); while (bIds.size < ISSUED) bIds.add("CRD-2026-CSE-" + String(crypto.randomInt(1e8)).padStart(8, "0"));
  let bServed = 0, bHits = 0; for (let i = 0; i < G; i++) { bServed++; if (bIds.has("CRD-2026-CSE-" + String(crypto.randomInt(1e8)).padStart(8, "0"))) bHits++; }
  const w = shieldWorld(); const sIds = new Set(); for (let i = 0; i < ISSUED; i++) sIds.add(w.issue().vc.id);
  let sServed = 0, sHits = 0; for (let i = 0; i < G; i++) { const r = w.reg.lookup("BCV-" + crypto.randomBytes(16).toString("hex"), "1.2.3.4", sIds); if (!r.blocked) { sServed++; if (r.found) sHits++; } }
  rows.push({ attack: `ID enumeration (${G} guesses, ${ISSUED} IDs issued)`, base: `served ${bServed}, hits ${bHits}`, shield: `served ${sServed}, hits ${sHits}`, note: "Baseline ID space ~27 bits, unthrottled; Shield 128-bit + 30/window limit" }); }

const md = ["| Test | Hash-only baseline | Shield | Note |", "|---|---|---|---|", ...rows.map((r) => `| ${r.attack} | ${r.base} | ${r.shield} | ${r.note} |`)].join("\n");
console.log(md);
fs.writeFileSync(__dirname + "/../ATTACK_RESULTS.md", `# Attack suite results (N=${N} per case)\nGenerated by \`npm run attack-suite\`. Logic-level run: no DB, chain or PDF engine. Attack rows show how many were DETECTED.\n\n${md}\n`);
