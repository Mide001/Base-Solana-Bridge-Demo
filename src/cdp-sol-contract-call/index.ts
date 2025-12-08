import "dotenv/config";
import { CdpSolContractCall } from "./cdpSolContractCall";

async function main() {
  const caller = new CdpSolContractCall();

  await caller.callContract(
    "0xf7A6D9E8b4C171Fbdc99e34f85dcb6E66f988bD3",
    "0xd09de08a"
  );
}

main().catch((error) => {
    console.error("Error: ", error);
    process.exit(1);
});
