# Contract Test Plan

## Happy path

1. `create_rfq(title, requirements, eval_criteria, budget_cents)`
2. `submit_supplier(rfq_id, name, website_url, proposal_url, price_cents, claims)`
3. `evaluate_supplier(rfq_id, supplier_index)`
4. `get_supplier(rfq_id, supplier_index)`
5. `select_winner(rfq_id)`
6. `get_winner(rfq_id)`

Expected:

- RFQ status starts as `OPEN`.
- Supplier starts as `PENDING`.
- Evaluation writes scorecard dimensions.
- Winner is non-zero after `select_winner`.
- RFQ status becomes `EVALUATED`.

## Edge cases

- invalid RFQ id,
- invalid supplier index,
- short requirements,
- short criteria,
- invalid URL,
- zero/negative budget,
- zero/negative supplier price,
- selecting winner without suppliers,
- selecting winner without eligible evaluations,
- non-creator selecting winner,
- evaluating after RFQ is closed/evaluated.

## Consensus checks

- Validator must reject malformed scorecard JSON.
- Validator must reject verdict/score mismatch.
- Validator should accept scorecards within tolerance when verdict/risk are equivalent.
- Storage writes must occur only after `run_nondet_unsafe` returns.
