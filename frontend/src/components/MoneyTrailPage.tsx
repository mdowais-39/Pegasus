import React from 'react';
import { ArrowRight, CornerDownRight, Coins, ShieldAlert, FileSearch } from 'lucide-react';

export default function MoneyTrailPage() {
  const creditReceived = {
    amount: "₹500,000",
    source: "Apex Parent Inflow Ledger",
    date: "Oct 11, 2026",
    account: "Vanguard Comms #5502"
  };

  const dispersionNodes = [
    {
      id: "Account A",
      label: "Carlos Santana (Mule Proxy)",
      amount: "₹100,000",
      ratio: "20%",
      date: "Oct 12, 2026",
      desc: "Structured branch Teller Cash Drop designed to dodge reporting thresholds.",
      suspicious: true,
    },
    {
      id: "Account B",
      label: "Delta Nominee Cayman Holdings",
      amount: "₹200,000",
      ratio: "40%",
      date: "Oct 12, 2026",
      desc: "Layered transit wire to Caribbean secrecy trust account.",
      suspicious: true,
    },
    {
      id: "Account C",
      label: "BitBridge OTC Liquidity Provider",
      amount: "₹200,000",
      ratio: "40%",
      date: "Oct 13, 2026",
      desc: "Instant conversion of funds into anonymous USDT stablecoins.",
      suspicious: true,
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-12 animate-fade-in select-none">
      
      {/* Header Block */}
      <div className="space-y-2 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] font-semibold bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full font-mono">
          <Coins className="w-3.5 h-3.5" />
          <span>FIFO Asset Tracing</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Chronological Money Trails</h1>
        <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
          First-In, First-Out (FIFO) tracing pairs chronological outflows back to suspicious source triggers, bypassing intermediate shell shields.
        </p>
      </div>

      {/* SECTION 1: VISUAL WATERFALL TREE */}
      <div className="bg-white border border-[#E4E4E7] rounded-xl p-8 space-y-10 shadow-xs relative">
        <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block font-mono">
          Asset Allocation Waterfall Diagram
        </span>

        {/* Chronological Waterfall Block */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF9F6] p-6 rounded-lg border border-[#F4F4F5]">
          
          {/* Source node (Left) */}
          <div className="md:col-span-4 border border-[#18181B] bg-[#18181B] text-white p-5 rounded-lg space-y-3 shadow-md relative">
            <div>
              <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA] font-mono">Waterfall Source</span>
              <h3 className="text-sm font-bold mt-0.5 font-sans">{creditReceived.source}</h3>
            </div>
            
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#A1A1AA] font-mono">{creditReceived.account}</span>
              <p className="text-2xl font-extrabold text-white mt-1.5 font-mono">{creditReceived.amount}</p>
            </div>

            <div className="text-[9px] text-[#71717A] bg-white/5 py-1 px-2 rounded mt-2 text-center font-mono">
              Settled: {creditReceived.date}
            </div>
          </div>

          {/* Connected bifurcations index indicators on desktop */}
          <div className="hidden md:flex md:col-span-1 items-center justify-center text-[#A1A1AA]">
            <ArrowRight className="w-6 h-6 stroke-[1.5px]" />
          </div>

          {/* Allocation targets list (Right) */}
          <div className="md:col-span-7 space-y-3">
            {dispersionNodes.map((node) => (
              <div 
                key={node.id}
                className="bg-white border border-[#E4E4E7] rounded-lg p-3.5 flex items-center justify-between text-xs transition-shadow hover:shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-700 bg-[#EEF2FF] px-1.5 py-0.5 rounded leading-none font-mono">
                      {node.id}
                    </span>
                    <span className="text-[10px] text-[#71717A] font-mono">• Allocation {node.ratio}</span>
                  </div>
                  <h4 className="font-semibold text-[#18181B] truncate font-sans">{node.label}</h4>
                  <p className="text-[10px] text-[#71717A] truncate font-light font-sans">{node.date} • {node.desc}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-[#18181B] font-mono">{node.amount}</p>
                  <p className="text-[9px] text-[#C2410C] mt-0.5 font-semibold uppercase font-mono">Flagged Outflow</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* SECTION 2: CHRONOCHART SPECIFICATION SUMMARY */}
      <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider font-mono">
            Chronological FIFO Dispatch Log
          </h3>
          <p className="text-[11px] text-[#71717A] mt-1 font-light font-sans">
            When the original volume settled on October 11, the subsequent disbursements on October 12-13 matches exact timestamp signatures, proving structured liquidation.
          </p>
        </div>

        <div className="divide-y divide-[#E4E4E7] text-xs">
          {dispersionNodes.map((node, index) => (
            <div key={index} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0 font-sans">
              <CornerDownRight className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
              <div className="flex-1 font-sans">
                <div className="flex justify-between">
                  <span className="font-bold text-[#18181B]">{node.label}</span>
                  <span className="font-semibold text-[#C2410C] font-mono">{node.amount}</span>
                </div>
                <p className="text-[11px] text-[#71717A] mt-0.5 font-light leading-relaxed">
                  {node.desc} Matching original trigger trace at proportion ratio of <strong className="font-medium text-[#18181B] font-mono">{node.ratio}</strong> of entire incoming portfolio balance.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
