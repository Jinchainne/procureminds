# Architecture

## Components

### 1. GenLayer Intelligent Contract

File: `contracts/procureminds_ai_pro.py`

Responsibilities:

- store RFQs,
- store supplier submissions,
- render supplier website/proposal pages,
- call an LLM for procurement scorecards,
- validate non-deterministic outputs through independent validator evaluation,
- store final scorecards,
- select an on-chain winner.

### 2. Frontend

File: `frontend/src/app/page.tsx`

Responsibilities:

- RFQ creation form,
- supplier submission form,
- evaluation dashboard,
- scorecard visualization,
- transaction log,
- live GenLayer mode with explicit setup state when no contract address is configured.

### 3. Client adapters

- `frontend/src/lib/live.ts`: GenLayerJS read/write adapter.
- `frontend/src/lib/live.ts`: GenLayerJS adapter for live contract calls.

## Data model

### RFQ

- title
- requirements
- evaluation criteria
- budget
- status
- supplier count
- winner
- evaluation summary

### Supplier

- name
- wallet
- website URL
- proposal URL
- price
- claims
- verdict
- risk
- scorecard dimensions
- reason
- evidence
- red flags

## Evaluation scorecard

The contract stores five dimensions:

1. requirements fit,
2. credibility,
3. delivery capability,
4. price reasonableness,
5. risk control.

The overall score maps to verdicts:

- `APPROVED`: score >= 80
- `NEEDS_REVIEW`: score 50-79
- `REJECTED`: score < 50

## Winner selection

The contract selects the highest eligible score among `APPROVED` and `NEEDS_REVIEW` suppliers. Ties are resolved by:

1. lower risk,
2. lower price.
