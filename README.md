## Base ↔︎ Solana Bridge Tutorial

This repository is a step‑by‑step tutorial showing how to move value and invoke Base L2 contracts from Solana. It contains two parallel implementations:
- **Solana CLI keypair flow** – uses a locally stored Phantom/CLI keypair.
- **Coinbase CDP wallet flow** – uses CDP-managed wallets and signing.

The examples cover:
1) Bridging SOL from Solana devnet to an EVM address on Base Sepolia.
2) Calling a Base smart contract from a Solana transaction.

Everything runs against Solana **devnet** and Base **Sepolia** for safety.

## Project layout
- `src/sol2base/` – SOL → Base bridge using a local keypair (`phantom.json`).
- `src/sol2base-mainnet/` – SOL → Base bridge (Mainnet) using a local keypair.
- `src/cdp-sol2base/` – SOL → Base bridge using a CDP wallet.
- `src/sol-contract-call/` – Solana keypair initiating a contract call on Base.
- `src/cdp-sol-contract-call/` – Same contract-call flow using a CDP wallet.
- `web/` – Next.js frontend for SOL → Base bridging.
- `src/utils/` – shared config and helpers (PDAs, address formatting, salts).
- `generate-call-data.js` – helper to encode EVM call data for demos.

## Prerequisites
- Node.js 18+ and npm.
- `ts-node` is included in dev dependencies.
- A Solana devnet keypair exported to `phantom.json` (ignored by git).
- For CDP flows: Coinbase CDP API credentials (see below).

## Setup
```bash
npm install
cp .env.example .env # if you create one; see variables below
# Add your Phantom/CLI secret key JSON to phantom.json
```

### Environment variables (CDP flows)
Add to `.env`:
```
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...
```
`dotenv` is auto-loaded in CDP entry points.

## Running the examples

### 1) Bridge SOL → Base with a local keypair
```bash
npm run sol2base
```
Edits to make:
- Set the destination EVM address in `src/sol2base/index.ts`.
- Ensure `phantom.json` holds the signer you want to spend from (fund it on devnet).

### 2) Bridge SOL → Base with a CDP wallet
```bash
npm run cdp-sol2base
```
The script will create (or reuse) a CDP Solana account, faucet it if needed, sign via CDP, and submit the bridge transaction.

### 3) Call a Base contract from Solana (local keypair)
```bash
npm run sol-contract-call
```
Configure:
- Target contract and call data in `src/sol-contract-call/index.ts`.
- Use `generate-call-data.js` to produce call data for your ABI.

### 4) Call a Base contract from Solana (CDP wallet)
```bash
npm run cdp-sol-contract-call
```
Configure the target contract and call data in `src/cdp-sol-contract-call/index.ts`.

### 5) Web App Bridge
```bash
npm install
npm run web:dev
```
Open [http://localhost:3000](http://localhost:3000) to bridge SOL from Solana to Base using the UI.

## Notes & tips
- Networks are hardcoded to Solana devnet and Base Sepolia; adjust in `src/utils/config.ts` if needed.
- Gas/payment PDAs and discriminator bytes are already encoded; focus on destinations and payloads.
- The bridge amount and destination are passed at the entry points (`index.ts` files); tweak those for your tests.
- Use `generate-call-data.js` to quickly encode simple function selectors and args:
  ```bash
  node generate-call-data.js
  ```

## Troubleshooting
- If you see `EVM address length` or similar, double-check the 0x-prefixed address strings.
- Ensure `phantom.json` matches the account funded on devnet.
- CDP flows require valid API keys and wallet secret; faucet requests are automatic when balance < 0.05 SOL.

