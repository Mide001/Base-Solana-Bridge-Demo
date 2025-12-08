import { PublicKey } from "@solana/web3.js";

export const CONFIG = {
  RPC_URL: "https://api.devnet.solana.com",
  SOLANA_BRIDGE_PROGRAM_ID: new PublicKey(
    "7c6mteAcTXaQ1MFBCrnuzoZVTTAEfZwa6wgy4bqX3KXC"
  ),
  BASE_RELAYER_PROGRAM_ID: new PublicKey(
    "56MBBEYAtQAdjT4e1NzHD8XaoyRSTvfgbSVVcEcHj51H"
  ),
  GAS_FEE_RECEIVER: new PublicKey(
    "AFs1LCbodhvwpgX3u3URLsud6R1XMSaMiQ5LtXw4GKYT"
  ),
  DEFAULT_GAS_LIMIT: 300000n,
  
  API_KEY_ID: process.env.CDP_API_KEY_ID,
  CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
  WALLET_SECRET: process.env.CDP_WALLET_SECRET,
};

