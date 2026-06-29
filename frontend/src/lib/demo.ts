import type { ProcurementClient, Rfq, RfqInput, Supplier, SupplierInput } from "./types";

const STORE_KEY = "procureminds-ai-pro-demo-state";

type DemoState = {
  nextRfqId: number;
  rfqs: Record<number, Rfq>;
  suppliers: Record<string, Supplier>;
};

const defaultRfq: RfqInput = {
  title: "AI procurement software vendor",
  requirements:
    "Vendor must provide a reliable AI procurement workflow with audit logs, RFQ/RFP support, enterprise onboarding, supplier scoring, integration support, and clear implementation timeline.",
  evalCriteria:
    "Fit to requirements 40%, credibility and proof 25%, delivery capability 20%, price/value 10%, risk control 5%. Reject unclear proposals or unverifiable claims.",
  budgetCents: 1000000
};

export const demoDefaults = {
  rfq: defaultRfq,
  supplierA: {
    name: "Acme Procurement AI",
    websiteUrl: "https://example.com/acme-procurement-ai",
    proposalUrl: "https://example.com/acme-proposal",
    priceCents: 850000,
    claims:
      "We provide AI supplier evaluation, audit logs, enterprise onboarding, procurement analytics, API integration, and a four-week implementation plan with support."
  },
  supplierB: {
    name: "BudgetSource Labs",
    websiteUrl: "https://example.com/budgetsource",
    proposalUrl: "https://example.com/budgetsource-proposal",
    priceCents: 620000,
    claims:
      "We offer supplier comparison dashboards and low-cost procurement automation. Enterprise support is available after launch, with limited public case studies."
  }
};

function key(rfqId: number, supplierIndex: number) {
  return `${rfqId}:${supplierIndex}`;
}

function loadState(): DemoState {
  if (typeof window === "undefined") return { nextRfqId: 1, rfqs: {}, suppliers: {} };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { nextRfqId: 1, rfqs: {}, suppliers: {} };
    return JSON.parse(raw) as DemoState;
  } catch {
    return { nextRfqId: 1, rfqs: {}, suppliers: {} };
  }
}

function saveState(state: DemoState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }
}

