import { BridgeWrapper } from "@/components/BridgeWrapper";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-green-500 overflow-hidden relative scanlines font-mono selection:bg-green-900 selection:text-green-100">

      {/* Matrix Rain / Background Noise (Simulated with simple grid/dots if complex rain too heavy) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uB8zDBXzO/giphy.gif')] bg-cover"></div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl border border-green-800 bg-black/90 shadow-[0_0_20px_rgba(0,255,0,0.2)] rounded-sm overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-green-900/20 border-b border-green-800 p-2 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <div className="text-xs text-green-400 tracking-widest glow-text">-- SECURE UPLINK ESTABLISHED --</div>
            <div className="text-xs text-green-600">v1.0.4</div>
          </div>

          <div className="p-4 md:p-8">
            <div className="mb-8 text-center space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest glow-text animate-pulse">
                &gt; SOL_BRIDGE
              </h1>
              <p className="text-green-700 text-sm font-bold tracking-[0.2em] uppercase">
                Protocol: Solana-Devnet &lt;-&gt; Base-Sepolia
              </p>
            </div>

            <BridgeWrapper />

            <div className="mt-8 text-center border-t border-green-900/50 pt-4">
              <p className="text-green-800 text-xs uppercase cursor-blink">
                Awaiting Input...
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-green-900 text-xs uppercase text-center">
          System ID: G-8291-X  •  Encrypted Connection
        </footer>
      </div>
    </main>
  );
}
