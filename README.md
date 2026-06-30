# ProcureMinds AI Pro

ProcureMinds AI Pro is a GenLayer-native procurement dApp that turns supplier evaluation into an auditable on-chain workflow. Buyers create RFQs, suppliers submit website and proposal URLs, and a GenLayer Intelligent Contract reads live web evidence, evaluates qualitative vendor fit, stores scorecards, classifies risk, and selects a winning supplier.

This repository is built for the GenLayer Builder Program and is designed to run as a live application, not as a demo-mode mockup.

## Live Deployment

| Item | Value |
| --- | --- |
| Live app | https://procureminds.vercel.app |
| Repository | https://github.com/Jinchainne/procureminds |
| Network | `studionet` |
| Contract | `0xb2123b641921Dc1E03fAAE0af4f71C4e184aA7c7` |
| Builder portal | https://portal.genlayer.foundation |
| GenLayer docs | https://docs.genlayer.com |

## Why GenLayer

Procurement decisions are not purely deterministic. A useful procurement committee has to inspect unstructured evidence, compare supplier claims against requirements, understand proposal language, reason about credibility, and classify delivery risk.

Traditional smart contracts cannot do that because they cannot read supplier websites, interpret proposal text, or make subjective judgments from external data. ProcureMinds AI Pro uses GenLayer Intelligent Contracts so the contract can:

- read live supplier websites and proposal pages,
- ask an LLM to produce structured procurement scorecards,
- have validators independently re-run and check subjective outputs,
- store accepted scorecards on-chain,
- select the winner through transparent deterministic tie breakers.

## Core Features

- Live RFQ creation with requirements, scoring criteria, and budget.
- Supplier submission with website URL, proposal URL, price, and claims.
- GenLayer-powered supplier evaluation using web evidence and LLM reasoning.
- Validator-backed scorecard validation for non-deterministic outputs.
- On-chain score dimensions for fit, credibility, delivery, price, and risk control.
- Risk classification and verdicts: `APPROVED`, `NEEDS_REVIEW`, or `REJECTED`.
- Deterministic winner selection after evaluation.
- Runtime panel for chain, contract, signer, RFQ count, and current RFQ state.
- Procurement packet export as JSON for submission and audit records.

## Product Workflow

1. A buyer creates an RFQ with detailed requirements, evaluation criteria, and budget.
2. Suppliers submit website and proposal URLs, pricing, and written claims.
3. The GenLayer contract renders supplier web/proposal evidence.
4. The contract asks an LLM for a structured procurement scorecard.
5. Validators independently verify stable decision fields and score bands.
6. Accepted scorecards are stored on-chain.
7. The buyer selects the winner using deterministic tie breakers: highest score, lower risk, then lower price.
8. The UI exports the full procurement packet for review or submission.

## Architecture

```txt
contracts/
  procureminds_ai_pro.py      GenLayer Intelligent Contract

frontend/
  public/brand/               Brand assets used by the UI
  src/app/page.tsx            Next.js application interface
  src/app/globals.css         Application styling
  src/lib/client.ts           Runtime client selection
  src/lib/live.ts             GenLayerJS live adapter
  src/lib/types.ts            Shared UI/client types

scripts/
  deploy.ts                   SDK deployment script with verification
  deploy_notes.md             Deployment notes

docs/
  ARCHITECTURE.md             Component and data model notes
  DEPLOYMENT.md               Deployment guide
  SUBMISSION_GUIDE.md         Builder submission copy
  TESTING.md                  Testing checklist

tests/
  contract_test_plan.md       Contract behavior test plan

SUBMISSION.md                 Builder submission summary
WALKTHROUGH_SCRIPT.md         Recording script for a short walkthrough
```

## Intelligent Contract Design

The contract is implemented in `contracts/procureminds_ai_pro.py`.

### Stored RFQ Data

- RFQ creator
- title
- requirements
- evaluation criteria
- budget
- status
- supplier count
- selected winner
- evaluation summary

### Stored Supplier Data

- supplier name
- submitter wallet
- website URL
- proposal URL
- price
- claims
- verdict
- risk rating
- overall score
- scorecard dimensions
- reason
- evidence summary
- red flags

### Scorecard Dimensions

Each supplier is scored from `0` to `100` across five dimensions:

