import React, { useState } from 'react';
import { RefreshCw, ArrowRight, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

interface RoundTrip {
  id: string;
  name: string;
  amount: string;
  duration: string;
  whyFlagged: string;
  flow: string[];
}

export default function RoundTripsPage({ onNavigateToView }: { onNavigateToView?: (view: string) => void }) {
  const roundTrips: RoundTrip[] = [
    {
      id: "Round Trip #1",
      name: "Corporate Asset Inflation Loop",
      amount: "₹1,200,000",
      duration: "3 Days",
      whyFlagged: "Apex Venture Corp routed ₹1,200,000 to an offshore Cayman holding as an SLA retainer, which piped it to Seychelles, repatriating 95.8% back into Apex as a capital subscription. This artificially inflates domestic asset values while dodging transfer taxation.",
      flow: ["Victim Corp", "Delta Cayman Holding", "Seychelles Ltd", "Victim Corp"]
    },
    {
      id: "Round Trip #2",
      name: "Executive Compensation Avoidance",
      amount: "₹350,000",
      duration: "24 Hours",
      whyFlagged: "CEO Shell routed ₹350,000 to Offshore Panama Trust, which forwarded the liquidity to Seychelles, immediately re-depositing 91.4% back to the executive's private vault as a 'private loan document', bypassing standard income classifications.",
      flow: ["CEO Private Account", "Panama Legal Escrow", "Seychelles Trading Unit", "CEO Private Account"]
    }
  ];

  const [activeTab, setActiveTab] = useState<number>(0);
  const currentTrip = roundTrips[activeTab];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10 animate-fade-in select-none">
      
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#DC2626] font-semibold bg-[#FEF2F2] border border-[#FCA5A5] px-2.5 py-0.5 rounded-full font-mono">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Circular Loops Detected</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Suspicious Round Trips</h1>
        <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
          Circular capital flows designed to disguise sovereign dividends, artificial valuations, or tax jurisdiction swaps.
        </p>
      </div>

      {/* Primary Grid Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Loop Selectors */}
        <div className="md:col-span-5 space-y-3">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block font-mono">
            Cycle Directory
          </span>

          <div className="space-y-2.5">
            {roundTrips.map((trip, idx) => {
              const isSelected = activeTab === idx;
              return (
                <button
                  key={trip.id}
                  onClick={() => setActiveTab(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-white border-[#18181B] shadow-[0_4px_12px_rgba(0,0,0,0.03)]' 
                      : 'bg-[#FAF9F6] border-[#E4E4E7] hover:border-[#18181B]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                     <span className="font-bold text-[#18181B] font-sans">{trip.id}</span>
                     <span className="text-[10px] text-[#71717A] font-medium bg-white px-2 py-0.5 rounded border border-[#E4E4E7] font-mono">
                       {trip.duration}
                     </span>
                  </div>
                  
                  <div className="mt-2.5">
                    <p className="font-semibold text-slate-700 text-[11px] font-sans">{trip.name}</p>
                    <p className="text-lg font-bold text-[#18181B] mt-1 font-mono">{trip.amount}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[9px] text-[#71717A] max-w-full truncate overflow-hidden bg-white p-1.5 rounded border border-[#E4E4E7] font-mono">
                    {trip.flow.map((node, nIdx) => (
                      <React.Fragment key={nIdx}>
                        <span className="truncate max-w-[65px] font-medium">{node}</span>
                        {nIdx < trip.flow.length - 1 && <span>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Visual Graph & Details */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Graph Visualization Card */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block font-mono">
              Loop Graph Visualization
            </span>

            {/* Responsive, Clean Loop SVG Flowchart */}
            <div className="h-64 border border-[#F4F4F5] bg-[#FAF9F6] rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240">
                
                {/* Visual loop connection path */}
                <path 
                  d="M 200 40 C 330 40, 330 200, 200 200 C 70 200, 70 40, 200 40" 
                  fill="none" 
                  stroke="#E4E4E7" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                />

                {/* Animated active flows */}
                <path 
                  d="M 200 40 C 330 40, 330 200, 200 200 C 70 200, 70 40, 200 40" 
                  fill="none" 
                  stroke="#18181B" 
                  strokeWidth="2" 
                  strokeDasharray="8 8"
                  className="animate-pulse"
                />

                {/* Node coordinates laid out around loop */}
                {/* Node 1 */}
                <g transform="translate(200, 40)">
                  <rect x="-65" y="-15" width="130" height="30" rx="6" fill="#18181B" stroke="#18181B" strokeWidth="1" />
                  <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" className="font-sans">{currentTrip.flow[0]}</text>
                </g>

                {/* Node 2 */}
                <g transform="translate(310, 120)">
                  <rect x="-65" y="-15" width="130" height="30" rx="6" fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />
                  <text y="4" textAnchor="middle" fill="#18181B" fontSize="9" fontWeight="semibold" className="font-sans">{currentTrip.flow[1]}</text>
                </g>

                {/* Node 3 */}
                <g transform="translate(90, 120)">
                  <rect x="-65" y="-15" width="130" height="30" rx="6" fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />
                  <text y="4" textAnchor="middle" fill="#18181B" fontSize="9" fontWeight="semibold" className="font-sans">{currentTrip.flow[2]}</text>
                </g>

                {/* Node 4 */}
                <g transform="translate(200, 200)">
                  <rect x="-65" y="-15" width="130" height="30" rx="6" fill="#F4F4F5" stroke="#E4E4E7" strokeWidth="1" />
                  <text y="4" textAnchor="middle" fill="#52525B" fontSize="9" fontWeight="bold" className="font-sans">{currentTrip.flow[3]} (Origin)</text>
                </g>
                
                {/* Indicator labels */}
                <text x="200" y="115" textAnchor="middle" fill="#71717A" fontSize="9" fontWeight="medium" className="font-mono text-[8px]">CLOSED CONVERSION</text>
                <text x="200" y="130" textAnchor="middle" fill="#18181B" fontSize="13" fontWeight="extrabold" className="font-mono">{currentTrip.amount}</text>
              </svg>
            </div>
          </div>

          {/* Diagnosis info */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 space-y-3.5">
            <div>
              <span className="text-[10px] text-[#E11D48] bg-[#FFF1F2] border border-[#FFE4E6] px-2 py-0.5 rounded font-semibold uppercase tracking-wider font-mono">
                Reason Flagged
              </span>
              <h3 className="text-xs font-bold text-[#18181B] mt-2 font-sans">Analytical Ledger Disclosures</h3>
            </div>
            
            <p className="text-xs text-[#52525B] leading-relaxed font-light font-sans">
              {currentTrip.whyFlagged}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
