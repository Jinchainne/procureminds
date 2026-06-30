# Deployment Guide

## Local development

```bash
npm install -g genlayer
genlayer init
genlayer up
```

Default local network endpoints:

- Studio UI: `http://localhost:8080`
- RPC/API: `http://localhost:4000/api`

## Contract deployment

### Studio deployment

1. Open GenLayer Studio.
2. Create a contract file named `procureminds_ai_pro.py`.
3. Paste the content from `contracts/procureminds_ai_pro.py`.
4. Deploy.
5. Copy the contract address.
6. Confirm the transaction was accepted/finalized and execution succeeded.

### CLI deployment

```bash
genlayer deploy --contract contracts/procureminds_ai_pro.py
```

### SDK deployment

```bash
GENLAYER_CHAIN=studionet npm run deploy:sdk
```

Set `GENLAYER_PRIVATE_KEY` if you want to deploy with a specific signer.

## Frontend deployment

### Local

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Vercel

Set environment variables:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xb2123b641921Dc1E03fAAE0af4f71C4e184aA7c7
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
```

For the built-in `studionet` preset, leave `NEXT_PUBLIC_GENLAYER_RPC_URL` unset unless you intentionally need a custom public RPC.

## Notes

- Use live mode for the Builder submission if possible.
- The public UI shows a setup-required state until `NEXT_PUBLIC_CONTRACT_ADDRESS` is configured.
