import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { CONFIG } from "../utils/config";
import {
  deriveMessageToRelayPda,
  deriveOutgoingMessagePda,
  normalizeSalt,
  addressToBytes20,
} from "../utils/helper";
import * as crypto from "crypto";
import * as fs from "fs";

export class SolanaToBaseMainnetService {
  private connection: Connection;
  private signer: Keypair;

  constructor(privateKeyPath: string) {
    this.connection = new Connection(CONFIG.RPC_URL_MAINNET, "confirmed");

    const privateKeyString = fs.readFileSync(privateKeyPath, "utf-8");
    const secretKey = Uint8Array.from(JSON.parse(privateKeyString));
    this.signer = Keypair.fromSecretKey(secretKey);
  }

  async bridgeSol(amountSol: number, destinationAddress: string) {
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

    console.log(`Starting bridge: ${amountSol} SOL -> ${destinationAddress}`);
    console.log(`Signer: ${this.signer.publicKey.toBase58()}`);

    const salt32 = crypto.randomBytes(32);
    const saltBuffer = normalizeSalt(salt32);

    const outgoingMessagePda = deriveOutgoingMessagePda(
      saltBuffer,
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID_MAINNET
    );
    const messageToRelayPda = deriveMessageToRelayPda(
      saltBuffer,
      CONFIG.BASE_RELAYER_PROGRAM_ID_MAINNET
    );

    const [bridgeAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("bridge")],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID_MAINNET
    );
    const [solVaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault")],
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID_MAINNET
    );
    const [cfgAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      CONFIG.BASE_RELAYER_PROGRAM_ID_MAINNET
    );
    const transaction = new Transaction();

    const payRelayIx = this.createPayForRelayInstruction(
      this.signer.publicKey,
      cfgAddress,
      CONFIG.GAS_FEE_RECEIVER_MAINNET,
      messageToRelayPda,
      saltBuffer,
      outgoingMessagePda,
      CONFIG.DEFAULT_GAS_LIMIT
    );

    const bridgeSolIx = this.createBridgeSolInstruction(
      this.signer.publicKey,
      CONFIG.GAS_FEE_RECEIVER_MAINNET,
      solVaultAddress,
      bridgeAddress,
      outgoingMessagePda,
      saltBuffer,
      destinationAddress,
      amountLamports
    );

    transaction.add(payRelayIx);
    transaction.add(bridgeSolIx);

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.signer]
      );
      console.log("Bridge transaction successful");
      console.log(
        `Signature: https://explorer.solana.com/tx/${signature}?cluster=mainnet`
      );
      return signature;
    } catch (error) {
      console.error("Bridge failed: ", error);
      throw error;
    }
  }

  private createPayForRelayInstruction(
    payer: PublicKey,
    cfg: PublicKey,
    gasFeeReceiver: PublicKey,
    messageToRelay: PublicKey,
    messageToRelaySalt: Buffer,
    outgoingMessage: PublicKey,
    gasLimit: bigint
  ): TransactionInstruction {
    const discriminator = Buffer.from([41, 191, 218, 201, 250, 164, 156, 55]);

    const data = Buffer.alloc(8 + 32 + 32 + 8);
    let offset = 0;

    discriminator.copy(data, offset);
    offset += 8;
    messageToRelaySalt.copy(data, offset);
    offset += 32;
    outgoingMessage.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(gasLimit, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: cfg, isSigner: false, isWritable: true },
        { pubkey: gasFeeReceiver, isSigner: false, isWritable: true },
        { pubkey: messageToRelay, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.BASE_RELAYER_PROGRAM_ID_MAINNET,
      data,
    });
  }

  private createBridgeSolInstruction(
    payer: PublicKey,
    gasFeeReceiver: PublicKey,
    solVault: PublicKey,
    bridge: PublicKey,
    outgoingMessage: PublicKey,
    outgoingMessageSalt: Buffer,
    to: string,
    amount: bigint
  ): TransactionInstruction {
    const discriminator = Buffer.from([190, 190, 32, 158, 75, 153, 32, 86]);
    const toBytes = addressToBytes20(to);

    const callBuffer = Buffer.from([0]);
    const data = Buffer.alloc(8 + 32 + 20 + 8 + callBuffer.length);

    let offset = 0;
    discriminator.copy(data, offset);
    offset += 8;
    outgoingMessageSalt.copy(data, offset);
    offset += 32;
    toBytes.copy(data, offset);
    offset += 20;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    callBuffer.copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: payer, isSigner: true, isWritable: true }, // from = payer
        { pubkey: gasFeeReceiver, isSigner: false, isWritable: true },
        { pubkey: solVault, isSigner: false, isWritable: true },
        { pubkey: bridge, isSigner: false, isWritable: true },
        { pubkey: outgoingMessage, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.SOLANA_BRIDGE_PROGRAM_ID_MAINNET,
      data,
    });
  }
}
