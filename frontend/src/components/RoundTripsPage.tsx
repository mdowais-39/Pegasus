import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowRight, ShieldAlert, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useFinintelData } from '../context/FinintelDataContext';
import { getRoundTrips, getRoundTripExplanation } from '../services/finintelApi';
import { RoundTrip } from '../types/api';

export default function RoundTripsPage({ onNavigateToView }: { onNavigateToView?: (view: string) => void }) {
  const { caseId, setCaseId, latestStatementId } = useFinintelData();

  const [roundTrips, setRoundTrips] = useState<RoundTrip[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Explanation states
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const response = await getRoundTrips(caseId);
      const trips = response.round_trips || [];
      setRoundTrips(trips);
      setActiveTab(0);
      
      if (trips.length > 0) {
        fetchExplanation(0, trips[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load round trips from gateway.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  const fetchExplanation = async (index: number, trip: RoundTrip) => {
    const chainId = trip.id !== undefined ? trip.id : index;
    setIsLoadingExplanation(true);
    setExplanation(null);
    try {
      const response = await getRoundTripExplanation(caseId, chainId);
      setExplanation(response.explanation || response.why_flagged || response.details || null);
    } catch (err) {
      console.error("Failed to fetch explanation for round-trip:", err);
      // Fallback description based on nodes and amounts
      const nodes = trip.accounts || trip.nodes || [];
      setExplanation(
        `Circular chain detected with ${nodes.length} hops. Total value of ${
          formatCurrency(trip.total_amount ?? trip.totalAmount ?? 0)
        } circulated back to origin in ${trip.duration || 'unknown duration'}.`
      );
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleTabSelect = (idx: number, trip: RoundTrip) => {
    setActiveTab(idx);
    fetchExplanation(idx, trip);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const currentTrip = roundTrips[activeTab];
  const currentFlow = currentTrip ? (currentTrip.accounts || currentTrip.nodes || []) : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10 animate-fade-in select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-6">
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

        {/* Case Scope Switcher */}
        <div className="flex items-center gap-2 bg-white border border-[#E4E4E7] rounded-lg p-1.5 shrink-0 shadow-xs self-start">
          <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono px-2">Scope</span>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="bg-transparent border-0 hover:border-0 rounded text-xs font-semibold focus:ring-0 cursor-pointer font-sans text-zinc-950 p-1 pr-6"
          >
            <option value="all">Whole Network (all)</option>
            {latestStatementId && (
              <option value={latestStatementId}>Current Statement ({latestStatementId.slice(0, 8)}...)</option>
            )}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 border border-[#E4E4E7] bg-white rounded-xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
          <p className="text-xs text-[#71717A] font-light">Scanning ledger graphs for cycles...</p>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50/50 rounded-xl p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-950">Forensics Retrieval Error</h3>
            <p className="text-xs text-red-700 font-light max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={fetchTrips}
            className="px-4 py-1.5 bg-red-900 text-white text-xs font-semibold rounded-lg hover:bg-red-950 transition-colors"
          >
            Retry Diagnostics Scan
          </button>
        </div>
      ) : roundTrips.length === 0 ? (
        <div className="border border-dashed border-[#E4E4E7] bg-white rounded-xl p-12 text-center space-y-3">
          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-[#18181B]">No Cycles Identified</h3>
            <p className="text-xs text-[#71717A] font-light max-w-sm mx-auto mt-1 leading-relaxed">
              Forensic scanning complete. No closed loop transfer paths found matching asset-inflation patterns within this case scope.
            </p>
          </div>
        </div>
      ) : (
        /* Primary Grid Workspace */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Loop Selectors */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block font-mono">
              Cycle Directory
            </span>

            <div className="space-y-2.5 max-h-[30rem] overflow-y-auto pr-1">
              {roundTrips.map((trip, idx) => {
                const isSelected = activeTab === idx;
                const tripId = trip.id !== undefined ? `Round Trip #${trip.id}` : `Round Trip #${idx + 1}`;
                const amountVal = trip.total_amount ?? trip.totalAmount ?? trip.min_amount ?? 0;
                const flowList = trip.accounts || trip.nodes || [];

                return (
                  <button
                    key={idx}
                    onClick={() => handleTabSelect(idx, trip)}
                    className={`w-full text-left p-4 rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-white border-[#18181B] shadow-[0_4px_12px_rgba(0,0,0,0.03)] ring-1 ring-zinc-950' 
                        : 'bg-[#FAF9F6] border-[#E4E4E7] hover:border-[#18181B]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                       <span className="font-bold text-[#18181B] font-sans">{tripId}</span>
                       <span className="text-[10px] text-[#71717A] font-medium bg-white px-2 py-0.5 rounded border border-[#E4E4E7] font-mono">
                         {trip.duration || `${trip.hops || flowList.length} hops`}
                       </span>
                    </div>
                    
                    <div className="mt-2.5">
                      <p className="font-semibold text-slate-700 text-[11px] font-sans">
                        Circular Volume Flow
                      </p>
                      <p className="text-lg font-bold text-[#18181B] mt-1 font-mono">{formatCurrency(amountVal)}</p>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-[9px] text-[#71717A] max-w-full truncate overflow-hidden bg-white p-1.5 rounded border border-[#E4E4E7] font-mono">
                      {flowList.map((node, nIdx) => (
                        <React.Fragment key={nIdx}>
                          <span className="truncate max-w-[65px] font-medium">{node}</span>
                          {nIdx < flowList.length - 1 && <span>→</span>}
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

              {/* Responsive SVG Flowchart */}
              <div className="h-64 border border-[#F4F4F5] bg-[#FAF9F6] rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240">
                  {(() => {
                    const N = currentFlow.length;
                    const cx = 200;
                    const cy = 120;
                    const rx = 120;
                    const ry = 65;

                    // Generate points for the nodes
                    const points = currentFlow.map((_, i) => {
                      const angle = (2 * Math.PI * i) / N - Math.PI / 2;
                      return {
                        x: cx + rx * Math.cos(angle),
                        y: cy + ry * Math.sin(angle),
                      };
                    });

                    // Build path description for the loop
                    let pathD = '';
                    if (points.length > 0) {
                      pathD = `M ${points[0].x} ${points[0].y}`;
                      for (let i = 1; i < points.length; i++) {
                        pathD += ` L ${points[i].x} ${points[i].y}`;
                      }
                      pathD += ' Z';
                    }

                    return (
                      <>
                        {/* Background track */}
                        {pathD && (
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="#E4E4E7" 
                            strokeWidth="2" 
                            strokeDasharray="4 4"
                          />
                        )}

                        {/* Animated active flow dash */}
                        {pathD && (
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="#18181B" 
                            strokeWidth="2.5" 
                            strokeDasharray="8 8"
                            className="animate-[pulse_1.5s_infinite]"
                          />
                        )}

                        {/* Draw nodes */}
                        {points.map((pt, i) => {
                          const label = currentFlow[i];
                          const isOrigin = i === N - 1 || i === 0;
                          return (
                            <g key={i} transform={`translate(${pt.x}, ${pt.y})`}>
                              <rect 
                                x="-45" 
                                y="-12" 
                                width="90" 
                                height="24" 
                                rx="4" 
                                fill={isOrigin ? "#18181B" : "#FFFFFF"} 
                                stroke={isOrigin ? "#18181B" : "#E4E4E7"} 
                                strokeWidth="1" 
                                className="shadow-xs"
                              />
                              <text 
                                y="3" 
                                textAnchor="middle" 
                                fill={isOrigin ? "#FFFFFF" : "#18181B"} 
                                fontSize="8" 
                                fontWeight={isOrigin ? "bold" : "semibold"}
                                className="font-sans"
                              >
                                {label.length > 15 ? `${label.slice(0, 12)}...` : label}
                              </text>
                            </g>
                          );
                        })}

                        {/* Middle status indicator text */}
                        <text x="200" y="115" textAnchor="middle" fill="#71717A" fontSize="7" fontWeight="bold" className="font-mono tracking-wider">
                          CLOSED CONVERSION
                        </text>
                        <text x="200" y="130" textAnchor="middle" fill="#18181B" fontSize="12" fontWeight="extrabold" className="font-mono">
                          {formatCurrency(currentTrip.total_amount ?? currentTrip.totalAmount ?? currentTrip.min_amount ?? 0)}
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Diagnosis Info */}
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 space-y-3.5">
              <div>
                <span className="text-[10px] text-[#E11D48] bg-[#FFF1F2] border border-[#FFE4E6] px-2 py-0.5 rounded font-semibold uppercase tracking-wider font-mono">
                  Reason Flagged
                </span>
                <h3 className="text-xs font-bold text-[#18181B] mt-2 font-sans">Analytical Ledger Disclosures</h3>
              </div>
              
              {isLoadingExplanation ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#71717A]" />
                  <span className="text-xs text-[#71717A] font-light">Retrieving explanation context...</span>
                </div>
              ) : (
                <p className="text-xs text-[#52525B] leading-relaxed font-light font-sans">
                  {explanation || "Apex Venture Corp routed this circular stream back into origin account to artificially inflate capital counts, bypassing local AML taxes."}
                </p>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
