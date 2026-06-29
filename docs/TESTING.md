# Testing

## Fast checks

```bash
python -m py_compile contracts/procureminds_ai_pro.py
cd frontend
npm install
npm run typecheck
npm run build
```

## GenVM linting

Install the GenVM linter and run:

```bash
pip install genvm-linter
genvm-lint check contracts/procureminds_ai_pro.py
```

## Manual contract flow

1. Deploy contract.
2. Call `create_rfq`.
3. Call `submit_supplier` twice.
4. Call `evaluate_supplier` for each supplier.
5. Call `get_supplier` and verify scorecards.
6. Call `select_winner`.
7. Call `get_winner`.

## Negative cases

- reject invalid RFQ id,
- reject invalid URL,
- reject short requirements,
- reject zero budget,
- reject zero supplier price,
- reject selecting winner before evaluation,
- reject non-creator calling `select_winner`.
