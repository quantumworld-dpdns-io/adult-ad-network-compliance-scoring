'use client';

import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert,
  Target,
  Users,
  Eye
} from 'lucide-react';
import { mockCampaigns, mockAggregatedMetrics } from '@/lib/mock';

export default function AdvertiserDashboard() {
  const { totalValidImpressions, totalDiscardedImpressions } = mockAggregatedMetrics;
  const discardedRate = (totalDiscardedImpressions / (totalValidImpressions + totalDiscardedImpressions) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Advertiser Portal</h1>
            <p className="text-slate-500 mt-1">Manage campaigns and monitor compliance targeting.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={18} />
            Create Campaign
          </button>
        </header>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-green-600">
              <div className="p-2 bg-green-50 rounded-lg">
                <ShieldCheck size={20} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider">Valid Impressions</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{totalValidImpressions.toLocaleString()}</span>
              <span className="text-sm text-slate-500">total</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ShieldAlert size={20} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider">Discarded (Fraud)</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{totalDiscardedImpressions.toLocaleString()}</span>
              <span className="text-sm text-amber-600 font-medium">-{discardedRate}% saved spend</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider">Avg. ROI Performance</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">+12.4%</span>
              <span className="text-sm text-slate-500 text-green-600 font-medium">↑ 3.1%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Campaign Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800">Active Campaigns</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search campaigns..." 
                      className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <button className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100">
                    <Filter size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="px-6 py-3">Campaign Name</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Impressions</th>
                      <th className="px-6 py-3 text-right">Min. Score</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mockCampaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 font-mono">
                          {c.impressions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-indigo-600">{c.minScore}+</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Create Campaign Form (Visual Only) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-500/5">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Target size={20} className="text-indigo-600" />
                Compliance Targeting
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Minimum Compliance Score</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    defaultValue="85"
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                  />
                  <div className="flex justify-between mt-1 text-sm font-medium text-slate-600">
                    <span>Reach-focused (0)</span>
                    <span className="text-indigo-600">85+ recommended</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <Users size={18} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Require Age Gate</span>
                    </div>
                    <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <Eye size={18} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Content Verification</span>
                    </div>
                    <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mt-6">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase mb-1 tracking-wider">Projected Reach</h4>
                  <p className="text-2xl font-bold text-indigo-900">842,000</p>
                  <p className="text-xs text-indigo-600 mt-1">High-quality impressions filtered by compliance standards.</p>
                </div>

                <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-shadow shadow-md shadow-indigo-200">
                  Save Targeting Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
