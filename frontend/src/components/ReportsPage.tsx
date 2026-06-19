import React, { useState } from 'react';
import { FileDown, CheckCircle, RefreshCw } from 'lucide-react';

export default function ReportsPage() {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    setSuccessMessage(null);
    setTimeout(() => {
      setIsExportingPDF(false);
      setSuccessMessage("PDF Report successfully compiled and downloaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 1000);
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    setSuccessMessage(null);
    setTimeout(() => {
      setIsExportingExcel(false);
      setSuccessMessage("Excel Spreadsheet successfully compiled and downloaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10 animate-fade-in select-none">
      
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E4E4E7] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Investigation Report</h1>
          <p className="text-sm text-[#71717A] mt-1 font-light font-sans">Certified compliance and forensic brief compilation.</p>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || isExportingPDF}
            className="flex-1 sm:flex-initial px-4 py-1.5 bg-white border border-[#E4E4E7] hover:border-[#18181B] text-[#18181B] text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans"
          >
            {isExportingExcel ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#71717A]" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-[#52525B]" />
            )}
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingExcel || isExportingPDF}
            className="flex-1 sm:flex-initial px-4 py-1.5 bg-[#18181B] hover:bg-black text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans"
          >
            {isExportingPDF ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-white" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Dynamic Feedback indicator */}
      {successMessage && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-lg text-xs font-bold flex items-center gap-2 animate-fade-in font-sans">
          <CheckCircle className="w-4 h-4 text-[#10B981]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Master report body */}
      <div className="space-y-8 text-[#18181B]">
        
        {/* Module 1: Investigation Summary */}
        <div className="space-y-2 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            1. Investigation Summary
          </h2>
          <p className="text-xs text-[#52525B] leading-relaxed font-light">
            This formal dossier consolidates multi-jurisdictional financial flow indices identified during the parsing phase. The forensic audit isolated a structured circular pathway designed to circumvent threshold disclosures, returning 95.8% of capital back to origin corporate nodes.
          </p>
        </div>

        {/* Module 2: Suspicious Transactions */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            2. Suspicious Transactions
          </h2>
          
          <div className="overflow-hidden border border-[#E4E4E7] rounded-xl text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E4E4E7] text-[10px] uppercase font-bold text-[#71717A] font-mono">
                  <th className="p-3 pl-4">Sender</th>
                  <th className="p-3">Receiver</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right pr-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7] bg-white font-sans">
                <tr className="hover:bg-[#FAFAFA]">
                  <td className="p-3 pl-4 font-semibold text-[#18181B]">Apex Venture Corp</td>
                  <td className="p-3 text-[#52525B]">Delta Shell Holdings</td>
                  <td className="p-3 text-[#71717A] font-light">Consulting SLA payout</td>
                  <td className="p-3 text-right font-bold pr-4 text-[#18181B] font-mono">₹1,200,000</td>
                </tr>
                <tr className="hover:bg-[#FAFAFA]">
                  <td className="p-3 pl-4 font-semibold text-[#18181B]">Carlos Santana</td>
                  <td className="p-3 text-[#52525B]">Delta Shell Holdings</td>
                  <td className="p-3 text-[#71717A] font-light">Structured Retail Cash Drop</td>
                  <td className="p-3 text-right font-bold pr-4 text-[#18181B] font-mono">₹385,000</td>
                </tr>
                <tr className="hover:bg-[#FAFAFA]">
                  <td className="p-3 pl-4 font-semibold text-[#18181B]">Delta Shell Holdings</td>
                  <td className="p-3 text-[#52525B]">ERC20 Mixer (0x7a84...)</td>
                  <td className="p-3 text-[#71717A] font-light">Smart Contract swap</td>
                  <td className="p-3 text-right font-bold pr-4 text-[#18181B] font-mono">₹450,050</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Module 3: Round Trips */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            3. Round Trips
          </h2>
          <div className="p-4 bg-white border border-[#E4E4E7] rounded-xl text-xs space-y-2">
            <div className="flex justify-between items-center bg-[#FAF9F6] p-2 rounded border border-[#E4E4E7] font-semibold text-[#18181B]">
              <span className="font-sans">Round Trip #1 (Corporate Assets Loop)</span>
              <strong className="font-mono">₹1,200,000</strong>
            </div>
            <p className="text-[#52525B] font-light leading-relaxed">
              Path: Victim Corp → Delta Cayman → Seychelles Ltd → Victim Corp. Disguised repatriation completed in 3 working days back into Victim Corp as an equity subscription to artificially inflate domestic valuations.
            </p>
          </div>
        </div>

        {/* Module 4: Money Flow */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            4. Money Flow Topology Nodes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl space-y-1">
              <span className="text-[10px] text-[#2563EB] font-bold uppercase font-mono">Origination Points</span>
              <p className="font-bold text-[#18181B]">2 Senders</p>
              <p className="text-[11px] text-[#71717A] font-light">Apex Corp and mule nominee cash channels</p>
            </div>
            <div className="p-4 bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl space-y-1">
              <span className="text-[10px] text-[#059669] font-bold uppercase font-mono">Offshore Transit Points</span>
              <p className="font-bold text-[#18181B]">2 Shelving Units</p>
              <p className="text-[11px] text-[#71717A] font-light">Cayman Delta and Seychelles Trust conduits</p>
            </div>
            <div className="p-4 bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl space-y-1">
              <span className="text-[10px] text-[#DC2626] font-bold uppercase font-mono">Accumulation Destinations</span>
              <p className="font-bold text-[#18181B]">2 Settlement Sinks</p>
              <p className="text-[11px] text-[#71717A] font-light">Cryptocurrency mixer and UK property assets escrow</p>
            </div>
          </div>
        </div>

        {/* Module 5: Money Trails */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            5. Money Trails (First-In, First-Out Trace)
          </h2>
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-[#18181B]">Secondary Dispersion Trace (Total credit ₹500,000)</div>
            <div className="space-y-1.5 text-[#52525B] font-light font-mono">
              <p>• ₹100,000 (20% ratio) chronologically forwarded to Account A (Mule)</p>
              <p>• ₹200,000 (40% ratio) chronologically forwarded to Account B (Cayman Shell)</p>
              <p>• ₹200,000 (40% ratio) chronologically forwarded to Account C (OTC Desk)</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
