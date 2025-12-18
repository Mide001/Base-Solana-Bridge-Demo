import { toBytes } from "viem";
import * as bs58 from "bs58";

function hexToSolAddress(hex: `0x${string}`): string {
    const bytes = toBytes(hex);
    const solAddress = bs58.default.encode(bytes);
    console.log(`Hex: ${hex} -> Sol Address: ${solAddress}`);
    return solAddress;
}

hexToSolAddress("0xBBA0507F606E765BC2AC879A732307C89FB1B2F0E17F5E62FAE0129276019907");

