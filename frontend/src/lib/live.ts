import type { ProcurementClient, Rfq, RfqInput, Supplier, SupplierInput, TransactionMeta } from "./types";

type ClientAny = any;

let cachedAccount: any | undefined;
let cachedClient: ClientAny | undefined;

function numberFrom(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseInt(value, 10) || fallback;
  return fallback;
}

function normalizeRfq(raw: any): Rfq {
  return {
    id: numberFrom(raw?.id),
    creator: raw?.creator,
    title: raw?.title ?? "",
    requirements: raw?.requirements ?? "",
    evalCriteria: raw?.eval_criteria ?? raw?.evalCriteria ?? "",
    budgetCents: numberFrom(raw?.budget_cents ?? raw?.budgetCents),
    status: raw?.status ?? "OPEN",
    winner: numberFrom(raw?.winner),
    supplierCount: numberFrom(raw?.supplier_count ?? raw?.supplierCount),
    evaluationCompleted: Boolean(raw?.evaluation_completed ?? raw?.evaluationCompleted),
    evaluationSummary: raw?.evaluation_summary ?? raw?.evaluationSummary ?? ""
  };
}

function normalizeSupplier(raw: any): Supplier {
  return {
    rfqId: numberFrom(raw?.rfq_id ?? raw?.rfqId),
    supplierIndex: numberFrom(raw?.supplier_index ?? raw?.supplierIndex),
    name: raw?.name ?? "",
    wallet: raw?.wallet,
    websiteUrl: raw?.website_url ?? raw?.websiteUrl ?? "",
    proposalUrl: raw?.proposal_url ?? raw?.proposalUrl ?? "",
    priceCents: numberFrom(raw?.price_cents ?? raw?.priceCents),
    claims: raw?.claims ?? "",
    verdict: raw?.verdict ?? "PENDING",
    score: numberFrom(raw?.score),
    risk: raw?.risk ?? "UNKNOWN",
    reason: raw?.reason ?? "",
    redFlags: raw?.red_flags ?? raw?.redFlags ?? "",
    requirementsFit: numberFrom(raw?.requirements_fit ?? raw?.requirementsFit),
    credibility: numberFrom(raw?.credibility),
    deliveryCapability: numberFrom(raw?.delivery_capability ?? raw?.deliveryCapability),
    priceReasonableness: numberFrom(raw?.price_reasonableness ?? raw?.priceReasonableness),
    riskControl: numberFrom(raw?.risk_control ?? raw?.riskControl),
    evidence: raw?.evidence ?? ""
  };
}

function getContractAddress() {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Deploy the contract first or enable demo mode.");
  return address;
}

async function getClient() {
  if (cachedClient) return cachedClient;

  // genlayer-js exposes different chain objects depending on the network/package version.
  // Cast dynamic imports to any so Next.js type-checking does not fail during Vercel builds.
  const genlayer: any = await import("genlayer-js");
  const chains: any = await import("genlayer-js/chains");

  const chainName = process.env.NEXT_PUBLIC_GENLAYER_CHAIN || "localnet";
  const chain = chains?.[chainName] ?? chains?.localnet ?? chains?.simulator;

  if (!chain) {
    throw new Error(`Unsupported GenLayer chain: ${chainName}`);
  }

  cachedAccount = cachedAccount || genlayer.createAccount();
  cachedClient = genlayer.createClient({ chain, account: cachedAccount } as any);
  return cachedClient;
}

async function waitFor(txHash: string): Promise<TransactionMeta> {
  const client = await getClient();
  const types = await import("genlayer-js/types");
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: (types as any).TransactionStatus?.FINALIZED ?? "FINALIZED",
    fullTransaction: false,
    retries: 220
  });
  return { txHash, receipt };
}

async function write(functionName: string, args: unknown[]): Promise<TransactionMeta> {
  const client = await getClient();
  const txHash = await client.writeContract({
    address: getContractAddress(),
    functionName,
    args,
    value: 0
  });
  return waitFor(txHash);
}

async function read(functionName: string, args: unknown[] = []) {
  const client = await getClient();
  return client.readContract({
    address: getContractAddress(),
    functionName,
    args,
    stateStatus: "accepted"
  });
}

export function createLiveClient(): ProcurementClient {
  const api: ProcurementClient = {
    mode: "live",
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    async createRfq(input: RfqInput) {
      const tx = await write("create_rfq", [input.title, input.requirements, input.evalCriteria, Number(input.budgetCents)]);
      const total = await read("get_total_rfqs", []);
      const rfq = await api.getRfq(numberFrom(total));
      return { rfq, tx };
    },
    async submitSupplier(rfqId: number, input: SupplierInput) {
      const tx = await write("submit_supplier", [rfqId, input.name, input.websiteUrl, input.proposalUrl, Number(input.priceCents), input.claims]);
      const rfq = await api.getRfq(rfqId);
      const supplier = await api.getSupplier(rfqId, rfq.supplierCount);
      return { supplier, tx };
    },
    async evaluateSupplier(rfqId: number, supplierIndex: number) {
      const tx = await write("evaluate_supplier", [rfqId, supplierIndex]);
      const supplier = await api.getSupplier(rfqId, supplierIndex);
      return { supplier, tx };
    },
    async selectWinner(rfqId: number) {
      const tx = await write("select_winner", [rfqId]);
      const rfq = await api.getRfq(rfqId);
      const winner = rfq.winner > 0 ? await api.getSupplier(rfqId, rfq.winner) : undefined;
      return { rfq, winner, tx };
    },
    async getRfq(rfqId: number) {
      return normalizeRfq(await read("get_rfq", [rfqId]));
    },
    async getSupplier(rfqId: number, supplierIndex: number) {
      return normalizeSupplier(await read("get_supplier", [rfqId, supplierIndex]));
    }
  };
  return api;
}