- requirements fit
- credibility
- delivery capability
- price reasonableness
- risk control

The overall score maps to verdicts:

- `APPROVED`: score >= 80
- `NEEDS_REVIEW`: score 50-79
- `REJECTED`: score < 50

### Non-Deterministic Evaluation Pattern

The contract follows a production-style GenLayer pattern:

- deterministic storage reads happen before the non-deterministic block,
- web rendering and LLM calls happen inside the leader function,
- validators independently re-run the evaluation,
- validation checks stable fields, score bands, verdicts, and risk proximity,
- storage writes happen only after consensus returns an accepted scorecard.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Python 3.10+
- GenLayer CLI for local Studio/localnet workflows

### Install Dependencies

```bash
npm install
cd frontend
npm install
```

### Run the Frontend Locally

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

If `NEXT_PUBLIC_CONTRACT_ADDRESS` is empty, the UI shows setup mode and disables live write actions.

## Environment Variables

For the current live `studionet` deployment:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xb2123b641921Dc1E03fAAE0af4f71C4e184aA7c7
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
```

Leave `NEXT_PUBLIC_GENLAYER_RPC_URL` unset when using the built-in `studionet` chain preset. Set it only when using a custom public RPC endpoint.

For local Studio/localnet:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_local_contract_address
NEXT_PUBLIC_GENLAYER_CHAIN=localnet
NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
```

## Deploying the Contract

The SDK deployment script deploys the contract, waits for finalization, checks the execution result, verifies the deployed contract by calling `get_total_rfqs`, and writes the frontend environment file.

```bash
GENLAYER_CHAIN=studionet npm run deploy:sdk
```

Optional signer:

```bash
GENLAYER_PRIVATE_KEY=0x_your_private_key GENLAYER_CHAIN=studionet npm run deploy:sdk
```

Local GenLayer Studio flow:

```bash
npm install -g genlayer
genlayer init
genlayer up
genlayer deploy --contract contracts/procureminds_ai_pro.py
```

## Deploying the Frontend

The root `vercel.json` configures Vercel to install, build, and output the Next.js app from `frontend/`.

Required Vercel production variables:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xb2123b641921Dc1E03fAAE0af4f71C4e184aA7c7
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
```

Deploy:

```bash
npx vercel deploy --prod
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the frontend from the repository root. |
| `npm run build` | Build the Next.js frontend for production. |
| `npm run test` | Compile the contract and run TypeScript type checking. |
| `npm run typecheck` | Run frontend TypeScript checking. |
| `npm run contract:syntax` | Run Python syntax validation for the contract. |
| `npm run contract:lint` | Run GenVM linting when `genvm-lint` is installed. |
| `npm run deploy:sdk` | Deploy the GenLayer contract with SDK verification. |
| `npm run deploy:cli` | Deploy with the GenLayer CLI. |

## Verification

Local verification used for this repository:

```bash
npm run test
npm run build
```

Live contract verification:

```ts
await client.readContract({
  address: "0xb2123b641921Dc1E03fAAE0af4f71C4e184aA7c7",
  functionName: "get_total_rfqs",
  args: [],
  stateStatus: "accepted"
});
```

Expected result on a fresh deployment is `0`.

## Builder Submission Notes

ProcureMinds AI Pro is submitted under:

```txt
Builder -> Projects
```

Recommended submission summary:

```txt
ProcureMinds AI Pro is a GenLayer Intelligent Contract project for AI-powered procurement evaluation. Buyers create an RFQ, suppliers submit website/proposal URLs, and the contract reads live web data, evaluates qualitative vendor fit, scores suppliers from 0-100, classifies risk, and selects the winning supplier on-chain.

This project is GenLayer-native because the core logic requires subjective judgment, live web access, and LLM-based consensus. A traditional smart contract cannot read supplier proposals or compare credibility, delivery capability, price reasonableness, and risk.
```

## Security and Operational Notes

- The app is configured for live GenLayer operation and does not rely on public mock/demo data.
- `NEXT_PUBLIC_*` variables are visible in the browser by design. Do not put private keys in frontend environment variables.
- Use `GENLAYER_PRIVATE_KEY` only in a secure local or CI environment when deploying contracts.
- Always confirm transaction execution success, not only finalization status, before publishing a new contract address.

## License

MIT
