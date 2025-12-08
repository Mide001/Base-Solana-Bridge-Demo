import { SolanaContractCallService } from "./contractCallService";

async function main() {
  const PRIVATE_KEY_PATH = "./phantom.json";
  const BASE_CONTRACT_ADDRESS = "0xE1Ae2B9C2Ed56C1ABAB65b0A919CB91Fab1352B9";

  try {
    const caller = new SolanaContractCallService(PRIVATE_KEY_PATH);

    await caller.callBaseContract(BASE_CONTRACT_ADDRESS, "0xd09de08a");
  } catch (error) {
    console.error("Error: ", error);
  }
}

main().catch((error) => {
  console.error("Error: ", error);
  process.exit(1);
});
