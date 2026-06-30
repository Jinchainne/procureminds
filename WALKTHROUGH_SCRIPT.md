# Walkthrough Script

## 0:00-0:15 - Problem

Procurement decisions are subjective. Buyers need to compare supplier claims, websites, proposals, price, credibility, delivery ability, and risk. A normal smart contract cannot do this because it cannot read the web or judge natural language.

## 0:15-0:30 - Why GenLayer

ProcureMinds AI Pro uses a GenLayer Intelligent Contract. The contract reads supplier websites/proposal URLs, asks an LLM to score the proposal, and validators independently check the decision fields before the result is stored on-chain.

## 0:30-0:50 - Create RFQ

Create an RFQ for an AI procurement software vendor with budget and evaluation criteria after the contract address is configured.

## 0:50-1:15 - Submit suppliers

Submit two suppliers with website URL, proposal URL, price, and supplier claims.

## 1:15-1:40 - Evaluate suppliers

Click Evaluate. Show the contract-generated scorecard:

- requirements fit,
- credibility,
- delivery capability,
- price reasonableness,
- risk control,
- overall score,
- verdict,
- risk,
- reason/evidence.

## 1:40-2:00 - Select winner

Click Select winner. Explain that final selection uses deterministic tie breakers after AI evaluation: highest eligible score, lower risk, then lower price. Export the packet JSON for the submission record.

## Closing line

ProcureMinds AI Pro is GenLayer-native because the business logic depends on web access, unstructured proposal understanding, and consensus over subjective procurement judgment.