function bounded(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deterministicScore(rfq: Rfq, supplier: Supplier): Supplier {
  const text = `${supplier.name} ${supplier.claims} ${supplier.websiteUrl} ${supplier.proposalUrl}`.toLowerCase();
  const priceRatio = supplier.priceCents / Math.max(rfq.budgetCents, 1);
  const keywordHits = ["audit", "enterprise", "support", "integration", "analytics", "implementation", "rfq", "rFP".toLowerCase()].filter((word) => text.includes(word)).length;

  const requirementsFit = bounded(55 + keywordHits * 6 + (text.includes("ai") ? 8 : 0));
  const credibility = bounded(48 + (text.includes("case") ? 10 : 0) + (text.includes("public") ? 6 : 0) + (text.includes("support") ? 8 : 0));
  const deliveryCapability = bounded(50 + (text.includes("implementation") ? 14 : 0) + (text.includes("onboarding") ? 12 : 0) + (text.includes("api") ? 8 : 0));
  const priceReasonableness = bounded(priceRatio <= 1 ? 92 - Math.abs(0.82 - priceRatio) * 42 : 35 - (priceRatio - 1) * 80);
  const riskControl = bounded(58 + (credibility - 50) * 0.35 + (deliveryCapability - 50) * 0.25 - (text.includes("limited") ? 12 : 0));
  const score = bounded(requirementsFit * 0.4 + credibility * 0.25 + deliveryCapability * 0.2 + priceReasonableness * 0.1 + riskControl * 0.05);
  const verdict = score >= 80 ? "APPROVED" : score >= 50 ? "NEEDS_REVIEW" : "REJECTED";
  const risk = riskControl >= 76 ? "LOW" : riskControl >= 55 ? "MEDIUM" : "HIGH";

  return {
    ...supplier,
    requirementsFit,
    credibility,
    deliveryCapability,
    priceReasonableness,
    riskControl,
    score,
    verdict,
    risk,
    reason:
      verdict === "APPROVED"
        ? "Supplier shows a strong fit to the RFQ, reasonable pricing, and enough implementation evidence for a procurement shortlist."
        : verdict === "NEEDS_REVIEW"
          ? "Supplier may fit the RFQ but needs human review because some claims, proof points, or delivery details are not fully evidenced."
          : "Supplier does not provide enough credible evidence to satisfy the RFQ and should not progress without a stronger proposal.",
    redFlags: risk === "LOW" ? "None material" : "Limited public proof, validate implementation capacity",
    evidence: "Demo mode uses deterministic scoring from submitted claims, price, and URL metadata. Live mode evaluates web/proposal text through the GenLayer contract."
  };
}

export function createDemoClient(): ProcurementClient {
  return {
    mode: "demo",
    async createRfq(input) {
      const state = loadState();
      const id = state.nextRfqId++;
      const rfq: Rfq = {
        id,
        title: input.title,
        requirements: input.requirements,
        evalCriteria: input.evalCriteria,
        budgetCents: Number(input.budgetCents),
        status: "OPEN",
        winner: 0,
        supplierCount: 0,
        evaluationCompleted: false,
        evaluationSummary: "RFQ created in demo mode. Submit suppliers and evaluate."
      };
      state.rfqs[id] = rfq;
      saveState(state);
      return { rfq, tx: { txHash: `demo-create-${id}` } };
    },
    async submitSupplier(rfqId, input) {
      const state = loadState();
      const rfq = state.rfqs[rfqId];
      if (!rfq) throw new Error("Create or load an RFQ first.");
      if (rfq.status !== "OPEN") throw new Error("RFQ is not open.");
      const supplierIndex = rfq.supplierCount + 1;
      const supplier: Supplier = {
        rfqId,
        supplierIndex,
        ...input,
        priceCents: Number(input.priceCents),
        verdict: "PENDING",
        score: 0,
        risk: "UNKNOWN",
        reason: "Not evaluated yet.",
        redFlags: "",
        requirementsFit: 0,
        credibility: 0,
        deliveryCapability: 0,
        priceReasonableness: 0,
        riskControl: 0,
        evidence: ""
      };
      rfq.supplierCount = supplierIndex;
      state.rfqs[rfqId] = rfq;
      state.suppliers[key(rfqId, supplierIndex)] = supplier;
      saveState(state);
      return { supplier, tx: { txHash: `demo-submit-${rfqId}-${supplierIndex}` } };
    },
    async evaluateSupplier(rfqId, supplierIndex) {
      const state = loadState();
      const rfq = state.rfqs[rfqId];
      const supplier = state.suppliers[key(rfqId, supplierIndex)];
      if (!rfq || !supplier) throw new Error("Supplier not found.");
      const evaluated = deterministicScore(rfq, supplier);
      state.suppliers[key(rfqId, supplierIndex)] = evaluated;
      saveState(state);
      await new Promise((resolve) => setTimeout(resolve, 520));
      return { supplier: evaluated, tx: { txHash: `demo-evaluate-${rfqId}-${supplierIndex}` } };
    },
    async selectWinner(rfqId) {
      const state = loadState();
      const rfq = state.rfqs[rfqId];
      if (!rfq) throw new Error("RFQ not found.");
      const suppliers = Object.values(state.suppliers).filter((s) => s.rfqId === rfqId && s.verdict !== "PENDING" && s.verdict !== "REJECTED");
      if (!suppliers.length) throw new Error("Evaluate at least one eligible supplier first.");
      suppliers.sort((a, b) => b.score - a.score || riskRank(a.risk) - riskRank(b.risk) || a.priceCents - b.priceCents);
      const winner = suppliers[0];
      rfq.winner = winner.supplierIndex;
      rfq.status = "EVALUATED";
      rfq.evaluationCompleted = true;
      rfq.evaluationSummary = "Winner selected by AI procurement scorecard in demo mode.";
      state.rfqs[rfqId] = rfq;
      saveState(state);
      return { rfq, winner, tx: { txHash: `demo-winner-${rfqId}-${winner.supplierIndex}` } };
    },
    async getRfq(rfqId) {
      const rfq = loadState().rfqs[rfqId];
      if (!rfq) throw new Error("RFQ not found.");
      return rfq;
    },
    async getSupplier(rfqId, supplierIndex) {
      const supplier = loadState().suppliers[key(rfqId, supplierIndex)];
      if (!supplier) throw new Error("Supplier not found.");
      return supplier;
    }
  };
}

function riskRank(risk: Supplier["risk"]) {
  if (risk === "LOW") return 1;
  if (risk === "MEDIUM") return 2;
  if (risk === "HIGH") return 3;
  return 9;
}
