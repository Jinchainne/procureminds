import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { createClient, createAccount } from "genlayer-js";
import { localnet, studionet, testnetBradbury, testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const chains: Record<string, unknown> = {
  localnet,
  studionet,
  testnetBradbury,
  testnetAsimov
};

function getExecutionResult(receipt: any) {
  return receipt?.txExecutionResultName ?? receipt?.data?.txExecutionResultName;
}

function getConsensusResult(receipt: any) {
  return receipt?.resultName ?? receipt?.data?.resultName;
}

function assertSuccessfulDeploy(receipt: any) {
  const executionResult = getExecutionResult(receipt);
  const consensusResult = getConsensusResult(receipt);

  if (executionResult === "FINISHED_WITH_ERROR") {
    throw new Error(`Deploy transaction finalized with execution error: ${JSON.stringify(receipt, null, 2)}`);
  }

  if (consensusResult && !["AGREE", "MAJORITY_AGREE", "SUCCESS"].includes(consensusResult)) {
    throw new Error(`Deploy transaction did not reach consensus success: ${JSON.stringify(receipt, null, 2)}`);
  }
}

async function main() {
  const chainName = process.env.GENLAYER_CHAIN || "localnet";
  const chain = chains[chainName] || localnet;
  const account = createAccount(process.env.GENLAYER_PRIVATE_KEY as `0x${string}` | undefined);
  const endpoint = process.env.GENLAYER_RPC_URL || process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;
  const client = createClient({ chain: chain as never, account, endpoint });

  const contractPath = path.resolve(process.cwd(), "contracts/procureminds_ai_pro.py");
  const code = new Uint8Array(readFileSync(contractPath));

  await client.initializeConsensusSmartContract();
  const hash = await client.deployContract({ code, args: [] });
  console.log("Deploy tx:", hash);

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 220,
    fullTransaction: true
  });
  assertSuccessfulDeploy(receipt);

  const address =
    receipt?.data?.contract_address ||
    receipt?.txDataDecoded?.contractAddress ||
    receipt?.contractAddress ||
    "CHECK_RECEIPT_FOR_ADDRESS";

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Could not extract contract address from deploy receipt: ${JSON.stringify(receipt, null, 2)}`);
  }

  const totalRfqs = await client.readContract({
    address,
    functionName: "get_total_rfqs",
    args: [],
    stateStatus: "accepted"
  });

  console.log("Contract address:", address);
  console.log("Verified get_total_rfqs:", totalRfqs);
  const envLines = [
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`,
    `NEXT_PUBLIC_GENLAYER_CHAIN=${chainName}`
  ];
  if (endpoint) {
    envLines.push(`NEXT_PUBLIC_GENLAYER_RPC_URL=${endpoint}`);
  }
  writeFileSync(
    path.resolve(process.cwd(), "frontend/.env.local"),
    `${envLines.join("\n")}\n`
  );
  console.log("Wrote frontend/.env.local");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
