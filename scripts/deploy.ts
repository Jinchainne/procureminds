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

  const address =
    receipt?.data?.contract_address ||
    receipt?.txDataDecoded?.contractAddress ||
    receipt?.contractAddress ||
    "CHECK_RECEIPT_FOR_ADDRESS";

  console.log("Contract address:", address);
  writeFileSync(
    path.resolve(process.cwd(), "frontend/.env.local"),
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}\nNEXT_PUBLIC_GENLAYER_CHAIN=${chainName}\nNEXT_PUBLIC_GENLAYER_RPC_URL=${endpoint || "http://localhost:4000/api"}\n`
  );
  console.log("Wrote frontend/.env.local");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
