import { createLiveClient } from "./live";
import type { ProcurementClient } from "./types";

function createSetupClient(): ProcurementClient {
  const setupError = () => {
    throw new Error("Set NEXT_PUBLIC_CONTRACT_ADDRESS in Vercel after deploying the GenLayer contract.");
  };

  return {
    mode: "setup",
    async createRfq() {
      return setupError();
    },
    async submitSupplier() {
      return setupError();
    },
    async evaluateSupplier() {
      return setupError();
    },
    async selectWinner() {
      return setupError();
    },
    async closeRfq() {
      return setupError();
    },
    async getLatestRfq() {
      return null;
    },
    async getRfq() {
      return setupError();
    },
    async getSupplier() {
      return setupError();
    },
    async listSuppliers() {
      return [];
    }
  };
}

export function getProcurementClient(): ProcurementClient {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) return createSetupClient();
  return createLiveClient();
}

export function getRuntimeMode() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const mode = contractAddress ? "live" : "setup";
  return {
    mode,
    contractAddress: contractAddress || "Set NEXT_PUBLIC_CONTRACT_ADDRESS",
    chain: process.env.NEXT_PUBLIC_GENLAYER_CHAIN || "localnet"
  } as const;
}
