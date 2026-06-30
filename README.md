# ProcureMinds AI Pro

**ProcureMinds AI Pro** is a GenLayer-native procurement dApp. Buyers create RFQs, suppliers submit website/proposal URLs, and a GenLayer Intelligent Contract reads web evidence, evaluates subjective vendor fit, writes scorecards on-chain, and selects a winning supplier.

## Why this is GenLayer-native

Traditional deterministic smart contracts are not enough for procurement evaluation because the contract has to:

- read live supplier websites and proposal pages,
- interpret unstructured text,
- judge qualitative fit against RFQ requirements,
- classify vendor risk,
- select a supplier using transparent but subjective procurement reasoning.

GenLayer makes this possible through Intelligent Contracts, web access, LLM calls, and validator consensus around non-deterministic outputs.

## Live Workflow

1. Create an RFQ with requirements, evaluation criteria, and budget.
2. Submit supplier website/proposal URLs, price, and claims.
3. Evaluate each supplier through the GenLayer contract.
4. Review scorecards: requirements fit, credibility, delivery, price, risk control.
5. Select the winner using deterministic tie breakers: score, lower risk, then lower price.
6. Export a procurement packet JSON for the submission record.

## Project structure

```txt
contracts/
  procureminds_ai_pro.py      # GenLayer Intelligent Contract
frontend/
  src/app/page.tsx            # Next.js UI
  src/lib/live.ts             # GenLayerJS adapter
scripts/
  deploy_notes.md             # manual deployment guide
  deploy.ts                   # SDK deployment template
docs/
  ARCHITECTURE.md
  DEPLOYMENT.md
  GITHUB_PUSH.md
  SUBMISSION_GUIDE.md
  TESTING.md
tests/
  contract_test_plan.md
SUBMISSION.md
WALKTHROUGH_SCRIPT.md         # walkthrough recording script
```

## Quick start

```bash
# 1) Install frontend dependencies
cd frontend
npm install

# 2) Run local UI
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Live GenLayer setup

Useful GenLayer links:

- Builder portal: https://portal.genlayer.foundation/
- GenLayer Labs GitHub: https://github.com/genlayerlabs
- GenLayer docs: https://docs.genlayer.com

### 1. Start local GenLayer environment

```bash
npm install -g genlayer
genlayer init
genlayer up
```

Default local RPC: `http://localhost:4000/api`.

### 2. Deploy the contract

Option A - GenLayer Studio:

1. Open local Studio.
2. Paste or load `contracts/procureminds_ai_pro.py`.
3. Deploy.
4. Copy the contract address.

Option B - CLI:

```bash
genlayer deploy --contract contracts/procureminds_ai_pro.py
```

### 3. Connect the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_contract_address
NEXT_PUBLIC_GENLAYER_CHAIN=localnet
NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
```

Then run:

```bash
cd frontend
npm run dev
```

## Scripts

```bash
npm run dev                  # run the frontend from the repo root
npm run build                # Vercel-compatible production build
npm run typecheck            # TypeScript check
npm run contract:syntax      # Python syntax check
npm run contract:lint        # requires genvm-linter
npm run frontend:typecheck   # TypeScript check
npm run frontend:build       # Next.js production build
npm run deploy:cli           # deploy via GenLayer CLI
```

## Vercel

This repository includes `vercel.json`, so Vercel can deploy from the repo root while building the Next.js app in `frontend/`.

For a live GenLayer deployment, set:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_contract_address
NEXT_PUBLIC_GENLAYER_CHAIN=localnet
NEXT_PUBLIC_GENLAYER_RPC_URL=https://your-public-genlayer-rpc
```

## Contract highlights

- Production-style non-deterministic block:
  - storage reads happen before `leader_fn`,
  - web/LLM work happens inside `leader_fn`,
  - storage writes happen only after consensus.
- Validator re-runs the evaluation independently and checks stable decision fields.
- Scorecard dimensions are stored on-chain for auditability.
- Winner selection is deterministic after supplier evaluation.

## Builder Program checklist

- [ ] Public GitHub repository
- [ ] Contract deployed to GenLayer Studio / testnet
- [ ] Contract address added to frontend env
- [ ] Vercel deployment created
- [ ] 1-2 minute walkthrough video recorded
- [ ] `SUBMISSION.md` links updated

## License

MIT
