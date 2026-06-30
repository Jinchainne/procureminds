# v0.3.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

# ProcureMinds AI Pro
# GenLayer-native procurement committee:
# - reads supplier websites/proposal URLs
# - evaluates subjective vendor fit
# - stores consensus-agreed scorecards on-chain
# - selects a winner with deterministic tie breakers


class Contract(gl.Contract):
    owner: Address
    rfq_count: u256

    # RFQ storage
    rfq_creator: TreeMap[u256, Address]
    rfq_title: TreeMap[u256, str]
    rfq_requirements: TreeMap[u256, str]
    rfq_eval_criteria: TreeMap[u256, str]
    rfq_budget_cents: TreeMap[u256, u256]
    rfq_status: TreeMap[u256, str]  # OPEN, EVALUATED, CLOSED
    rfq_winner: TreeMap[u256, u256]
    rfq_supplier_count: TreeMap[u256, u256]

    # Supplier proposal storage. Key format: rfq_id * 100000 + supplier_index
    supplier_name: TreeMap[u256, str]
    supplier_wallet: TreeMap[u256, Address]
    supplier_website: TreeMap[u256, str]
    supplier_proposal_url: TreeMap[u256, str]
    supplier_price_cents: TreeMap[u256, u256]
    supplier_claims: TreeMap[u256, str]

    # Evaluation storage
    supplier_score: TreeMap[u256, u256]
    supplier_verdict: TreeMap[u256, str]  # PENDING, APPROVED, NEEDS_REVIEW, REJECTED
    supplier_risk: TreeMap[u256, str]     # UNKNOWN, LOW, MEDIUM, HIGH
    supplier_reason: TreeMap[u256, str]
    supplier_red_flags: TreeMap[u256, str]
    supplier_requirements_fit: TreeMap[u256, u256]
    supplier_credibility: TreeMap[u256, u256]
    supplier_delivery_capability: TreeMap[u256, u256]
    supplier_price_reasonableness: TreeMap[u256, u256]
    supplier_risk_control: TreeMap[u256, u256]
    supplier_evidence: TreeMap[u256, str]

    evaluation_summary: TreeMap[u256, str]
    evaluation_completed: TreeMap[u256, bool]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.rfq_count = u256(0)
        # TreeMap fields are storage-backed. Do not initialize them in Studio.

    def _supplier_key(self, rfq_id: u256, supplier_index: u256) -> u256:
        return rfq_id * u256(100000) + supplier_index

    def _is_valid_url(self, url: str) -> bool:
        return url.startswith("https://") or url.startswith("http://")

    def _clip(self, text: str, max_len: int) -> str:
        if len(text) <= max_len:
            return text
        return text[:max_len]

    def _safe_score(self, value) -> int:
        score = int(value)
        if score < 0:
            return 0
        if score > 100:
            return 100
        return score

    def _risk_rank(self, risk: str) -> int:
        if risk == "LOW":
            return 1
        if risk == "MEDIUM":
            return 2
        if risk == "HIGH":
            return 3
        return 9

    def _verdict_from_score(self, score: int) -> str:
        if score >= 80:
            return "APPROVED"
        if score >= 50:
            return "NEEDS_REVIEW"
        return "REJECTED"

    def _score_band(self, score: int) -> int:
        if score >= 80:
            return 3
        if score >= 50:
            return 2
        return 1

    def _validate_scorecard_shape(self, data) -> bool:
        required = [
            "verdict",
            "score",
            "risk",
            "reason",
            "red_flags",
            "requirements_fit",
            "credibility",
            "delivery_capability",
            "price_reasonableness",
            "risk_control",
            "evidence",
        ]
        for field in required:
            if field not in data:
                return False

        verdict = data["verdict"]
        risk = data["risk"]
        if verdict != "APPROVED" and verdict != "NEEDS_REVIEW" and verdict != "REJECTED":
            return False
        if risk != "LOW" and risk != "MEDIUM" and risk != "HIGH":
            return False

        score = self._safe_score(data["score"])
        if verdict != self._verdict_from_score(score):
            return False

        dimension_names = [
            "requirements_fit",
            "credibility",
            "delivery_capability",
            "price_reasonableness",
            "risk_control",
        ]
        for dimension in dimension_names:
            dim_score = self._safe_score(data[dimension])
            if dim_score < 0 or dim_score > 100:
                return False

        if len(str(data["reason"])) < 20:
            return False
        if len(str(data["evidence"])) < 10:
            return False
        return True

    @gl.public.write
    def create_rfq(self, title: str, requirements: str, eval_criteria: str, budget_cents: int) -> u256:
        if len(title) < 4:
            raise UserError("RFQ title is too short")
        if len(requirements) < 40:
            raise UserError("RFQ requirements must be detailed")
        if len(eval_criteria) < 40:
            raise UserError("Evaluation criteria must be detailed")
        if budget_cents <= 0:
            raise UserError("Budget must be positive")

        self.rfq_count += u256(1)
        rfq_id = self.rfq_count

        self.rfq_creator[rfq_id] = gl.message.sender_address
        self.rfq_title[rfq_id] = title
        self.rfq_requirements[rfq_id] = requirements
        self.rfq_eval_criteria[rfq_id] = eval_criteria
        self.rfq_budget_cents[rfq_id] = u256(budget_cents)
        self.rfq_status[rfq_id] = "OPEN"
        self.rfq_winner[rfq_id] = u256(0)
        self.rfq_supplier_count[rfq_id] = u256(0)
        self.evaluation_completed[rfq_id] = False
        self.evaluation_summary[rfq_id] = "RFQ created. Submit suppliers and run AI evaluation."

        return rfq_id

    @gl.public.write
    def submit_supplier(
        self,
        rfq_id: int,
        name: str,
        website_url: str,
        proposal_url: str,
        price_cents: int,
        claims: str,
    ) -> u256:
        rid = u256(rfq_id)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        if self.rfq_status[rid] != "OPEN":
            raise UserError("RFQ is not open")
        if len(name) < 2:
            raise UserError("Supplier name is too short")
        if not self._is_valid_url(website_url):
            raise UserError("Supplier website must be a valid URL")
        if not self._is_valid_url(proposal_url):
            raise UserError("Proposal URL must be a valid URL")
        if price_cents <= 0:
            raise UserError("Price must be positive")
        if len(claims) < 30:
            raise UserError("Supplier claims must be detailed")

        current_count = self.rfq_supplier_count[rid] + u256(1)
        self.rfq_supplier_count[rid] = current_count
        key = self._supplier_key(rid, current_count)

        self.supplier_name[key] = name
        self.supplier_wallet[key] = gl.message.sender_address
        self.supplier_website[key] = website_url
        self.supplier_proposal_url[key] = proposal_url
        self.supplier_price_cents[key] = u256(price_cents)
        self.supplier_claims[key] = claims

        self.supplier_score[key] = u256(0)
        self.supplier_verdict[key] = "PENDING"
        self.supplier_risk[key] = "UNKNOWN"
        self.supplier_reason[key] = "Not evaluated yet."
        self.supplier_red_flags[key] = ""
        self.supplier_requirements_fit[key] = u256(0)
        self.supplier_credibility[key] = u256(0)
        self.supplier_delivery_capability[key] = u256(0)
        self.supplier_price_reasonableness[key] = u256(0)
        self.supplier_risk_control[key] = u256(0)
        self.supplier_evidence[key] = ""
        return current_count

    @gl.public.write
    def evaluate_supplier(self, rfq_id: int, supplier_index: int) -> str:
        rid = u256(rfq_id)
        sid = u256(supplier_index)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        if sid == u256(0) or sid > self.rfq_supplier_count[rid]:
            raise UserError("Invalid supplier index")
        if self.rfq_status[rid] != "OPEN":
            raise UserError("RFQ is not open")

        key = self._supplier_key(rid, sid)

        # Read storage once before the non-deterministic block. The block itself
        # only performs web/LLM operations and returns a proposed scorecard.
        rfq_title = self.rfq_title[rid]
        rfq_requirements = self.rfq_requirements[rid]
        rfq_eval_criteria = self.rfq_eval_criteria[rid]
        rfq_budget_cents = self.rfq_budget_cents[rid]
        supplier_name = self.supplier_name[key]
        supplier_claims = self.supplier_claims[key]
        supplier_price_cents = self.supplier_price_cents[key]
        website_url = self.supplier_website[key]
        proposal_url = self.supplier_proposal_url[key]

        def leader_fn():
            website_text = ""
            proposal_text = ""
            try:
                website_text = gl.nondet.web.render(website_url, mode="text")
            except Exception:
                website_text = "[WEBSITE_FETCH_FAILED]"
            try:
                proposal_text = gl.nondet.web.render(proposal_url, mode="text")
            except Exception:
                proposal_text = "[PROPOSAL_FETCH_FAILED]"

            task = f"""
You are a senior procurement evaluation committee for a buyer.
Evaluate ONE supplier for the RFQ below. Use the supplier website text,
proposal text, stated claims, and price. Be conservative: if source evidence
is weak, reduce credibility and raise risk.

RFQ title: {rfq_title}
RFQ requirements: {rfq_requirements}
Evaluation criteria: {rfq_eval_criteria}
Buyer budget cents: {rfq_budget_cents}

Supplier name: {supplier_name}
Supplier claims: {supplier_claims}
Supplier price cents: {supplier_price_cents}
Supplier website URL: {website_url}
Supplier proposal URL: {proposal_url}
Supplier website text excerpt: {self._clip(website_text, 10000)}
Supplier proposal text excerpt: {self._clip(proposal_text, 10000)}

Return strict JSON only with exactly these fields:
{{
  "requirements_fit": 0-100,
  "credibility": 0-100,
  "delivery_capability": 0-100,
  "price_reasonableness": 0-100,
  "risk_control": 0-100,
  "score": 0-100,
  "verdict": "APPROVED" | "NEEDS_REVIEW" | "REJECTED",
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "reason": "2-4 sentence procurement-grade explanation",
  "red_flags": "short comma-separated list, or 'None material'",
  "evidence": "short source-grounded note citing what was visible/missing"
}}

Scoring guidance:
- requirements_fit: capability match to the RFQ.
- credibility: evidence from website/proposal, not marketing claims alone.
- delivery_capability: implementation/support/operations capability.
- price_reasonableness: budget fit and value for money.
- risk_control: higher is safer; lower means more risk.
- score should be a weighted overall judgment using the criteria.
- APPROVED requires score >= 80.
- NEEDS_REVIEW requires score 50-79.
- REJECTED requires score < 50.
"""
            return gl.nondet.exec_prompt(task, response_format="json")

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata
            try:
                if not self._validate_scorecard_shape(leader_data):
                    return False
                validator_data = leader_fn()
                if not self._validate_scorecard_shape(validator_data):
                    return False

                leader_score = self._safe_score(leader_data["score"])
                validator_score = self._safe_score(validator_data["score"])

                # Consensus focuses on stable decision fields and allows score tolerance.
                same_verdict = leader_data["verdict"] == validator_data["verdict"]
                same_band = self._score_band(leader_score) == self._score_band(validator_score)
                score_close = abs(leader_score - validator_score) <= 15
                risk_close = abs(self._risk_rank(leader_data["risk"]) - self._risk_rank(validator_data["risk"])) <= 1
                return same_verdict and same_band and score_close and risk_close
            except Exception:
                return False

        scorecard = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if not self._validate_scorecard_shape(scorecard):
            raise UserError("Consensus returned invalid scorecard")

        score = self._safe_score(scorecard["score"])
        self.supplier_score[key] = u256(score)
        self.supplier_verdict[key] = scorecard["verdict"]
        self.supplier_risk[key] = scorecard["risk"]
        self.supplier_reason[key] = self._clip(str(scorecard["reason"]), 900)
        self.supplier_red_flags[key] = self._clip(str(scorecard["red_flags"]), 500)
        self.supplier_requirements_fit[key] = u256(self._safe_score(scorecard["requirements_fit"]))
        self.supplier_credibility[key] = u256(self._safe_score(scorecard["credibility"]))
        self.supplier_delivery_capability[key] = u256(self._safe_score(scorecard["delivery_capability"]))
        self.supplier_price_reasonableness[key] = u256(self._safe_score(scorecard["price_reasonableness"]))
        self.supplier_risk_control[key] = u256(self._safe_score(scorecard["risk_control"]))
        self.supplier_evidence[key] = self._clip(str(scorecard["evidence"]), 800)
        return scorecard["verdict"]

    @gl.public.write
    def select_winner(self, rfq_id: int) -> u256:
        rid = u256(rfq_id)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        if gl.message.sender_address != self.rfq_creator[rid]:
            raise UserError("Only RFQ creator can select winner")
        if self.rfq_status[rid] != "OPEN":
            raise UserError("RFQ is not open")

        count = self.rfq_supplier_count[rid]
        if count == u256(0):
            raise UserError("No suppliers submitted")

        best_index = u256(0)
        best_score = u256(0)
        best_risk_rank = 9
        best_price = u256(0)
        i = u256(1)
        while i <= count:
            key = self._supplier_key(rid, i)
            verdict = self.supplier_verdict[key]
            if verdict == "APPROVED" or verdict == "NEEDS_REVIEW":
                score = self.supplier_score[key]
                risk_rank = self._risk_rank(self.supplier_risk[key])
                price = self.supplier_price_cents[key]

                better = False
                if best_index == u256(0):
                    better = True
                elif score > best_score:
                    better = True
                elif score == best_score and risk_rank < best_risk_rank:
                    better = True
                elif score == best_score and risk_rank == best_risk_rank and price < best_price:
                    better = True

                if better:
                    best_index = i
                    best_score = score
                    best_risk_rank = risk_rank
                    best_price = price
            i += u256(1)

        if best_index == u256(0):
            raise UserError("No eligible supplier found. Evaluate at least one supplier with APPROVED or NEEDS_REVIEW verdict.")

        self.rfq_winner[rid] = best_index
        self.rfq_status[rid] = "EVALUATED"
        self.evaluation_completed[rid] = True
        self.evaluation_summary[rid] = "Winner selected by consensus-backed AI procurement scorecard."
        return best_index

    @gl.public.write
    def close_rfq(self, rfq_id: int) -> None:
        rid = u256(rfq_id)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        if gl.message.sender_address != self.rfq_creator[rid]:
            raise UserError("Only RFQ creator can close RFQ")
        self.rfq_status[rid] = "CLOSED"
        self.evaluation_summary[rid] = "RFQ closed by creator."

    @gl.public.view
    def get_total_rfqs(self) -> u256:
        return self.rfq_count

    @gl.public.view
    def get_rfq(self, rfq_id: int) -> dict:
        rid = u256(rfq_id)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        return {
            "id": str(rid),
            "creator": str(self.rfq_creator[rid]),
            "title": self.rfq_title[rid],
            "requirements": self.rfq_requirements[rid],
            "eval_criteria": self.rfq_eval_criteria[rid],
            "budget_cents": str(self.rfq_budget_cents[rid]),
            "status": self.rfq_status[rid],
            "winner": str(self.rfq_winner[rid]),
            "supplier_count": str(self.rfq_supplier_count[rid]),
            "evaluation_completed": self.evaluation_completed[rid],
            "evaluation_summary": self.evaluation_summary[rid],
        }

    @gl.public.view
    def get_supplier(self, rfq_id: int, supplier_index: int) -> dict:
        rid = u256(rfq_id)
        sid = u256(supplier_index)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        if sid == u256(0) or sid > self.rfq_supplier_count[rid]:
            raise UserError("Invalid supplier index")
        key = self._supplier_key(rid, sid)
        return {
            "rfq_id": str(rid),
            "supplier_index": str(sid),
            "name": self.supplier_name[key],
            "wallet": str(self.supplier_wallet[key]),
            "website_url": self.supplier_website[key],
            "proposal_url": self.supplier_proposal_url[key],
            "price_cents": str(self.supplier_price_cents[key]),
            "claims": self.supplier_claims[key],
            "verdict": self.supplier_verdict[key],
            "score": str(self.supplier_score[key]),
            "risk": self.supplier_risk[key],
            "reason": self.supplier_reason[key],
            "red_flags": self.supplier_red_flags[key],
            "requirements_fit": str(self.supplier_requirements_fit[key]),
            "credibility": str(self.supplier_credibility[key]),
            "delivery_capability": str(self.supplier_delivery_capability[key]),
            "price_reasonableness": str(self.supplier_price_reasonableness[key]),
            "risk_control": str(self.supplier_risk_control[key]),
            "evidence": self.supplier_evidence[key],
        }

    @gl.public.view
    def get_winner(self, rfq_id: int) -> dict:
        rid = u256(rfq_id)
        if rid == u256(0) or rid > self.rfq_count:
            raise UserError("Invalid RFQ id")
        winner = self.rfq_winner[rid]
        if winner == u256(0):
            return {"winner": "0", "message": "No winner selected"}
        return self.get_supplier(rfq_id, int(winner))
