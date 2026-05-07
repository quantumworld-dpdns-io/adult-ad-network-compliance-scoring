"use client";

import { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Lock,
  ChevronRight,
  Activity,
  AlertTriangle
} from "lucide-react";
import { publishers, simulateAdRequest, Publisher, AdRequestResult } from "@/lib/mock";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SimulationPage() {
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher>(publishers[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AdRequestResult | null>(null);

  const handleRunSimulation = async () => {
    setIsLoading(true);
    setResult(null);
    const simulationResult = await simulateAdRequest(selectedPublisher.id);
    setResult(simulationResult);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-20">
      {/* Hero Section */}
      <section className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-16 px-6 sm:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
            <Lock size={14} />
            <span>Fail-Closed Infrastructure</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Compliance Simulation
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Experience the "Fail-Closed" compliance mechanism. This simulator demonstrates how 
            traffic is automatically blocked when publisher scores drop below advertiser requirements, 
            ensuring zero compliance leakage.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Publisher Selector */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  Select Publisher
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {publishers.map((pub) => (
                  <button
                    key={pub.id}
                    onClick={() => {
                      setSelectedPublisher(pub);
                      setResult(null);
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border-2",
                      selectedPublisher.id === pub.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-sm"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{pub.name}</span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        pub.score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                        pub.score >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" :
                        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      )}>
                        {pub.score}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {pub.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Publisher Stats */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Compliance Breakdown
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Age Verification", value: selectedPublisher.details.ageVerification },
                  { label: "Content Moderation", value: selectedPublisher.details.contentModeration },
                  { label: "Traffic Quality", value: selectedPublisher.details.trafficQuality },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span>{stat.label}</span>
                      <span className="font-mono">{stat.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          stat.value >= 80 ? "bg-green-500" :
                          stat.value >= 60 ? "bg-yellow-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${stat.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Request Ad Button */}
          <div className="lg:col-span-1 flex lg:flex-col justify-center items-center py-4 lg:py-0 lg:h-full">
            <div className="h-px lg:h-24 w-12 lg:w-px bg-zinc-200 dark:bg-zinc-800 hidden lg:block" />
            <button
              onClick={handleRunSimulation}
              disabled={isLoading}
              className={cn(
                "z-10 flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100",
                isLoading && "animate-pulse"
              )}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="ml-1 fill-current" size={24} />
              )}
            </button>
            <div className="h-px lg:h-24 w-12 lg:w-px bg-zinc-200 dark:bg-zinc-800 hidden lg:block" />
          </div>

          {/* Right Side: Simulation Outcome */}
          <div className="lg:col-span-7 h-full">
            <div className={cn(
              "h-full min-h-[500px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col",
              result?.success === true && "border-green-200 dark:border-green-900/30",
              result?.success === false && "border-red-200 dark:border-red-900/30"
            )}>
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-500" />
                  Outcome
                </h2>
                {result && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    result.success ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  )}>
                    {result.success ? "Served" : "Blocked"}
                  </span>
                )}
              </div>

              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                {!result && !isLoading && (
                  <div className="text-zinc-400 space-y-4">
                    <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto">
                      <Info size={32} />
                    </div>
                    <div>
                      <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-2">Ready to Simulate</h3>
                      <p className="max-w-xs text-sm">Select a publisher and click the play button to start an ad request simulation.</p>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-zinc-100 dark:border-zinc-800 rounded-full mx-auto" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="animate-pulse space-y-2">
                      <p className="text-zinc-900 dark:text-zinc-100 font-medium">Verifying Compliance</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Querying distributed scoring engine...</p>
                    </div>
                  </div>
                )}

                {result?.success === true && (
                  <div className="w-full space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-center gap-4 text-green-600 dark:text-green-400 mb-2">
                      <CheckCircle2 size={48} />
                      <div className="text-left">
                        <h3 className="text-2xl font-bold">Access Granted</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm italic">Compliance threshold met.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Served Advertisement</h4>
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-100 dark:bg-zinc-800">
                          <img src={result.ad.imageUrl} alt="Ad Content" className="object-cover w-full h-full" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-white text-xs font-medium">{result.ad.advertiser}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Traffic Attestation</h4>
                        <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-[10px] leading-relaxed overflow-auto max-h-[160px] text-zinc-600 dark:text-zinc-400">
                          <pre>{result.attestation}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result?.success === false && (
                  <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <XCircle size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-red-600 dark:text-red-500">Access Denied</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
                        The request was automatically terminated by the enforcement layer.
                      </p>
                    </div>
                    
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/20 max-w-md mx-auto text-left flex gap-4">
                      <AlertTriangle className="text-red-500 shrink-0" size={24} />
                      <div>
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">Enforcement Logic Applied</h4>
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">
                          {result.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
