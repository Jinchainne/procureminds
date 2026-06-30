# Builder Submission Guide

## Contribution type

Choose:

```txt
Builder -> Projects
```

## Title

```txt
ProcureMinds AI Pro - AI Procurement Committee on GenLayer
```

## Description to paste

```txt
ProcureMinds AI Pro is a GenLayer Intelligent Contract project for AI-powered procurement evaluation. Buyers create an RFQ, suppliers submit website/proposal URLs, and the contract reads live web data, evaluates qualitative vendor fit, scores suppliers from 0-100, classifies risk, and selects the winning supplier on-chain.

This project is GenLayer-native because the core logic requires subjective judgment, live web access, and LLM-based consensus. A traditional smart contract cannot read supplier proposals or compare credibility, delivery capability, price reasonableness, and risk.

The submission includes a Python Intelligent Contract, a Next.js live UI, GenLayerJS adapter, test plan, deploy notes, and walkthrough script. The contract uses a production-style leader/validator pattern where validators independently re-run evaluation and compare stable decision fields.
```

## Links to prepare

- Builder portal: https://portal.genlayer.foundation/
- GenLayer Labs GitHub: https://github.com/genlayerlabs
- GitHub repository
- Vercel live app URL
- Contract address
- Walkthrough video

## Walkthrough video structure

1. Open the live app and show the setup/runtime panel.
2. Create an RFQ and submit two suppliers after the contract address is configured.
3. Show scorecard dimensions, risk, evidence, and red flags.
4. Select or confirm the winner.
5. Export the procurement packet JSON.
6. Explain why GenLayer is required for web evidence, qualitative evaluation, and validator consensus.
