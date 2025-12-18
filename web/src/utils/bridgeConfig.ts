import { PublicKey } from "@solana/web3.js";

export const CONFIG = {
    RPC_URL_DEVNET: "https://api.devnet.solana.com",
    // NOTE: using private Alchemy RPC
    RPC_URL_MAINNET: "https://solana-mainnet.g.alchemy.com/v2/ZEgaya7L2yhuiVEY4zkJymlMDvPifiei",
    SOLANA_BRIDGE_PROGRAM_ID_DEVNET: new PublicKey(
        "7c6mteAcTXaQ1MFBCrnuzoZVTTAEfZwa6wgy4bqX3KXC"
    ),
    SOLANA_BRIDGE_PROGRAM_ID_MAINNET: new PublicKey(
        "HNCne2FkVaNghhjKXapxJzPaBvAKDG1Ge3gqhZyfVWLM"
    ),
    BASE_RELAYER_PROGRAM_ID_SEPOLIA: new PublicKey(
        "56MBBEYAtQAdjT4e1NzHD8XaoyRSTvfgbSVVcEcHj51H"
    ),
    BASE_RELAYER_PROGRAM_ID_MAINNET: new PublicKey(
        "g1et5VenhfJHJwsdJsDbxWZuotD5H4iELNG61kS4fb9"
    ),
    GAS_FEE_RECEIVER_DEVNET: new PublicKey(
        "AFs1LCbodhvwpgX3u3URLsud6R1XMSaMiQ5LtXw4GKYT"
    ),
    GAS_FEE_RECEIVER_MAINNET: new PublicKey(
        "4m2jaKbJ4pDZw177BmLPMLsztPF5eVFo2fvxPgajdBNz"
    ),
    DEFAULT_GAS_LIMIT: 300000n, // BigInt literal, works in modern browsers
};
