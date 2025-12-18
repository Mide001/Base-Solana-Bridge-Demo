import { PublicKey } from "@solana/web3.js";

export function normalizeSalt(salt: Uint8Array): Uint8Array {
    if (salt.length !== 32) throw new Error("Salt must be 32 bytes");
    return salt;
}

export function deriveOutgoingMessagePda(
    salt: Uint8Array,
    bridgeProgramId: PublicKey
): PublicKey {
    const s = normalizeSalt(salt);
    const [pda] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("outgoing_message"), s],
        bridgeProgramId
    );

    return pda;
}

export function deriveMessageToRelayPda(
    salt: Uint8Array,
    relayerProgramId: PublicKey
): PublicKey {
    const s = normalizeSalt(salt);
    const [pda] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("mtr"), s],
        relayerProgramId
    );
    return pda;
}

export function addressToBytes20(address: string): Uint8Array {
    const clean = address.startsWith("0x") ? address.slice(2) : address;
    if (clean.length !== 40) throw new Error("Invalid EVM address length");

    // Hex string to Uint8Array
    const bytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
        bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Needed for instruction data construction
export function writeBigUInt64LE(value: bigint, buffer: Uint8Array, offset: number) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    view.setBigUint64(offset, value, true);
}
