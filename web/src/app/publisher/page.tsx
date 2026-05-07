'use client';

import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, BarChart3, Clock, ArrowUpRight } from 'lucide-react';
import { mockComplianceData } from '@/lib/mock';

export default function PublisherDashboard() {
  const { overallScore, breakdown, alerts } = mockComplianceData;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 border-green-200 bg-green-50';
    if (score >= 75) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-red-600 border-red-200 bg-red-50';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Publisher Dashboard</h1>
            <p className="text-slate-500 mt-1">Monitor your compliance standing and network health.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Export Report
            </button>
            <button className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
              Refresh Data
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Score Gauge */}
          <div className="lg:col-span-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Compliance Score</h2>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-100"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - overallScore / 100)}
                  strokeLinecap="round"
                  className="text-indigo-600 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-slate-900">{overallScore}</span>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Overall</span>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100">
              <ArrowUpRight size={16} />
              <span>+2.4% from last month</span>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakdown.map((item) => (
              <div key={item.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-medium text-slate-500">{item.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getScoreColor(item.score)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-slate-900">{item.score}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(item.score)} transition-all duration-500`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remediation Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-indigo-600" />
              Remediation Center
            </h2>
            <span className="text-sm text-slate-500 font-medium">{alerts.length} active alerts</span>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-lg shrink-0 ${
                  alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {alert.type === 'warning' ? <AlertTriangle size={20} /> : <Info size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-slate-900">{alert.message}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {alert.date}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4">
                    <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Take Action</button>
                    <button className="text-sm font-semibold text-slate-400 hover:text-slate-500">Dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
