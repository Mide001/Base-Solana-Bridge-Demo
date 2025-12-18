"use client";

import React, { useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { NetworkProvider, useNetwork } from "@/context/NetworkContext";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

import { CONFIG } from "@/utils/bridgeConfig";

function WalletContent({ children }: { children: React.ReactNode }) {
    const { network } = useNetwork();

    // You can also assume typical mainnet RPCs via QuickNode/Helius if clusterApiUrl is rate limited
    const endpoint = useMemo(() => {
        return network === WalletAdapterNetwork.Mainnet
            ? CONFIG.RPC_URL_MAINNET
            : CONFIG.RPC_URL_DEVNET;
    }, [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default function AppWalletProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NetworkProvider>
            <WalletContent>{children}</WalletContent>
        </NetworkProvider>
    );
}
