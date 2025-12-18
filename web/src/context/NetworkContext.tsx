"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

interface NetworkContextType {
    network: WalletAdapterNetwork;
    toggleNetwork: () => void;
}

const NetworkContext = createContext<NetworkContextType>({
    network: WalletAdapterNetwork.Devnet,
    toggleNetwork: () => { },
});

export function NetworkProvider({ children }: { children: ReactNode }) {
    const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);

    const toggleNetwork = () => {
        setNetwork((prev) =>
            prev === WalletAdapterNetwork.Devnet
                ? WalletAdapterNetwork.Mainnet
                : WalletAdapterNetwork.Devnet
        );
    };

    return (
        <NetworkContext.Provider value={{ network, toggleNetwork }}>
            {children}
        </NetworkContext.Provider>
    );
}

export const useNetwork = () => useContext(NetworkContext);
