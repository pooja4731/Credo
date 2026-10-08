# Upgrades in this version
1. Student ownership: share a certificate with chosen fields only, an expiry (1h-30d) and a label; revoke any time; see views. (ShareLink model, /api/student/shares*, /verify/share/:token)
2. Selective disclosure: verifiers see only the fields the student allowed.
3. Signed offline pass: Ed25519 signature over {id, hash, issuer, date}. Check at /verify/pass in the browser (WebCrypto); no personal data inside. Set SIGNING_PRIVATE_KEY in production.
4. PDF no longer claims "Government-Verified".

# Not done yet (say so in the pitch, don't hide it)
- Encrypting PDFs before IPFS upload (public IPFS currently holds the PDF).
- Issuer registry check against AISHE/UGC lists.
- Single registry key signs passes; per-institution keys are the next step.

# Per-institution certificate branding
Institution > Profile > Certificate Design: header name, tagline, template (classic / modern / elegant), font, primary + accent colour, logo, signatory, footer text, with live PDF preview. Saved in Institution.branding and applied to every newly issued certificate. Credo only appears as a small "secured by" footer line. Certificates already issued keep the design they were issued with (their PDF is fixed on IPFS).
Limits: fonts are PDF built-ins (Helvetica, Times, Courier); custom .ttf upload is the next step.

# Shield core (signed credentials + issuer registry + attack suite)
backend/services/credentialCore.js: canonical-JSON credentials signed with Ed25519, issuer registry (domain-proof onboarding, key rotation, key compromise), anchoring gate, revocation, single-use presentations, rate-limited lookups, 128-bit IDs.
backend/scripts/attack-suite.js -> `npm run attack-suite` writes ATTACK_RESULTS.md. Logic-level, deterministic design tests (not fuzzing).
NOT yet wired into the Express routes, Mongo models, PDF or contract. Items 3 (Merkle), 4 (ciphertext on IPFS), 6 (maker-checker) not built.
# Consolidated changelog (merged from 3 uploaded versions)

The three zips were successive snapshots of one project. This build is the newest
snapshot (a strict superset of the other two) plus the review deck in `docs/`.

## Stage 1 -> Stage 2 (credo-upgraded.zip -> __1_)
- NEW per-institution certificate branding: `frontend/.../dashboards/BrandingPanel.jsx`
  (header, tagline, template classic/modern/elegant, font, colours, logo, signatory,
  footer, live PDF preview). Saved in `Institution.branding`, applied to new certificates.
- CHANGED `backend/models/Institution.js`, `routes/institutionRoutes.js`,
  `controllers/institutionController.js`, `services/pdfService.js`,
  `services/certificateService.js`, `server.js`, `InstitutionProfile.jsx` to support branding.
- Already-issued certificates keep their original design (PDF is fixed on IPFS).
- Limit: fonts are PDF built-ins (Helvetica, Times, Courier); custom .ttf is next.

## Stage 2 -> Stage 3 (__1_ -> __2_)
- NEW `backend/services/credentialCore.js`: Ed25519-signed canonical-JSON credentials,
  issuer registry (domain-proof onboarding, key rotation, key compromise), anchoring gate,
  revocation, single-use presentations, rate-limited lookups, 128-bit IDs.
- NEW `backend/scripts/attack-suite.js` + `npm run attack-suite` -> `ATTACK_RESULTS.md`.
- Verified on merge: suite re-runs and reproduces ATTACK_RESULTS.md exactly; all backend
  files pass `node --check`.
- NOT yet wired into Express routes, Mongo models, PDF or contract. Not built: Merkle
  batching, ciphertext on IPFS, maker-checker.

## Merge corrections
- Removed `backend/.signing-key.pem` (a private key; it was in stages 1-2 and is git-ignored).
  The app regenerates it on first run. Rotate it if that zip was ever shared.
- Fixed nested folder layout of the third zip (`credo/credo/` -> `credo/`).
- Deck `docs/hackiton_review1.pptx` cross-checked against code: stack, versions, attack
  numbers (10 scenarios at 100/100, baseline 0/100 on 6) and the "core not yet on routes"
  caveat all match.
- Naming mismatch to decide: deck says CREDO, code/UI says Credo.

# Credo rebrand + olive theme + more certificate options
Project renamed Credo (IDs now CRD-..., offline pass tag CRD1, localStorage keys credo_*). Theme: white base, olive greens, clay accent (tokens olive-* / clay-* in frontend/src/index.css). Certificate Design now also has: certificate title text, header text style (UPPERCASE / Title Case / as typed), header size, background colour, and fonts Montserrat, Playfair Display, Lora (bundled via @fontsource; run `npm install` in backend).
