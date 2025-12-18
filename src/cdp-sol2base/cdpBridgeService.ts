import { CdpClient } from "@coinbase/cdp-sdk";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { CONFIG } from "../utils/config";
import { addressToBytes20, normalizeSalt } from "../utils/helper";
import * as crypto from "crypto";
import bs58 from "bs58";

export class CdpBridgeService {
  private connection: Connection;
  private cdp: CdpClient;
  private accountAddress: string | null = null;

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL_DEVNET, "confirmed");

    if (!CONFIG.API_KEY_ID || !CONFIG.CDP_API_KEY_SECRET) {
      console.warn("Warning: CDP_API_KEY_ID / CDP_API_KEY_SECRET not set");
    }

    this.cdp = new CdpClient({
      apiKeyId: CONFIG.API_KEY_ID,
      apiKeySecret: CONFIG.CDP_API_KEY_SECRET,
      walletSecret: CONFIG.WALLET_SECRET,
    });
  }

  async initAccount() {
    console.log("Initializing CDP Solana Account...");

    try {
      const account = await this.cdp.solana.getOrCreateAccount({
        name: "Base-Solana-Bridge",
      });
      this.accountAddress = account.address;
      console.log(`Created CDP Wallet: ${this.accountAddress}`);

      const pubKey = new PublicKey(this.accountAddress);
      const balance = await this.connection.getBalance(pubKey);
      console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      if (balance < 0.05 * LAMPORTS_PER_SOL) {
        // request faucet
        console.log("Requesting faucet...");

        await this.cdp.solana.requestFaucet({
          address: this.accountAddress,
          token: "sol",
        });

        console.log("Faucet request sent. Waiting for funds...");
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      console.error("Error creating account: ", error);
      throw error;
    }
  }

  async bridgeSol(amountSol: number, baseDestinationAddress: string) {
    if (!this.accountAddress) await this.initAccount();
    const walletPubkey = new PublicKey(this.accountAddress!);
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

    console.log(
      `Initiating bridge: ${amountSol} SOL -> ${baseDestinationAddress}`
    );

    const salt32 = crypto.randomBytes(32);
    const saltBuffer = normalizeSalt(salt32);

    const [outgoingMessagePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("outgoing_message"), saltBuffer],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID_DEVNET
    );
    const [messageToRelayPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mtr"), saltBuffer],
      CONFIG.BASE_RELAYER_PROGRAM_ID_SEPOLIA
    );
    const [bridgeAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("bridge")],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID_DEVNET
    );
    const [solVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault")],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID_DEVNET
    );
    const [cfgAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      CONFIG.BASE_RELAYER_PROGRAM_ID_SEPOLIA
    );

    const transaction = new Transaction();

    const relayData = Buffer.alloc(8 + 32 + 32 + 8);
    let off = 0;
    Buffer.from([41, 191, 218, 201, 250, 164, 156, 55]).copy(relayData, off);
    off += 8;
    saltBuffer.copy(relayData, off);
    off += 32;
    outgoingMessagePda.toBuffer().copy(relayData, off);
    off += 32;
    relayData.writeBigUInt64LE(CONFIG.DEFAULT_GAS_LIMIT, off);

    const payRelayIx = new TransactionInstruction({
      keys: [
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: cfgAddress, isSigner: false, isWritable: true },
        { pubkey: CONFIG.GAS_FEE_RECEIVER, isSigner: false, isWritable: true },
        { pubkey: messageToRelayPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.BASE_RELAYER_PROGRAM_ID_SEPOLIA,  
      data: relayData,
    });

    const toBytes = addressToBytes20(baseDestinationAddress);
    const callBuffer = Buffer.from([0]);
    const bridgeData = Buffer.alloc(8 + 32 + 20 + 8 + callBuffer.length);
    off = 0;
    Buffer.from([190, 190, 32, 158, 75, 153, 32, 86]).copy(bridgeData, off);
    off += 8;
    saltBuffer.copy(bridgeData, off);
    off += 32;
    toBytes.copy(bridgeData, off);
    off += 20;
    bridgeData.writeBigUInt64LE(amountLamports, off);
    off += 8;
    callBuffer.copy(bridgeData, off);

    const bridgeSolIx = new TransactionInstruction({
      keys: [
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: CONFIG.GAS_FEE_RECEIVER, isSigner: false, isWritable: true },
        { pubkey: solVaultAddress, isSigner: false, isWritable: true },
        { pubkey: bridgeAddress, isSigner: false, isWritable: true },
        { pubkey: outgoingMessagePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.SOLANA_BRIDGE_PROGRAM_ID_DEVNET,
      data: bridgeData,
    });

    transaction.add(payRelayIx);
    transaction.add(bridgeSolIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    const serializedTx = transaction.serialize({ requireAllSignatures: false });
    const serliazedBase64 = serializedTx.toString("base64");

    console.log(`Signing transaction via CDP...`);

    const signResult = await this.cdp.solana.signTransaction({
      address: this.accountAddress!,
      transaction: serliazedBase64,
    });

    let signature: string;

    if (signResult.signedTransaction) {
      signature = await this.connection.sendRawTransaction(
        Buffer.from(signResult.signedTransaction, "base64")
      );
    } else if (signResult.signature) {
      transaction.addSignature(
        walletPubkey,
        Buffer.from(bs58.decode(signResult.signature))
      );
      signature = await this.connection.sendRawTransaction(
        transaction.serialize()
      );
    } else {
      throw new Error("Unexpected signTransaction result format.");
    }

    console.log("Bridge Success!");
    console.log(
      `Signature: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
  }
}
