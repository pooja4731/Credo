# Credo — Deployment Guide

## 1. Deploy the smart contract to a public testnet

Recommended testnets: Sepolia (Ethereum) or Polygon Amoy (cheaper/faster,
same tooling). Steps below use Sepolia as the example.

1. Get an RPC URL from a provider (Alchemy, Infura, or a public endpoint).
2. Get testnet ETH from a faucet (e.g. `sepoliafaucet.com`) for your
   platform wallet address.
3. In `blockchain/.env` (create it, `hardhat.config.js` already reads
   `RPC_URL`/`PRIVATE_KEY`):
   ```
   RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
   PRIVATE_KEY=0x<platform-wallet-private-key>
   ```
4. Deploy:
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network testnet
   ```
5. This writes `backend/utils/contractConfig.json` with the deployed
   address + ABI — commit this file (or regenerate it during backend
   deploy) so the backend can find the contract.
6. **Verify the contract on Etherscan** (optional but recommended for
   transparency, since this is a public-trust system):
   ```bash
   npx hardhat verify --network testnet <deployed-address>
   ```

Security note for going beyond a testnet: the contract's `owner` is a
single EOA that controls issuer approval. Before mainnet, replace this
with a multisig (e.g. Gnosis Safe) as the owner, or add a timelock —
a single compromised key currently controls which institutions can issue
certificates.

## 2. Host the backend

Any Node-friendly host works (Render, Railway, Fly.io, a plain VPS with
pm2). General steps:

1. Push the `backend/` folder (or the whole repo) to your host.
2. Set environment variables from `.env.example` — production values,
   real secrets, not the placeholders.
3. Set `NODE_ENV=production`.
4. Set `CLIENT_URL` to your deployed frontend's real origin (this is what
   CORS and the QR-code verify links use — get this wrong and QR codes
   point at localhost).
5. Point `MONGO_URI` at a production MongoDB (MongoDB Atlas free/shared
   tier is fine to start).
6. Run the seed script once against production data to create your real
   Super Admin:
   ```bash
   npm run seed
   ```
   Then immediately log in and change that password.
7. Start with a process manager, not `node server.js` directly, so it
   restarts on crash:
   ```bash
   npm install -g pm2
   pm2 start server.js --name credo-backend
   ```
   (Most managed hosts — Render, Railway — handle this restart behavior
   for you via their own `npm start` / health-check mechanism instead.)

## 3. Host the frontend

Vercel or Netlify are the path of least resistance for a Vite app.

1. Connect the repo, set the build command `npm run build`, output
   directory `dist`.
2. Set `VITE_API_URL` to your deployed backend's `/api` URL.
3. Deploy.

If hosting frontend and backend on different subdomains, double check the
backend's CORS `origin` matches exactly (including `https://` and no
trailing slash).

## 4. Environment variable checklist

**Backend**
| Variable | Notes |
|---|---|
| `MONGO_URI` | Production MongoDB connection string |
| `JWT_SECRET` | Long random string, rotate periodically |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `CLIENT_URL` | Exact frontend origin, used for CORS + QR links |
| `RPC_URL` | Testnet/mainnet RPC endpoint |
| `PRIVATE_KEY` | Platform wallet — **use a secrets manager, never commit** |
| `CONTRACT_ADDRESS` | Only needed if `contractConfig.json` isn't present |
| `PINATA_JWT` | Or `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` |
| `PINATA_GATEWAY` | e.g. `https://gateway.pinata.cloud/ipfs` |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Tune for expected traffic |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Only read by `scripts/seed.js` |

**Frontend**
| Variable | Notes |
|---|---|
| `VITE_API_URL` | Backend's `/api` base URL |

## 5. Pre-launch security pass

- [ ] `PRIVATE_KEY` is in a secrets manager (host's env var UI, or a
      vault), not in any committed file.
- [ ] `JWT_SECRET` is unique to production, not the `.env.example` value.
- [ ] CORS `origin` in `server.js` is the exact production frontend URL —
      not a wildcard.
- [ ] Rate limits (`RATE_LIMIT_MAX`, the stricter auth-route limiter) are
      appropriate for expected traffic — too loose invites brute-forcing,
      too tight locks out real users during spikes.
- [ ] MongoDB is not publicly bind-accessible — use IP allowlisting or a
      VPC, and a database user with least-privilege access.
- [ ] The contract's `owner` wallet is a multisig, not a single key, if
      this handles real credentials at any meaningful scale.
- [ ] Pinata keys are scoped (Pinata supports restricting keys to pinning
      only, not account-wide access).
- [ ] Institution approval requires manually verifying the institution is
      real before granting on-chain issuer rights — the platform has no
      automated KYC for this by design; that judgment call is yours.
- [ ] `NODE_ENV=production` is set (disables verbose error stack traces
      in API responses — see `middleware/errorHandler.js`).
- [ ] Backups: MongoDB automated backups configured; IPFS pins on Pinata
      don't need backup (content-addressed and replicated by Pinata), but
      confirm your Pinata plan's pin limits match expected certificate
      volume.

## 6. Post-launch

- Monitor the Blockchain Explorer page periodically for `failed`
  transactions — these indicate gas/RPC issues that need attention.
- Rotate `JWT_SECRET` on any suspected compromise (invalidates all active
  sessions — plan for that user-facing impact).
- If moving from testnet to mainnet later, redeploy the contract fresh
  (do not attempt to migrate state) and update `contractConfig.json` /
  `CONTRACT_ADDRESS` — existing testnet certificates won't carry over and
  should be reissued or clearly marked as testnet-only in your rollout
  communication.
