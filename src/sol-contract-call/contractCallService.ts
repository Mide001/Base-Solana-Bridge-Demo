import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { CONFIG } from "../utils/config";
import {
  normalizeSalt,
  addressToBytes20,
  deriveMessageToRelayPda,
  deriveOutgoingMessagePda,
  writeUint128LE,
} from "../utils/helper";
import * as fs from "fs";
import * as crypto from "crypto";

export class SolanaContractCallService {
  private connection: Connection;
  private signer: Keypair;

  constructor(privateKeyPath: string) {
    this.connection = new Connection(CONFIG.RPC_URL, "confirmed");
    const privateKeyString = fs.readFileSync(privateKeyPath, "utf-8");
    const secretKey = Uint8Array.from(JSON.parse(privateKeyString));
    this.signer = Keypair.fromSecretKey(secretKey);
  }

  async callBaseContract(
    targetContractAddress: string,
    callDataHex: string,
    msgValueEther: string = "0"
  ) {
    console.log(`Initiating Cross-Chain Call to: ${targetContractAddress}`);

    const salt32 = crypto.randomBytes(32);
    const saltBuffer = normalizeSalt(salt32);

    const outgoingMessagePda = deriveOutgoingMessagePda(
      saltBuffer,
      CONFIG.SOLANA_BRIDGE_PROGRAM_ID
    );
    const messageToRelayPda = deriveMessageToRelayPda(
      saltBuffer,
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

    const callBuffer = this.serializeCall(
      targetContractAddress,
      callDataHex,
      msgValueEther
    );

    const transaction = new Transaction();

    const payRelayIx = this.createPayForRelayInstruction(
      this.signer.publicKey,
      cfgAddress,
      CONFIG.GAS_FEE_RECEIVER,
      messageToRelayPda,
      saltBuffer,
      outgoingMessagePda,
      CONFIG.DEFAULT_GAS_LIMIT
    );

    const bridgeAmount = 0n;

    const bridgeSolIx = this.createBridgeSolInstruction(
      this.signer.publicKey,
      CONFIG.GAS_FEE_RECEIVER,
      solVaultAddress,
      bridgeAddress,
      outgoingMessagePda,
      saltBuffer,
      targetContractAddress,
      bridgeAmount,
      callBuffer
    );

    transaction.add(payRelayIx);
    transaction.add(bridgeSolIx);

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.signer]
      );
      console.log(`Contract Call Submitted`);
      console.log(
        `Signature: https://explorer.solana.com/tx/${signature}?cluster=devnet`
      );
      return signature;
    } catch (error) {
      console.error(`Failed: ${error}`);
      throw error;
    }
  }

  private serializeCall(
    target: string,
    dataHex: string,
    valStr: string
  ): Buffer {
    const header = Buffer.from([1, 0]);

    const targetBuf = addressToBytes20(target);

    const valBigInt = BigInt((parseFloat(valStr) * 1e18).toString());
    const valueBuf = Buffer.alloc(16);
    writeUint128LE(valBigInt, valueBuf);

    const cleanData = dataHex.startsWith("0x") ? dataHex.slice(2) : dataHex;
    const payload = Buffer.from(cleanData, "hex");

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(payload.length, 0);

    return Buffer.concat([header, targetBuf, valueBuf, lenBuf, payload]);
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
    // ... Same as previous script ...
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
      programId: CONFIG.BASE_RELAYER_PROGRAM_ID,
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
    amount: bigint,
    callBuffer: Buffer // New Parameter
  ): TransactionInstruction {
    const discriminator = Buffer.from([190, 190, 32, 158, 75, 153, 32, 86]);
    const toBytes = addressToBytes20(to);

    // Layout: discriminator(8) + salt(32) + to(20) + amount(8) + callBuffer(Var)
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
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: gasFeeReceiver, isSigner: false, isWritable: true },
        { pubkey: solVault, isSigner: false, isWritable: true },
        { pubkey: bridge, isSigner: false, isWritable: true },
        { pubkey: outgoingMessage, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.SOLANA_BRIDGE_PROGRAM_ID,
      data,
    });
  }
}
