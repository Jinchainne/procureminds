export type RfqStatus = "OPEN" | "EVALUATED" | "CLOSED";
export type Verdict = "PENDING" | "APPROVED" | "NEEDS_REVIEW" | "REJECTED";
export type Risk = "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";

export type RfqInput = {
  title: string;
  requirements: string;
  evalCriteria: string;
  budgetCents: number;
};

export type SupplierInput = {
  name: string;
  websiteUrl: string;
  proposalUrl: string;
  priceCents: number;
  claims: string;
};

export type Rfq = {
  id: number;
  creator?: string;
  title: string;
  requirements: string;
  evalCriteria: string;
  budgetCents: number;
  status: RfqStatus;
  winner: number;
  supplierCount: number;
  evaluationCompleted: boolean;
  evaluationSummary: string;
};

export type Supplier = SupplierInput & {
  rfqId: number;
  supplierIndex: number;
  wallet?: string;
  verdict: Verdict;
  score: number;
  risk: Risk;
  reason: string;
  redFlags: string;
  requirementsFit: number;
  credibility: number;
  deliveryCapability: number;
  priceReasonableness: number;
  riskControl: number;
  evidence: string;
};

export type TransactionMeta = {
  txHash?: string;
  receipt?: unknown;
};

export type ProcurementClient = {
  mode: "demo" | "live";
  contractAddress?: string;
  createRfq(input: RfqInput): Promise<{ rfq: Rfq; tx?: TransactionMeta }>;
  submitSupplier(rfqId: number, input: SupplierInput): Promise<{ supplier: Supplier; tx?: TransactionMeta }>;
  evaluateSupplier(rfqId: number, supplierIndex: number): Promise<{ supplier: Supplier; tx?: TransactionMeta }>;
  selectWinner(rfqId: number): Promise<{ rfq: Rfq; winner?: Supplier; tx?: TransactionMeta }>;
  getRfq(rfqId: number): Promise<Rfq>;
  getSupplier(rfqId: number, supplierIndex: number): Promise<Supplier>;
};
