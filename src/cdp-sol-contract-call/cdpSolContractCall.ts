import { CdpClient } from "@coinbase/cdp-sdk";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  addressToBytes20,
  normalizeSalt,
  writeUint128LE,
} from "../utils/helper";
import { CONFIG } from "../utils/config";
import * as crypto from "crypto";
import * as bs58 from "bs58";

export class CdpSolContractCall {
  private connection: Connection;
  private cdp: CdpClient;
  private accountAddress: string | null = null;

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL, "confirmed");

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
      console.log(`CDP Wallet Created: ${this.accountAddress}`);

      const pubKey = new PublicKey(this.accountAddress);

      const balance = await this.connection.getBalance(pubKey);
      console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      if (balance < 0.05 * LAMPORTS_PER_SOL) {
        console.log("Requesting faucet...");
        await this.cdp.solana.requestFaucet({
          address: this.accountAddress,
          token: "sol",
        });

        console.log("Faucet request sent. Waiting for funds...");
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (error) {
      console.error("Error creating account: ", error);
      throw error;
    }
  }

  async callContract(
    targetContract: string,
    dataHex: string,
    msgValueEther: string = "0"
  ) {
    if (!this.accountAddress) await this.initAccount();
    const walletPubkey = new PublicKey(this.accountAddress!);

    console.log(`Initiating call to ${targetContract}`);

    const salt32 = crypto.randomBytes(32);
    const saltBuffer = normalizeSalt(salt32);

    const [outgoingMessagePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("outgoing_message"), saltBuffer],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID
    );
    const [messageToRelayPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mtr"), saltBuffer],
      CONFIG.BASE_RELAYER_PROGRAM_ID
    );
    const [bridgeAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("bridge")],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID
    );
    const [solVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault")],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID
    );
    const [cfgAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      CONFIG.BASE_RELAYER_PROGRAM_ID
    );

    const callHeader = Buffer.from([1, 0]);
    const targetBuf = addressToBytes20(targetContract);

    const valBigInt = BigInt((parseFloat(msgValueEther) * 1e18).toString());
    const valueBuf = Buffer.alloc(16);
    writeUint128LE(valBigInt, valueBuf);

    const cleanData = dataHex.startsWith("0x") ? dataHex.slice(2) : dataHex;
    const payload = Buffer.from(cleanData, "hex");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(payload.length, 0);

    const callBuffer = Buffer.concat([
      callHeader,
      targetBuf,
      valueBuf,
      lenBuf,
      payload,
    ]);

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
      programId: CONFIG.BASE_RELAYER_PROGRAM_ID,
      data: relayData,
    });

    const bridgeAmount = 0n;

    const bridgeData = Buffer.alloc(8 + 32 + 20 + 8 + callBuffer.length);
    off = 0;
    Buffer.from([190, 190, 32, 158, 75, 153, 32, 86]).copy(bridgeData, off);
    off += 8;
    saltBuffer.copy(bridgeData, off);
    off += 32;
    targetBuf.copy(bridgeData, off);
    off += 20;
    bridgeData.writeBigUInt64LE(bridgeAmount, off);
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
      programId: CONFIG.SOLANA_BRIDGE_PROGRAM_ID,
      data: bridgeData,
    });

    const transaction = new Transaction();
    transaction.add(payRelayIx);
    transaction.add(bridgeSolIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    const serializedTx = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    console.log("Signing transaction via CDP...");

    const signResult = await this.cdp.solana.signTransaction({
      address: this.accountAddress!,
      transaction: serializedTx,
    });

    let signature: string;
    if (signResult.signedTransaction) {
      signature = await this.connection.sendRawTransaction(
        Buffer.from(signResult.signedTransaction, "base64")
      );
    } else if (signResult.signature) {
      transaction.addSignature(
        walletPubkey,
        Buffer.from(bs58.default.decode(signResult.signature))
      );
      signature = await this.connection.sendRawTransaction(
        transaction.serialize()
      );
    } else {
      throw new Error("CDP Signing returned unexpected result format.");
    }

    console.log("Transaction sent");
    console.log(
      `Signature - https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
  }
}
