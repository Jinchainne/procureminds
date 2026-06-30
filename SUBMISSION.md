# ProcureMinds AI Pro Submission

## Project Name

ProcureMinds AI Pro

## Category

Builder -> Projects

## Short Description

An AI procurement committee powered by GenLayer Intelligent Contracts that reads supplier websites and proposal URLs, evaluates vendors, scores risk, and selects the winning supplier on-chain.

## Why this dies without GenLayer

ProcureMinds AI Pro depends on GenLayer because its core business logic requires a smart contract to read live web content and make subjective procurement judgments. A traditional Solidity contract cannot read supplier websites, understand proposal text, compare claims against RFQ requirements, or select the best vendor based on qualitative reasoning.

## What is included

- Python GenLayer Intelligent Contract
- Production-style leader/validator evaluation pattern
- Next.js frontend
- Live GenLayerJS adapter
- Live GenLayer setup mode
- Deployment guide
- Testing checklist
- Walkthrough script

## Links

- Builder Portal: https://portal.genlayer.foundation/
- GenLayer Labs GitHub: https://github.com/genlayerlabs
- GitHub: https://github.com/Jinchainne/procureminds
- Live App / Vercel: https://procureminds.vercel.app
- Contract Address: TODO
- Walkthrough Video: TODO

## Form description

```txt
ProcureMinds AI Pro is a GenLayer Intelligent Contract project for AI-powered procurement evaluation. Buyers create an RFQ, suppliers submit website/proposal URLs, and the contract reads live web data, evaluates qualitative vendor fit, scores suppliers from 0-100, classifies risk, and selects the winning supplier on-chain.

This project is GenLayer-native because the core logic requires subjective judgment, live web access, and LLM-based consensus. A traditional smart contract cannot read supplier proposals or compare credibility, delivery capability, price reasonableness, and risk.

The submission includes a Python Intelligent Contract, a Next.js live UI, GenLayerJS adapter, test plan, deploy notes, and walkthrough script. The contract uses a production-style leader/validator pattern where validators independently re-run evaluation and compare stable decision fields.
```
