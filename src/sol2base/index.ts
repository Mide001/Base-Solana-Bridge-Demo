import { SolanaToBaseBackend } from "./bridgeService";

async function main() {
  const PRIVATE_KEY_PATH = "./phantom.json";

  try {
    const bridge = new SolanaToBaseBackend(PRIVATE_KEY_PATH);

    await bridge.bridgeSol(0.1, "0xf811a6aeade30a48fe9765701714d0bb9c355730");
  } catch (error) {
    console.error("Error: ", error);
  }
}
main().catch((error) => {
  console.error("Fatal error: ", error);
  process.exit(1);
});
