import "dotenv/config";
import { CdpBridgeService } from "./cdpBridgeService";

async function main() {
  try {
    const bridge = new CdpBridgeService();
    await bridge.initAccount();
  } catch (error) {
    console.error("Error: ", error);
  }
}

main().catch((error) => {
  console.error("Error: ", error);
  process.exit(1);
});
