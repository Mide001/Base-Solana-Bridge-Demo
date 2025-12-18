import {
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { CONFIG } from "./bridgeConfig";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    deriveMessageToRelayPda,
    deriveOutgoingMessagePda,
    addressToBytes20,
    writeBigUInt64LE,
} from "./bridgeHelper";

export async function buildBridgeTransaction(
    payer: PublicKey,
    destinationAddress: string,
    amountSol: number,
    network: WalletAdapterNetwork
): Promise<Transaction> {
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

    // 1. Determine Network Config
    const isMainnet = network === WalletAdapterNetwork.Mainnet;

    const solanaBridgeProgramId = isMainnet
        ? CONFIG.SOLANA_BRIDGE_PROGRAM_ID_MAINNET
        : CONFIG.SOLANA_BRIDGE_PROGRAM_ID_DEVNET;

    const baseRelayerProgramId = isMainnet
        ? CONFIG.BASE_RELAYER_PROGRAM_ID_MAINNET
        : CONFIG.BASE_RELAYER_PROGRAM_ID_SEPOLIA;

    const gasFeeReceiver = isMainnet
        ? CONFIG.GAS_FEE_RECEIVER_MAINNET
        : CONFIG.GAS_FEE_RECEIVER_DEVNET;

    // Generate a random 32-byte salt
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);

    // 2. Derive PDAs using the correct Program IDs
    const outgoingMessagePda = deriveOutgoingMessagePda(
        salt,
        solanaBridgeProgramId
    );
    const messageToRelayPda = deriveMessageToRelayPda(
        salt,
        baseRelayerProgramId
    );

    const [bridgeAddress] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("bridge")],
        solanaBridgeProgramId
    );

    const [solVaultAddress] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("sol_vault")],
        solanaBridgeProgramId
    );

    const [cfgAddress] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("config")],
        baseRelayerProgramId
    );

    const transaction = new Transaction();

    const payRelayIx = createPayForRelayInstruction(
        payer,
        cfgAddress,
        gasFeeReceiver,
        messageToRelayPda,
        salt,
        outgoingMessagePda,
        CONFIG.DEFAULT_GAS_LIMIT,
        baseRelayerProgramId // Pass dynamic ID
    );

    const bridgeSolIx = createBridgeSolInstruction(
        payer,
        gasFeeReceiver,
        solVaultAddress,
        bridgeAddress,
        outgoingMessagePda,
        salt,
        destinationAddress,
        amountLamports,
        solanaBridgeProgramId // Pass dynamic ID
    );

    transaction.add(payRelayIx);
    transaction.add(bridgeSolIx);

    // Set fee payer and recent blockhash should be handled by the caller/wallet adapter usually,
    // but explicitly setting fee payer is good practice.
    transaction.feePayer = payer;

    return transaction;
}

function createPayForRelayInstruction(
    payer: PublicKey,
    cfg: PublicKey,
    gasFeeReceiver: PublicKey,
    messageToRelay: PublicKey,
    messageToRelaySalt: Uint8Array,
    outgoingMessage: PublicKey,
    gasLimit: bigint,
    programId: PublicKey
): TransactionInstruction {
    const discriminator = new Uint8Array([41, 191, 218, 201, 250, 164, 156, 55]);

    // Layout: discriminator(8) + salt(32) + outgoingMessage(32) + gasLimit(8)
    const data = new Uint8Array(8 + 32 + 32 + 8);
    let offset = 0;

    data.set(discriminator, offset);
    offset += 8;

    data.set(messageToRelaySalt, offset);
    offset += 32;

    // outgoingMessage.toBuffer() returns a generic Buffer/Uint8Array compatible object
    data.set(outgoingMessage.toBuffer(), offset);
    offset += 32;

    writeBigUInt64LE(gasLimit, data, offset);

    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: cfg, isSigner: false, isWritable: true },
            { pubkey: gasFeeReceiver, isSigner: false, isWritable: true },
            { pubkey: messageToRelay, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: Buffer.from(data), // Web3.js expects Buffer for data
    });
}

function createBridgeSolInstruction(
    payer: PublicKey,
    gasFeeReceiver: PublicKey,
    solVault: PublicKey,
    bridge: PublicKey,
    outgoingMessage: PublicKey,
    outgoingMessageSalt: Uint8Array,
    to: string,
    amount: bigint,
    programId: PublicKey
): TransactionInstruction {
    const discriminator = new Uint8Array([190, 190, 32, 158, 75, 153, 32, 86]);
    const toBytes = addressToBytes20(to); // returns Uint8Array

    // Layout: discriminator(8) + salt(32) + to(20) + amount(8) + callOption(1)
    // Note: In this simple version, we assume no contract call (callOption = 0)
    const callBuffer = new Uint8Array([0]);
    const data = new Uint8Array(8 + 32 + 20 + 8 + callBuffer.length);

    let offset = 0;
    data.set(discriminator, offset);
    offset += 8;

    data.set(outgoingMessageSalt, offset);
    offset += 32;

    data.set(toBytes, offset);
    offset += 20;

    writeBigUInt64LE(amount, data, offset);
    offset += 8;

    data.set(callBuffer, offset);

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
        programId: programId,
        data: Buffer.from(data), // Web3.js expects Buffer for data
    });
}
