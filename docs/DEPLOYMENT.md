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
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_contract_address
NEXT_PUBLIC_GENLAYER_CHAIN=localnet
NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
NEXT_PUBLIC_DEMO_MODE=false
```

For a public Vercel demo, use a public GenLayer RPC/studionet/testnet configuration rather than a localhost RPC.

## Notes

- Use demo mode for UI recording if the GenLayer deployment is not ready.
- Use live mode for the Builder submission if possible.
- Keep the same browser session when testing local account-based flows, because the demo SDK account is created in the client session.
