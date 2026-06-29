import { createDemoClient } from "./demo";
import { createLiveClient } from "./live";
import type { ProcurementClient } from "./types";

export function getProcurementClient(): ProcurementClient {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (!contractAddress || demoMode) return createDemoClient();
  return createLiveClient();
}

export function getRuntimeMode() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  return {
    mode: !contractAddress || demoMode ? "demo" : "live",
    contractAddress: contractAddress || "Not set",
    chain: process.env.NEXT_PUBLIC_GENLAYER_CHAIN || "localnet"
  } as const;
}
