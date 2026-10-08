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
