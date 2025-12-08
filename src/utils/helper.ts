import { PublicKey } from "@solana/web3.js";

export function normalizeSalt(salt: Uint8Array): Buffer {
  if (salt.length !== 32) throw new Error("Salt must be 32 bytes");
  return Buffer.from(salt);
}

export function deriveOutgoingMessagePda(
  salt: Uint8Array,
  bridgeProgramId: PublicKey
): PublicKey {
  const s = normalizeSalt(salt);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("outgoing_message"), s],
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
    [Buffer.from("mtr"), s],
    relayerProgramId
  );
  return pda;
}

export function addressToBytes20(address: string): Buffer {
  const clean = address.startsWith("0x") ? address.slice(2) : address;
  if (clean.length !== 40) throw new Error("Invalid EVM address length");
  return Buffer.from(clean, "hex");
}

export function writeUint128LE(value: bigint, buffer: Buffer) {
  let temp = value;
  for (let i = 0; i < 16; i++) {
    buffer[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
}

