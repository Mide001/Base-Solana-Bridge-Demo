"use client";

import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { buildBridgeTransaction } from "@/utils/bridgeService";
import { Loader2, Terminal, ArrowDown, Wallet, Network } from "lucide-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useNetwork } from "@/context/NetworkContext";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export function BridgeForm() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { network, toggleNetwork } = useNetwork(); // Hook
    const [amount, setAmount] = useState("");
    const [usdAmount, setUsdAmount] = useState(""); // USD Input
    const [solPrice, setSolPrice] = useState<number | null>(null); // Live Price
    const [destination, setDestination] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>(["> System initialized.", "> Waiting for wallet connection..."]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-4), `> ${msg}`]);
    };

    // Fetch SOL Price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
                const data = await res.json();
                if (data.solana?.usd) {
                    setSolPrice(data.solana.usd);
                    // addLog(`Oracle Connected: SOL = $${data.solana.usd}`);
                }
            } catch (e) {
                console.error("Price fetch failed", e);
            }
        };
        fetchPrice();
        // Refresh price every 60s
        const interval = setInterval(fetchPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!publicKey) {
            setBalance(null);
            return;
        }

        addLog(`Wallet connected: ${publicKey.toBase58().slice(0, 8)}...`);

        const fetchBalance = async () => {
            try {
                const bal = await connection.getBalance(publicKey);
                setBalance(bal / LAMPORTS_PER_SOL);
            } catch (error: any) {
                console.error("Failed to fetch balance", error);
                if (error?.message?.includes("403") || error?.toString().includes("403")) {
                    addLog("CRITICAL: RPC Rate Limit (403).");
                    addLog("ACTION: Switch to private RPC.");
                    setStatus("RPC_LIMITED");
                    // Stop polling on critical error
                    clearInterval(intervalId);
                }
            }
        };

        fetchBalance();
        const intervalId = setInterval(fetchBalance, 10000);
        return () => clearInterval(intervalId);
    }, [publicKey, connection]);

    // Validation State
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    const isAddressValid = evmRegex.test(destination);
    const isAmountValid = !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
    const canSubmit = publicKey && isAddressValid && isAmountValid && !isLoading;

    // Log validation error with debounce
    useEffect(() => {
        if (!destination) return;

        const timer = setTimeout(() => {
            if (!isAddressValid) {
                addLog("ERROR: Invalid format.");
                addLog("HINT: Paste your wallet on Base instead.");
            }
        }, 1000); // 1 second delay to avoid spamming while typing

        return () => clearTimeout(timer);
    }, [destination, isAddressValid]);

    const handleBridge = async () => {
        if (!canSubmit) return;

        try {
            setIsLoading(true);
            setStatus("PROCESSING...");
            addLog("Initiating upload protocol...");

            const latestBlockhash = await connection.getLatestBlockhash();

            const transaction = await buildBridgeTransaction(
                publicKey!,
                destination,
                parseFloat(amount),
                network // Pass network
            );

            transaction.recentBlockhash = latestBlockhash.blockhash;
            transaction.feePayer = publicKey!;

            setStatus("AWAITING_SIGNATURE...");
            addLog("Requesting user authorization...");
            const signature = await sendTransaction(transaction, connection);

            setStatus("TRANSMITTING...");
            addLog(`Tx Sent: ${signature.slice(0, 8)}...`);

            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            }, "confirmed");

            setStatus("SUCCESS");
            addLog("Transfer complete. Assets bridged.");
            setAmount("");
            const bal = await connection.getBalance(publicKey!);
            setBalance(bal / LAMPORTS_PER_SOL);
        } catch (error: any) {
            console.error(error);
            setStatus("FAILURE");
            addLog(`Error: ${error.message || "Unknown Failure"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-col gap-4 md:gap-6">

                {/* Header / Wallet Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-green-900/50 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-green-500">
                            <Terminal size={18} />
                            <span className="text-xl font-bold tracking-wider">COMMAND_CENTER</span>
                        </div>

                        {/* Network Toggle */}
                        <button
                            onClick={toggleNetwork}
                            className={`px-3 py-1 text-xs font-bold border rounded-sm transition-all ${network === WalletAdapterNetwork.Mainnet
                                ? "border-red-500 text-red-500 bg-red-900/10 hover:bg-red-900/20"
                                : "border-green-500 text-green-500 bg-green-900/10 hover:bg-green-900/20"
                                }`}
                        >
                            [{network === WalletAdapterNetwork.Mainnet ? "MAINNET_BETA" : "DEVNET_MODE"}]
                        </button>
                    </div>

                    <WalletMultiButton className="!bg-green-900/30 !border !border-green-600 !rounded-none !h-10 !px-4 !text-green-400 hover:!bg-green-900/60 !font-mono !text-sm w-full md:w-auto justify-center" />
                </div>

                {/* Swap Interface Container */}
                <div className="relative flex flex-col gap-2">

                    {/* FROM PANEL (Solana) */}
                    <div className="bg-green-900/10 border border-green-800 p-4 rounded-sm hover:border-green-600 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-green-600 tracking-widest uppercase">FROM (SOURCE)</span>
                            {publicKey && balance !== null && (
                                <span className="text-xs text-green-600 font-mono cursor-pointer hover:text-green-400" onClick={() => setAmount(balance.toString())}>
                                    BAL: {balance.toFixed(4)} {solPrice ? `(≈$${(balance * solPrice).toFixed(2)})` : ""}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAmount(val);
                                        if (solPrice && val) {
                                            setUsdAmount((parseFloat(val) * solPrice).toFixed(2));
                                        } else {
                                            setUsdAmount("");
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-2/3 bg-transparent text-2xl md:text-3xl font-mono text-green-400 placeholder-green-900/50 focus:outline-none"
                                    disabled={isLoading}
                                />
                                <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1 border border-green-800 rounded-full">
                                    <Network size={14} className="text-green-500" />
                                    <span className="text-sm font-bold text-green-400">SOL</span>
                                </div>
                            </div>

                            {/* USD Equivalent / Input */}
                            <div className="flex items-center gap-2 pl-1">
                                <span className="text-sm font-bold text-green-700">≈ $</span>
                                <input
                                    type="number"
                                    value={usdAmount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setUsdAmount(val);
                                        if (solPrice && val) {
                                            setAmount((parseFloat(val) / solPrice).toFixed(4));
                                        } else {
                                            setAmount("");
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="bg-transparent text-lg font-mono text-green-600/80 focus:text-green-400 focus:outline-none w-32 border-b border-green-900/30 focus:border-green-600 transition-colors"
                                />
                                <span className="text-xs text-green-800 font-mono">
                                    (@ ${solPrice?.toFixed(2) || "---"})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-transform active:scale-95">
                        <div className="bg-black border border-green-600 p-2 rounded-full shadow-[0_0_10px_rgba(0,255,0,0.2)]">
                            <ArrowDown size={16} className="text-green-500 animate-pulse" />
                        </div>
                    </div>

                    {/* TO PANEL (Base) */}
                    <div className={`bg-green-900/10 border p-4 rounded-sm transition-colors ${destination && !isAddressValid ? "border-red-600 bg-red-900/10" : "border-green-800 hover:border-green-600"
                        }`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold tracking-widest uppercase ${destination && !isAddressValid ? "text-red-500" : "text-green-600"
                                }`}>TO (TARGET)</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-2xl md:text-3xl font-mono text-green-400/50 select-none">
                                    {amount || "0.00"}
                                </span>
                                <div className="flex items-center gap-2 bg-blue-900/20 px-3 py-1 border border-blue-800 rounded-full">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(0,0,255,0.5)]"></div>
                                    <span className="text-sm font-bold text-blue-400">BASE</span>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                placeholder="Target EVM Address (0x...)"
                                className={`w-full bg-black/50 border-b text-base md:text-sm font-mono placeholder-green-900/50 focus:outline-none py-2 mt-2 transition-colors uppercase tracking-wider ${destination && !isAddressValid
                                    ? "text-red-400 border-red-600 focus:border-red-500"
                                    : "text-green-400 border-green-900/50 focus:border-green-500"
                                    }`}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>

                {/* Status & Logs */}
                <div className="space-y-2">
                    {status && (
                        <div className={`p-2 border-l-4 text-xs font-mono uppercase tracking-widest ${status === "FAILURE" || status.includes("ERROR")
                            ? "border-red-600 text-red-500 bg-red-900/10"
                            : "border-green-500 text-green-400 bg-green-900/10"
                            }`}>
                            STATUS: {status}
                        </div>
                    )}

                    <div className="bg-black border border-green-900/50 p-2 h-20 overflow-y-auto font-mono text-xs text-green-700 font-bold scrollbar-hide">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1">{log}</div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleBridge}
                    disabled={!canSubmit}
                    className={`w-full py-4 border font-bold text-lg uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_15px_rgba(0,255,0,0.5)] ${!canSubmit
                        ? "opacity-50 cursor-not-allowed border-green-900 text-green-900 bg-black"
                        : "border-green-500 text-green-500 bg-black hover:bg-green-500 hover:text-black"
                        }`}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" size={20} />
                            UPLOADING...
                        </div>
                    ) : !publicKey ? (
                        "[ ACCESS DENIED ]"
                    ) : !isAddressValid && destination ? (
                        "[ INVALID TARGET ADDR ]"
                    ) : (
                        "[ EXECUTE_BRIDGE ]"
                    )}
                </button>
            </div>
        </div>
    );
}
