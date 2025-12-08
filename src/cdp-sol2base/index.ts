import "dotenv/config";
import { CdpBridgeService } from "./cdpBridgeService";

async function main() {
  try {
    const bridge = new CdpBridgeService();
    await bridge.bridgeSol(0.005, "0xecb780201cf93e72842d162304e640b11d62cff4");
  } catch (error) {
    console.error("Error: ", error);
  }
}

main().catch((error) => {
  console.error("Error: ", error);
  process.exit(1);
});
