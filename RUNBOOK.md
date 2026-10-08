# Credo — End-to-End Runbook

This walks through running the full stack locally and exercising the complete
flow: institution registers → admin approves → certificate is issued →
anyone verifies it. Every command below is real and copy-pasteable; none of
it was run inside the build sandbox (no local MongoDB/Pinata/RPC access
there — see note at the bottom), so treat this as a guide to execute
yourself and report back anything that doesn't match.

## 0. Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)
- A Pinata account (free tier is fine) — get API key/secret or a JWT from
  https://app.pinata.cloud/developers/api-keys
- An Ethereum-compatible RPC endpoint. Easiest for local testing: run a
  local Hardhat node (step 2 below) — no real ETH or external RPC needed.

## 1. Install dependencies

```bash
cd credo/blockchain && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

## 2. Start a local blockchain and deploy the contract

In one terminal:

```bash
cd credo/blockchain
npx hardhat node
```

This starts a local chain on `http://127.0.0.1:8545` and prints 20 funded
test accounts with their private keys — copy the first account's private
key, you'll use it as the platform wallet.

In a second terminal:

```bash
cd credo/blockchain
npx hardhat run scripts/deploy.js --network localhost
```

This deploys `Certificate.sol` and writes
`backend/utils/contractConfig.json` automatically with the deployed address
and ABI.

## 3. Configure the backend

```bash
cd credo/backend
cp .env.example .env
```

Edit `.env`:

- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — any long random string
- `RPC_URL=http://127.0.0.1:8545` (from step 2)
- `PRIVATE_KEY` — the Hardhat test account private key from step 2 (this
  wallet acts as the platform's on-chain signer)
- `PINATA_JWT` (or `PINATA_API_KEY`/`PINATA_SECRET_API_KEY`) — from your
  Pinata account
- `PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs`
- `CLIENT_URL=http://localhost:5173`

## 4. Seed a Super Admin and start the backend

```bash
npm run seed:demo   # creates Super Admin + a demo approved institution + student
npm run dev
```

You should see:
```
MongoDB connected: <host>
Credo backend running on port 5000 [development]
```

The seed output prints login credentials — save them. Demo institution
logins skip the approval wait for a quick check, but the full flow below
walks through approval from scratch with a *new* institution so you can
verify that path too.

## 5. Start the frontend

```bash
cd ../frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev
```

Visit `http://localhost:5173`.

## 6. Full flow — via the UI

1. **Register an institution**: go to "Register Your Institution" on the
   landing page. Fill in the form. Leave wallet address blank for now (you
   can add it later in the profile page, or paste one of the Hardhat test
   account addresses from step 2's node output).
2. **Log in as Super Admin**: use the credentials printed by `npm run seed`.
   Go to the Admin Dashboard — your new institution should appear under
   "Pending Institution Approvals". Click **Approve**.
   - If the institution has no wallet address yet, approval succeeds at
     the platform level but skips the on-chain issuer grant. Log in as the
     institution, go to Profile, paste a wallet address (use one of the
     Hardhat node's printed addresses), save, then have the Super Admin
     re-approve to grant on-chain rights.
3. **Log in as the institution** and go to the dashboard. Issue a single
   certificate via the form, or try Bulk Upload with a small `.xlsx`/`.csv`
   (columns: `studentName`, `rollNumber`, `department`, `degree`).
4. **Verify it publicly**: log out (or open a private window), go to
   `/verify`, and paste the certificate ID shown after issuance
   (format `CRD-2026-XXX-XXXXXXXX`). You should see a "Valid certificate"
   result with the transaction hash and block number.
5. **Check the blockchain explorer**: as Super Admin, visit
   "Blockchain Explorer" from the dashboard — you should see the `issue`
   transaction with status `confirmed`.

## 7. Full flow — via curl (for scripting / CI)

```bash
API=http://localhost:5000/api

# Register an institution
curl -s -X POST $API/auth/register/institution -H "Content-Type: application/json" -d '{
  "name": "Registrar Name", "email": "reg@testu.edu", "password": "TestPass123!",
  "institutionName": "Test University", "institutionCode": "TESTU"
}' | tee /tmp/inst.json

INST_TOKEN=$(jq -r .token /tmp/inst.json)

# Log in as Super Admin (from seed output)
curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{
  "email": "admin@credo.app", "password": "ChangeMe123!"
}' | tee /tmp/admin.json

ADMIN_TOKEN=$(jq -r .token /tmp/admin.json)

# List pending institutions, grab the ID
curl -s $API/admin/institutions?status=pending -H "Authorization: Bearer $ADMIN_TOKEN" | jq

INST_ID="<paste _id from above>"
curl -s -X PATCH $API/admin/institutions/$INST_ID/approve -H "Authorization: Bearer $ADMIN_TOKEN"

# Issue a certificate as the institution
curl -s -X POST $API/institution/certificates/issue \
  -H "Authorization: Bearer $INST_TOKEN" -H "Content-Type: application/json" -d '{
  "studentName": "Test Student", "rollNumber": "TESTU2026001",
  "department": "Computer Science", "degree": "B.Tech"
}' | tee /tmp/cert.json

CERT_ID=$(jq -r .certificate.certificateId /tmp/cert.json)

# Verify publicly, no auth
curl -s $API/verify/$CERT_ID | jq
```

## 8. What to watch for / likely failure points

- **"Institution is not approved to issue certificates"** — approval
  didn't grant on-chain rights because no wallet address was set at
  approval time. Add a wallet, then re-approve.
- **Pinata upload errors** — double-check `PINATA_JWT` (or key/secret) and
  that the key has pinning permissions.
- **Blockchain issuance failing with a nonce/gas error** — make sure the
  Hardhat node from step 2 is still running; it resets state on restart,
  which invalidates any previously deployed contract address in
  `contractConfig.json` (redeploy after restarting the node).
- **CORS errors in the browser console** — check `CLIENT_URL` in the
  backend `.env` matches the frontend's actual origin exactly.

## 9. New: certificate types + registering existing certificates

Two additions to the institution dashboard, on top of the original degree-only issuance flow:

### 9.1 Certificate types

Issuance now supports five certificate types, each with its own extra
fields (in addition to student name / roll number / department / degree):

| Type | Extra fields |
|---|---|
| `degree` | none (original behavior) |
| `internship` | organization, role, start date, end date |
| `course` | course name, provider, duration (hours), grade |
| `competition` | event name, position/rank, category |
| `other` | free-text description |

- `GET /api/institution/certificates/types` returns this list (label +
  fields) so the frontend form renders the right inputs per type.
- `POST /api/institution/certificates/issue` now also accepts
  `certificateType` and `typeDetails` (an object matching the fields
  above). Omitting both behaves exactly as before (defaults to `degree`).
- The generated PDF's title and body copy change per type (e.g.
  "Certificate of Internship" instead of "Certificate of Completion").

### 9.2 Registering an existing certificate

For certificates that already exist — an old paper certificate that was
scanned, or a PDF issued before Credo was adopted — there's now a
"Register Existing Certificate" panel on the institution dashboard that
makes them verifiable **without regenerating a new document**:

1. Institution uploads the original file (PDF, PNG, JPG, or WEBP) plus the
   same student/type metadata used for new issuance.
2. Backend hashes the **exact uploaded bytes** (SHA-256), then hashes a
   canonical JSON payload that binds that file hash to the certificate's
   metadata — this combined hash is what goes on-chain, so verification
   works identically to freshly-issued certificates.
3. The original file (unmodified) and the metadata JSON are both pinned to
   IPFS via Pinata.
4. A QR code is generated pointing at `/verify?certificateId=...`.
5. Everything is recorded via the same `issueCertificateOnChain` call used
   by normal issuance, and saved to MongoDB with `source: "registered_existing"`.

Endpoint: `POST /api/institution/certificates/register-existing`
(multipart/form-data: `file`, `studentName`, `rollNumber`, `department`,
`degree`, `certificateType`, `typeDetails` as a JSON string, optional
`issueDate`).

The public `/verify` page now also shows: certificate type, type-specific
details (e.g. internship organization/role), whether a certificate was
freshly issued vs. a registered existing one, the certificate's QR code,
and — for registered existing certificates — the original file's hash
alongside the on-chain hash, so a verifier can confirm the exact document
hasn't been altered.

**Nothing about the original issuance flow changed** — existing
certificates in the database, and the original bulk-upload path, keep
working exactly as before; `certificateType` simply defaults to `"degree"`
and `source` defaults to `"issued"` for anything that doesn't specify
otherwise.

## Honest note on sandbox verification

I could not run this flow inside the build sandbox — it has no MongoDB, no
outbound access to Pinata or a public RPC, and no Solidity compiler
network access. What *is* verified from the sandbox: the smart contract's
logic (traced by hand + written tests), every backend module loading and
responding correctly through a live Express instance, the bulk-upload
Excel parser running against a real generated `.xlsx` file, and the full
frontend building and serving every route. The piece that's only
paper-verified is the live integration across all three systems — that's
what this runbook is for.
