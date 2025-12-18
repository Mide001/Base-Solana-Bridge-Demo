import { SolanaToBaseMainnetService } from "./bridgeService";

async function main() {
  const PRIVATE_KEY_PATH = "./phantom.json";

  try {
    const bridge = new SolanaToBaseMainnetService(PRIVATE_KEY_PATH);
    await bridge.bridgeSol(
      0.0036,
      "0xce768c895e4be936db7dea5f53ad3b60ad3c3456"
    );
  } catch (error) {
    console.error("Error: ", error);
  }
}

main().catch((error) => {
  console.error("Fatal error: ", error);
  process.exit(1);
});
