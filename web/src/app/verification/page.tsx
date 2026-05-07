"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle,
  Clock,
  Fingerprint,
  Link as LinkIcon,
  Database
} from "lucide-react";

interface VerificationResult {
  id: string;
  impressionId: string;
  timestamp: string;
  status: "verified" | "failed" | "not_found";
  checks: {
    hashChain: boolean;
    signature: boolean;
    merkleProof: boolean;
  };
  raw: Record<string, unknown> | null;
}

export default function VerificationPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    // Mock verification delay
    setTimeout(() => {
      setIsLoading(false);
      if (query.toLowerCase().includes("fail")) {
        setResult({
          id: "attest_fail_999",
          impressionId: query,
          timestamp: new Date().toISOString(),
          status: "failed",
          checks: {
            hashChain: true,
            signature: false,
            merkleProof: true,
          },
          raw: {
            version: "1.0",
            impression_id: query,
            timestamp: Date.now(),
            status: "signature_mismatch",
            error: "Ed25519 signature validation failed for the provided payload."
          }
        });
      } else if (query.toLowerCase().includes("missing")) {
        setResult({
          id: "",
          impressionId: query,
          timestamp: "",
          status: "not_found",
          checks: {
            hashChain: false,
            signature: false,
            merkleProof: false,
          },
          raw: null
        });
      } else {
        setResult({
          id: `attest_${Math.random().toString(36).substring(2, 11)}`,
          impressionId: query,
          timestamp: new Date().toISOString(),
          status: "verified",
          checks: {
            hashChain: true,
            signature: true,
            merkleProof: true,
          },
          raw: {
            version: "1.0",
            impression_id: query,
            timestamp: Date.now(),
            ad_id: "ad_beef_001",
            publisher_id: "pub_cafe_002",
            compliance_score: 98,
            signature: "z58867V6798798n98n989n89n89n89n89n89n89n89n89n89n89n89n89n89n89n89n89n",
            merkle_root: "0x7f83b123456789abcdef0123456789abcdef0123456789abcdef0123456789abc",
            previous_hash: "0000000000000000000000000000000000000000000000000000000000000000"
          }
        });
      }
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <ShieldCheck className="w-10 h-10 text-indigo-600" />
          Verification Center
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Verify the integrity and authenticity of advertising impressions using our 
          blockchain-backed cryptographic proof system.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <form onSubmit={handleVerify} className="flex gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Attestation ID or Impression ID (e.g., imp_987654)"
              className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>
        </form>
      </div>

      {result && (
        <div className="space-y-6">
          {result.status === "not_found" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-amber-900 mb-2">Attestation Not Found</h2>
              <p className="text-amber-700">
                The ID <strong>{result.impressionId}</strong> could not be found in the global audit log. 
                This impression may not have been anchored yet or the ID is incorrect.
              </p>
            </div>
          ) : (
            <>
              <div className={`rounded-2xl border p-8 ${
                result.status === "verified" 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {result.status === "verified" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Authenticity Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Verification Failed
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Impression: {result.impressionId}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Fingerprint className="w-4 h-4" />
                        ID: {result.id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      {result.checks.hashChain ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">Hash Chain</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Integrity of the audit log sequence.
                    </p>
                    <div className="mt-3 text-xs font-medium text-green-600">
                      {result.checks.hashChain ? "Chain Verified" : "Chain Broken"}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-purple-600" />
                      </div>
                      {result.checks.signature ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">Ed25519 Signature</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Cryptographic origin proof.
                    </p>
                    <div className={`mt-3 text-xs font-medium ${result.checks.signature ? "text-green-600" : "text-red-600"}`}>
                      {result.checks.signature ? "Valid Signature" : "Invalid Signature"}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        <Database className="w-5 h-5 text-indigo-600" />
                      </div>
                      {result.checks.merkleProof ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">Merkle Proof</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Blockchain anchor validation.
                    </p>
                    <div className="mt-3 text-xs font-medium text-green-600">
                      {result.checks.merkleProof ? "Proof Valid" : "Proof Missing"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button 
                  onClick={() => setShowRaw(!showRaw)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">View Raw Attestation Data</span>
                  {showRaw ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                {showRaw && (
                  <div className="p-6 border-t border-gray-100 bg-gray-50 overflow-x-auto">
                    <pre className="text-sm text-gray-800 font-mono leading-relaxed">
                      {JSON.stringify(result.raw, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
