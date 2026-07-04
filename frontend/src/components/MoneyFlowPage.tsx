import React, { useState, useEffect, useCallback } from 'react';
import { GitFork, Loader2, AlertTriangle, HelpCircle, Copy, Calendar, ArrowRight, ArrowLeft, ChevronDown, Check, RefreshCw, X, Zap, MapPin } from 'lucide-react';
import { useFinintelData } from '../context/FinintelDataContext';
import { getMoneyFlow, getRoundTrips, getTopRisks, getTimeline } from '../services/finintelApi';
import { RiskBadges, Tag } from './RiskBadge';
import { AmountRangeFilter, AmountRange, EMPTY_RANGE, inAmountRange } from './AmountRangeFilter';
import { RoundTrip } from '../types/api';

interface NetworkNode {
  id: string;
  label: string;
  role: 'sender' | 'receiver' | 'accumulator';
  totalIn: number;
  totalOut: number;
  amountStr: string;
  desc: string;
  notes: string;
  holderName?: string | null;
  bank?: string | null;
  ifsc?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  x: number;
  y: number;
}

interface NetworkConnection {
  from: string;
  to: string;
  amount: number;
  amountStr: string;
  txn_count: number;
  first_date: string | null;
  last_date: string | null;
}

export default function MoneyFlowPage() {
  const { caseId, setCaseId, latestStatementId } = useFinintelData();

  const [nodes, setNodes] = useState<Record<string, NetworkNode>>({});
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [totalNodesCount, setTotalNodesCount] = useState(0);

  // View mode state (filtering vs full network)
  const [showAllNodes, setShowAllNodes] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  // Round-trip overlay: cycles detected on the same graph, selectable to
  // highlight the circular path within the money-flow visualization.
  const [roundTrips, setRoundTrips] = useState<RoundTrip[]>([]);
  const [selectedTripIdx, setSelectedTripIdx] = useState<number | null>(null);
  const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);

  // Per-account risk flags (tags + level + pass-through velocity), correlated
  // onto graph nodes so the detail panel can show plain-language flags + gauge.
  const [riskByNode, setRiskByNode] = useState<Record<string, {
    risk_level: string;
    tags: Tag[];
    passthrough?: { avg_latency_min: number | null; fast_ratio: number } | null;
  }>>({});

  // Chronological transaction ledger for the selected node (lazy per-node).
  const [nodeTimeline, setNodeTimeline] = useState<any[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Amount-range filter on edge transfer amounts (also a declutter lever).
  const [amountRange, setAmountRange] = useState<AmountRange>(EMPTY_RANGE);

  const fetchFlow = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMoneyFlow(caseId);
      const rawNodes = response.nodes || [];
      const rawEdges = response.edges || [];

      if (rawNodes.length === 0) {
        setNodes({});
        setConnections([]);
        setTotalNodesCount(0);
        setHiddenCount(0);
        return;
      }

      // Compute total in/out for role classification
      const computedNodes = rawNodes.map(node => {
        const id = node.id;
        const totalIn = node.total_in ?? rawEdges
          .filter(e => e.target === id)
          .reduce((sum, e) => sum + (e.total_amount ?? 0), 0);
        
        const totalOut = node.total_out ?? rawEdges
          .filter(e => e.source === id)
          .reduce((sum, e) => sum + (e.total_amount ?? 0), 0);

        let role: 'sender' | 'receiver' | 'accumulator' = 'receiver';
        if (node.is_accumulation) {
          role = 'accumulator';
        } else if (totalOut > totalIn) {
          role = 'sender';
        }

        const formattedAmt = totalIn > 0 
          ? `₹${totalIn.toLocaleString(undefined, {maximumFractionDigits:0})} Inflow`
          : `₹${totalOut.toLocaleString(undefined, {maximumFractionDigits:0})} Outflow`;

        return {
          id,
          label: node.label || id,
          role,
          totalIn,
          totalOut,
          amountStr: formattedAmt,
          desc: `Ledger account node acting as a ${role} conduit. Extracted in-flow volume is ₹${totalIn.toLocaleString()} and out-flow is ₹${totalOut.toLocaleString()}.`,
          notes: node.is_accumulation ? 'Identified accumulation sink point.' : `Active ${role} transit router.`,
          holderName: node.holder_name ?? null,
          bank: node.bank ?? null,
          ifsc: node.ifsc ?? null,
          firstSeen: node.first_seen ?? null,
          lastSeen: node.last_seen ?? null,
        };
      });

      setTotalNodesCount(computedNodes.length);

      // Filter to top 15 nodes by size if showAllNodes is false
      const maxNodes = 15;
      let finalNodes = computedNodes;
      let finalEdges = rawEdges;
      let hiddenNodesCount = 0;

      // Sort by volume so concentric circles place key hubs in the center
      const sortedNodes = [...computedNodes].sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));

      if (!showAllNodes && computedNodes.length > maxNodes) {
        const keepIds = new Set(sortedNodes.slice(0, maxNodes).map(n => n.id));
        finalNodes = computedNodes.filter(n => keepIds.has(n.id));
        finalEdges = rawEdges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
        hiddenNodesCount = computedNodes.length - maxNodes;
      }
      setHiddenCount(hiddenNodesCount);

      // Sort final nodes to keep main hubs centered in concentric shells
      const sortedFinalNodes = [...finalNodes].sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));

      // Compute dynamic concentric ellipse positions for final nodes to prevent overlapping
      const N = sortedFinalNodes.length;
      const cx = 450;
      const cy = 200;
      const nodesMap: Record<string, NetworkNode> = {};

      if (N <= 15) {
        // Standard single ellipse for clean/filtered layouts
        const rx = 310;
        const ry = 120;
        sortedFinalNodes.forEach((node, i) => {
          const angle = (2 * Math.PI * i) / N - Math.PI / 2;
          const x = cx + rx * Math.cos(angle);
          const y = cy + ry * Math.sin(angle);
          nodesMap[node.id] = { ...node, x, y };
        });
      } else {
        // Concentric shell layout for dense full network view (N > 15)
        const innerCount = Math.min(8, Math.floor(N * 0.15) + 3);
        const middleCount = Math.min(16, Math.floor(N * 0.35) + 5);
        const outerCount = N - innerCount - middleCount;

        const innerRx = 110;
        const innerRy = 55;
        
        const middleRx = 240;
        const middleRy = 105;
        
        const outerRx = 355;
        const outerRy = 145;

        sortedFinalNodes.forEach((node, i) => {
          let layerRx = outerRx;
          let layerRy = outerRy;
          let layerIdx = i;
          let layerTotal = outerCount;
          let angleOffset = 0;

          if (i < innerCount) {
            layerRx = innerRx;
            layerRy = innerRy;
            layerIdx = i;
            layerTotal = innerCount;
            angleOffset = Math.PI / 6; // offset to stagger layers visually
          } else if (i < innerCount + middleCount) {
            layerRx = middleRx;
            layerRy = middleRy;
            layerIdx = i - innerCount;
            layerTotal = middleCount;
            angleOffset = -Math.PI / 6;
          } else {
            layerRx = outerRx;
            layerRy = outerRy;
            layerIdx = i - innerCount - middleCount;
            layerTotal = outerCount;
            angleOffset = 0;
          }

          const angle = (2 * Math.PI * layerIdx) / layerTotal - Math.PI / 2 + angleOffset;
          const x = cx + layerRx * Math.cos(angle);
          const y = cy + layerRy * Math.sin(angle);
          nodesMap[node.id] = { ...node, x, y };
        });
      }

      setNodes(nodesMap);

      // Build connections with complete metadata
      const conns: NetworkConnection[] = finalEdges.map(edge => {
        return {
          from: edge.source,
          to: edge.target,
          amount: edge.total_amount ?? 0,
          amountStr: `₹${(edge.total_amount ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}`,
          txn_count: edge.txn_count ?? 1,
          first_date: edge.first_date || null,
          last_date: edge.last_date || null
        };
      });
      setConnections(conns);

      // Pick default active node
      if (sortedFinalNodes.length > 0) {
        setActiveNodeId(sortedFinalNodes[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load money flow graph from gateway.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId, showAllNodes]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  // Round trips follow the same scope; reset any active cycle on scope change.
  useEffect(() => {
    let cancelled = false;
    setSelectedTripIdx(null);
    (async () => {
      try {
        const resp = await getRoundTrips(caseId);
        if (!cancelled) setRoundTrips(resp.round_trips || []);
      } catch {
        if (!cancelled) setRoundTrips([]);
      }
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  // Risk flags per account, for the node-detail badges.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await getTopRisks(caseId, 100);
        const map: Record<string, { risk_level: string; tags: Tag[]; passthrough?: any }> = {};
        for (const r of resp?.top_risks || []) {
          const id = r.node ?? r.account;
          if (id != null) map[id] = { risk_level: r.risk_level, tags: r.tags || [], passthrough: r.passthrough };
        }
        if (!cancelled) setRiskByNode(map);
      } catch {
        if (!cancelled) setRiskByNode({});
      }
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  const selectedTrip = selectedTripIdx != null ? roundTrips[selectedTripIdx] : null;
  const tripNodeList: string[] = selectedTrip ? (selectedTrip.nodes || selectedTrip.accounts || []) : [];
  const tripNodeSet = new Set(tripNodeList);
  // directed cycle edges: node[i] -> node[(i+1)%N]
  const tripEdgeKeys = new Set<string>();
  if (tripNodeList.length > 1) {
    for (let i = 0; i < tripNodeList.length; i++) {
      tripEdgeKeys.add(`${tripNodeList[i]}->${tripNodeList[(i + 1) % tripNodeList.length]}`);
    }
  }
  const tripActive = selectedTrip != null;

  const selectRoundTrip = (idx: number | null) => {
    setSelectedTripIdx(idx);
    setIsTripDropdownOpen(false);
    // Full network guarantees every cycle node is positioned/visible.
    if (idx != null && !showAllNodes && totalNodesCount > 15) {
      setShowAllNodes(true);
    }
  };

  // Fetch the chronological ledger for whichever node is selected.
  useEffect(() => {
    if (!activeNodeId) { setNodeTimeline([]); return; }
    let cancelled = false;
    setIsLoadingTimeline(true);
    (async () => {
      try {
        const resp = await getTimeline(caseId, activeNodeId);
        if (!cancelled) setNodeTimeline(resp?.timeline || []);
      } catch {
        if (!cancelled) setNodeTimeline([]);
      } finally {
        if (!cancelled) setIsLoadingTimeline(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeNodeId, caseId]);

  const currentNode = nodes[activeNodeId] || Object.values(nodes)[0] || null;

  // Connected nodes highlighting logic
  const connectedNodeIds = new Set<string>();
  if (activeNodeId) {
    connectedNodeIds.add(activeNodeId);
    connections.forEach(conn => {
      if (conn.from === activeNodeId) connectedNodeIds.add(conn.to);
      if (conn.to === activeNodeId) connectedNodeIds.add(conn.from);
    });
  }

  // Get associated connections list for details panel
  const associatedConnections = connections.filter(
    conn => conn.from === activeNodeId || conn.to === activeNodeId
  );

  // Amount-range filter: an edge stays visible if it's in range (or is part of
  // the highlighted round-trip cycle). Nodes with no visible edge hide.
  const amountFilterActive = amountRange.min != null || amountRange.max != null;
  const isConnVisible = (conn: NetworkConnection) =>
    inAmountRange(conn.amount, amountRange) ||
    (tripActive && tripEdgeKeys.has(`${conn.from}->${conn.to}`));
  const visibleNodeIds = new Set<string>();
  connections.forEach((c) => {
    if (isConnVisible(c)) { visibleNodeIds.add(c.from); visibleNodeIds.add(c.to); }
  });
  if (activeNodeId) visibleNodeIds.add(activeNodeId);
  tripNodeSet.forEach((n) => visibleNodeIds.add(n));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // "01 Apr → 12 Apr (11d)" activity window for an account.
  const activeWindow = (first?: string | null, last?: string | null) => {
    if (!first && !last) return '—';
    const f = first || last!;
    const l = last || first!;
    const fmt = (d: string) => {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };
    const days = Math.max(0, Math.round((new Date(l).getTime() - new Date(f).getTime()) / 86400000));
    return `${fmt(f)} → ${fmt(l)} (${days}d)`;
  };

  const N = Object.keys(nodes).length;
  // Node layout constants that scale down for large sets
  const nodeRadius = N > 15 ? 18 : 28;
  const iconScale = N > 15 ? 0.55 : 0.8;
  const selectorRadius = nodeRadius + 8;
  const labelOffset = nodeRadius + 13;
  const labelRoleOffset = nodeRadius + 21;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in select-none">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#DC2626] font-semibold bg-[#FEF2F2] border border-[#FCA5A5] px-2.5 py-0.5 rounded-full font-mono">
            <GitFork className="w-3.5 h-3.5" />
            <span>Intel Ledger Mapping</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Money Flow Network</h1>
          <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
            Visual ledger network mapping outflows, transit shells, and final integration accumulation nodes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start">
        {/* Amount range filter (also declutters dense graphs) */}
        <AmountRangeFilter value={amountRange} onChange={setAmountRange} />

        {/* Custom Case Scope Dropdown */}
        <div className={`relative shrink-0 ${isScopeDropdownOpen ? 'z-50' : 'z-30'}`}>
          {isScopeDropdownOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setIsScopeDropdownOpen(false)} />
          )}
          <button
            type="button"
            onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
            className="flex items-center justify-between gap-2.5 bg-white border border-[#E4E4E7] hover:border-zinc-400 rounded-lg p-2 px-3 text-xs font-semibold text-zinc-950 shadow-xs cursor-pointer min-w-[170px] relative transition-all"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono pr-2 border-r border-[#E4E4E7]">Scope</span>
              <span className="truncate max-w-[130px] font-medium text-zinc-900">
                {caseId === 'all' 
                  ? 'Whole Network (all)' 
                  : `Current Statement (${caseId.slice(0, 8)}...)`}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#71717A] ml-1" />
          </button>
          
          {isScopeDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white border border-[#E4E4E7] rounded-xl shadow-lg z-50 py-1.5 max-h-60 overflow-y-auto animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setCaseId('all');
                  setIsScopeDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between hover:bg-[#FAF9F6] ${
                  caseId === 'all' ? 'bg-zinc-50 font-bold text-[#18181B]' : 'text-zinc-700 font-light'
                }`}
              >
                <span>Whole Network (all)</span>
                {caseId === 'all' && <Check className="w-3.5 h-3.5 text-zinc-800" />}
              </button>
              
              {latestStatementId && (
                <button
                  type="button"
                  onClick={() => {
                    setCaseId(latestStatementId);
                    setIsScopeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between hover:bg-[#FAF9F6] ${
                    caseId === latestStatementId ? 'bg-zinc-50 font-bold text-[#18181B]' : 'text-zinc-700 font-light'
                  }`}
                >
                  <span>Current Statement ({latestStatementId.slice(0, 8)}...)</span>
                  {caseId === latestStatementId && <Check className="w-3.5 h-3.5 text-zinc-800" />}
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[36rem] border border-[#E4E4E7] bg-white rounded-xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
          <p className="text-xs text-[#71717A] font-light">Synthesizing network topology...</p>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50/50 rounded-xl p-12 text-center space-y-4 h-[36rem] flex flex-col items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-950">Graph Visualization Error</h3>
            <p className="text-xs text-red-700 font-light max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={fetchFlow}
            className="px-4 py-1.8 bg-red-950 text-white text-xs font-semibold rounded-lg hover:bg-red-900 transition-colors"
          >
            Reload Graph Data
          </button>
        </div>
      ) : Object.keys(nodes).length === 0 ? (
        <div className="border border-dashed border-[#E4E4E7] bg-white rounded-xl p-12 text-center h-[36rem] flex flex-col items-center justify-center space-y-3">
          <HelpCircle className="w-10 h-10 text-zinc-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-[#18181B]">No Flow Data</h3>
            <p className="text-xs text-[#71717A] font-light max-w-sm mx-auto mt-1 leading-relaxed">
              No transactions or entities found matching this scope to map out a money flow graph. Try uploading a statement first.
            </p>
          </div>
        </div>
      ) : (
        /* Primary Grid Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Stable SVG Canvas Board */}
          <div className="lg:col-span-8 flex flex-col space-y-3">
            
            {/* Canvas Header View Controls */}
            <div className="flex items-center justify-between bg-white border border-[#E4E4E7] rounded-xl px-4 py-2.5 shadow-xs">
              <span className="text-[10px] text-[#71717A] font-light font-sans">
                Select a node to inspect its associated flows and highlight connections.
              </span>
              
              <div className="flex items-center gap-2">
                {/* Round-trip highlight selector — cycles integrated into the graph */}
                {roundTrips.length > 0 && (
                  <div className={`relative ${isTripDropdownOpen ? 'z-50' : 'z-30'}`}>
                    {isTripDropdownOpen && (
                      <div className="fixed inset-0 z-40" onClick={() => setIsTripDropdownOpen(false)} />
                    )}
                    <button
                      type="button"
                      onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                      className={`flex items-center justify-between gap-1.5 border rounded p-1 px-2.5 text-[10px] font-semibold cursor-pointer min-w-[150px] relative transition-all ${
                        tripActive ? 'bg-red-50 border-red-300 text-red-800' : 'bg-[#FAF9F6] border-[#E4E4E7] hover:border-zinc-400 text-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <RefreshCw className={`w-2.5 h-2.5 ${tripActive ? 'text-red-600' : 'text-[#71717A]'}`} />
                        <span className="text-[9px] uppercase font-bold font-mono pr-1.5 border-r border-[#E4E4E7]">Round Trip</span>
                        <span className="truncate max-w-[90px] font-medium">
                          {tripActive ? `#${selectedTrip?.id ?? (selectedTripIdx! + 1)}` : `${roundTrips.length} detected`}
                        </span>
                      </div>
                      <ChevronDown className="w-2.5 h-2.5 text-[#71717A] ml-0.5" />
                    </button>

                    {isTripDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-[#E4E4E7] rounded-lg shadow-md z-50 py-1 max-h-56 overflow-y-auto animate-fade-in">
                        <button
                          type="button"
                          onClick={() => selectRoundTrip(null)}
                          className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors flex items-center justify-between hover:bg-[#FAF9F6] ${
                            !tripActive ? 'bg-zinc-50 font-bold text-[#18181B]' : 'text-zinc-700 font-light'
                          }`}
                        >
                          <span>None (Money Flow)</span>
                          {!tripActive && <Check className="w-3 h-3 text-zinc-800" />}
                        </button>
                        {roundTrips.map((trip, idx) => {
                          const list = trip.nodes || trip.accounts || [];
                          const amt = trip.total_amount ?? trip.min_amount ?? 0;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectRoundTrip(idx)}
                              className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors flex items-center justify-between gap-2 hover:bg-[#FAF9F6] ${
                                selectedTripIdx === idx ? 'bg-red-50 font-bold text-red-800' : 'text-zinc-700 font-light'
                              }`}
                            >
                              <span className="truncate">Round Trip #{trip.id ?? idx + 1} · {list.length} hops</span>
                              <span className="font-mono font-semibold text-[#C2410C] shrink-0">{formatCurrency(amt)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className={`relative ${isViewDropdownOpen ? 'z-50' : 'z-30'}`}>
                  {isViewDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsViewDropdownOpen(false)} />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                    className="flex items-center justify-between gap-1.5 bg-[#FAF9F6] border border-[#E4E4E7] hover:border-zinc-400 rounded p-1 px-2.5 text-[10px] font-semibold text-zinc-950 cursor-pointer min-w-[150px] relative transition-all"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] uppercase font-bold text-[#71717A] font-mono pr-1.5 border-r border-[#E4E4E7]">View</span>
                      <span className="truncate max-w-[100px] font-medium text-zinc-900">
                        {showAllNodes ? `Full Network (${totalNodesCount} nodes)` : 'Top 15 Nodes (Clean)'}
                      </span>
                    </div>
                    <ChevronDown className="w-2.5 h-2.5 text-[#71717A] ml-0.5" />
                  </button>

                  {isViewDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-52 bg-white border border-[#E4E4E7] rounded-lg shadow-md z-50 py-1 max-h-48 overflow-y-auto animate-fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAllNodes(false);
                          setIsViewDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors flex items-center justify-between hover:bg-[#FAF9F6] ${
                          !showAllNodes ? 'bg-zinc-50 font-bold text-[#18181B]' : 'text-zinc-700 font-light'
                        }`}
                      >
                        <span>Top 15 Nodes (Clean)</span>
                        {!showAllNodes && <Check className="w-3 h-3 text-zinc-800" />}
                      </button>

                      {(totalNodesCount > 15 || showAllNodes) && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllNodes(true);
                            setIsViewDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors flex items-center justify-between hover:bg-[#FAF9F6] ${
                            showAllNodes ? 'bg-zinc-50 font-bold text-[#18181B]' : 'text-zinc-700 font-light'
                          }`}
                        >
                          <span>Full Network ({totalNodesCount} nodes)</span>
                          {showAllNodes && <Check className="w-3 h-3 text-zinc-800" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stable Canvas Board Wrapper */}
            <div className="w-full h-[36rem] bg-[#FAF9F6] rounded-xl border border-[#E4E4E7] relative overflow-hidden select-none">
              {/* Overlay warning for hidden nodes */}
              {!showAllNodes && hiddenCount > 0 && !tripActive && (
                <div className="absolute top-4 right-4 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 text-[10px] text-amber-800 font-mono shadow-sm z-30">
                  Showing top 15 nodes. {hiddenCount} smaller nodes hidden from view.
                </div>
              )}

              {/* Round-trip highlight banner */}
              {tripActive && selectedTrip && (
                <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-300 rounded-lg px-3 py-1.5 text-[10px] text-red-800 font-mono shadow-sm z-30 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 text-red-600 shrink-0" />
                  <span className="truncate flex-1">
                    Round Trip #{selectedTrip.id ?? (selectedTripIdx! + 1)} · {tripNodeList.length} hops · {formatCurrency(selectedTrip.total_amount ?? selectedTrip.min_amount ?? 0)} circulated back to origin
                  </span>
                  <button
                    onClick={() => selectRoundTrip(null)}
                    className="hover:text-red-950 shrink-0 cursor-pointer"
                    title="Clear round-trip highlight"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Stable SVG Canvas Board */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 400" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Connection line arrowheads (normal scale) */}
                  <marker
                    id="arrow-flow"
                    viewBox="0 0 10 10"
                    refX="33"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D4D4D8" />
                  </marker>
                  <marker
                    id="arrow-flow-active"
                    viewBox="0 0 10 10"
                    refX="33"
                    refY="5"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#DC2626" />
                  </marker>

                  {/* Connection line arrowheads (small scale for concentric flow layers) */}
                  <marker
                    id="arrow-flow-small"
                    viewBox="0 0 10 10"
                    refX="23"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D4D4D8" />
                  </marker>
                  <marker
                    id="arrow-flow-small-active"
                    viewBox="0 0 10 10"
                    refX="23"
                    refY="5"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#DC2626" />
                  </marker>

                  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF8A8A" />
                    <stop offset="100%" stopColor="#DC2626" />
                  </radialGradient>
                </defs>

                <g>
                  {/* Dynamic path animations */}
                  <style>{`
                    @keyframes flowingPath {
                      from { stroke-dashoffset: 24; }
                      to { stroke-dashoffset: 0; }
                    }
                    .flow-line {
                      stroke-dasharray: 6, 8;
                      animation: flowingPath 1.5s linear infinite;
                    }
                  `}</style>

                  {/* Draw connections */}
                  {connections.map((conn, idx) => {
                    const startPos = nodes[conn.from];
                    const endPos = nodes[conn.to];
                    if (!startPos || !endPos) return null;
                    // Amount-range filter (cycle edges always stay when highlighting).
                    if (amountFilterActive && !isConnVisible(conn)) return null;

                    // When a round trip is selected, highlight ONLY its cycle
                    // edges; otherwise fall back to the selected-node highlight.
                    const isEdgeOnCycle = tripActive && tripEdgeKeys.has(`${conn.from}->${conn.to}`);
                    const isEdgeActive = tripActive
                      ? isEdgeOnCycle
                      : (activeNodeId === conn.from || activeNodeId === conn.to);
                    const isEdgeDimmed = tripActive
                      ? !isEdgeOnCycle
                      : (activeNodeId && !isEdgeActive);

                    // Curved (quadratic) edge: bows each edge out along the
                    // perpendicular so crossing edges separate and A->B / B->A
                    // don't overlap — the key de-cluttering change for dense graphs.
                    const dx = endPos.x - startPos.x;
                    const dy = endPos.y - startPos.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const nx = -dy / dist;
                    const ny = dx / dist;
                    const curve = Math.min(55, dist * 0.16);
                    const mx = (startPos.x + endPos.x) / 2;
                    const my = (startPos.y + endPos.y) / 2;
                    const ctrlX = mx + nx * curve;
                    const ctrlY = my + ny * curve;
                    const pathD = `M ${startPos.x} ${startPos.y} Q ${ctrlX} ${ctrlY} ${endPos.x} ${endPos.y}`;

                    // Label sits at the curve's midpoint (t=0.5 on the bezier),
                    // which naturally spreads labels for a busy hub.
                    const midX = 0.25 * startPos.x + 0.5 * ctrlX + 0.25 * endPos.x;
                    const midY = 0.25 * startPos.y + 0.5 * ctrlY + 0.25 * endPos.y;

                    const markerId = N > 15
                      ? (isEdgeActive ? 'url(#arrow-flow-small-active)' : 'url(#arrow-flow-small)')
                      : (isEdgeActive ? 'url(#arrow-flow-active)' : 'url(#arrow-flow)');

                    return (
                      <g
                        key={idx}
                        className="transition-all duration-300"
                        style={{ opacity: isEdgeDimmed ? 0.09 : 1 }}
                      >
                        {/* Background connection track */}
                        <path 
                          d={pathD} 
                          fill="none" 
                          stroke={isEdgeActive ? '#EF4444' : '#E4E4E7'} 
                          strokeWidth={isEdgeActive ? '2.2' : '1.2'} 
                          markerEnd={markerId}
                          strokeLinecap="round"
                        />
                        
                        {/* Animated dash flow */}
                        {isEdgeActive && (
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="#DC2626" 
                            strokeWidth="2.2" 
                            strokeDasharray="6 6"
                            className="flow-line"
                          />
                        )}

                        {/* Glowing energy pulse dot */}
                        {isEdgeActive && (
                          <circle r="3.5" fill="url(#glow)">
                            <animateMotion dur="2.2s" repeatCount="indefinite" path={pathD} />
                          </circle>
                        )}

                        {/* Edge amount label — only for the selected node's edges,
                            so the canvas isn't blanketed with overlapping pills. */}
                        {isEdgeActive && (
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect 
                              x="-30" 
                              y="-6.5" 
                              width="60" 
                              height="13" 
                              rx="2.5" 
                              fill="#FFFFFF" 
                              stroke={isEdgeActive ? '#DC2626' : '#E4E4E7'} 
                              strokeWidth="0.8"
                              className="shadow-xs"
                            />
                            <text 
                              y="2.5" 
                              textAnchor="middle" 
                              fill={isEdgeActive ? '#991B1B' : '#71717A'} 
                              fontSize={N > 15 ? 6.5 : 7.5} 
                              fontWeight="bold"
                              className="font-mono"
                            >
                              {conn.amountStr}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Draw Nodes */}
                  {Object.values(nodes).map((node) => {
                    // Hide nodes whose every edge was filtered out by the ₹ range.
                    if (amountFilterActive && !visibleNodeIds.has(node.id)) return null;
                    const isSelected = activeNodeId === node.id;
                    const isNodeOnCycle = tripActive && tripNodeSet.has(node.id);
                    // In round-trip mode, dim everything not on the cycle.
                    const isNodeDimmed = tripActive
                      ? !isNodeOnCycle
                      : (activeNodeId && !connectedNodeIds.has(node.id));

                    const roleColor = 
                      node.role === 'sender' ? 'fill-[#EFF6FF] stroke-[#93C5FD]' : 
                      node.role === 'accumulator' ? 'fill-[#FEF2F2] stroke-[#FCA5A5]' : 
                      'fill-[#F0FDF4] stroke-[#86EFAC]';

                    const roleLabelColor = 
                      node.role === 'sender' ? 'fill-[#1D4ED8]' : 
                      node.role === 'accumulator' ? 'fill-[#DC2626]' : 
                      'fill-[#047857]';

                    // Save horizontal space by abbreviating labels even shorter in concentric mode
                    const labelText = N > 15
                      ? (node.label.length > 9 ? `${node.label.slice(0, 6)}...` : node.label)
                      : (node.label.length > 14 ? `${node.label.slice(0, 11)}...` : node.label);

                    return (
                      <g 
                        key={node.id} 
                        transform={`translate(${node.x}, ${node.y})`}
                        className="cursor-pointer select-none"
                        onClick={() => setActiveNodeId(node.id)}
                        style={{ opacity: isNodeDimmed ? 0.35 : 1, transition: 'opacity 0.3s' }}
                      >
                        {/* Spinning dashed selector circle when selected */}
                        {isSelected && (
                          <circle
                            r={selectorRadius}
                            fill="none"
                            stroke="#18181B"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                            className="animate-spin"
                            style={{ animationDuration: '8s' }}
                          />
                        )}

                        {/* Red ring marks a node on the selected round-trip cycle */}
                        {isNodeOnCycle && (
                          <circle
                            r={selectorRadius}
                            fill="none"
                            stroke="#DC2626"
                            strokeWidth="2.5"
                          />
                        )}

                        <circle
                          r={nodeRadius}
                          className={`${roleColor}`}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          stroke={isSelected || isNodeOnCycle ? (isNodeOnCycle ? '#DC2626' : '#18181B') : undefined}
                        />

                        {/* Node Icon backdrop */}
                        <circle r={nodeRadius * 0.5} fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />

                        {/* Embedded micro-SVGs based on node type */}
                        {(() => {
                          if (node.id.startsWith("STMT:")) {
                            return (
                              <g stroke="#4b5563" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" transform={`scale(${iconScale})`}>
                                <path d="M -6 -9 L 2 -9 L 8 -3 L 8 9 L -6 9 Z" />
                                <path d="M 2 -9 L 2 -3 L 8 -3" />
                                <line x1="-3" y1="1" x2="4" y2="1" />
                                <line x1="-3" y1="5" x2="4" y2="5" />
                              </g>
                            );
                          } else if (node.id === "CASH") {
                            return (
                              <g stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" transform={`scale(${iconScale})`}>
                                <rect x="-9" y="-6" width="18" height="12" rx="1.5" />
                                <circle cx="0" cy="0" r="2.5" />
                                <path d="M -6 0 L -4 0 M 4 0 L 6 0" />
                              </g>
                            );
                          } else {
                            return (
                              <g stroke="#2563eb" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" transform={`scale(${iconScale})`}>
                                <rect x="-9" y="-6" width="18" height="12" rx="1.5" />
                                <line x1="-9" y1="-2" x2="9" y2="-2" />
                                <line x1="-5" y1="2" x2="-2" y2="2" />
                                <line x1="2" y1="2" x2="5" y2="2" />
                              </g>
                            );
                          }
                        })()}

                        <text 
                          y={labelOffset} 
                          textAnchor="middle" 
                          className="fill-[#18181B] font-bold text-[8.5px] font-sans"
                          style={{ fontSize: N > 15 ? '7px' : '9px' }}
                        >
                          {labelText}
                        </text>
                        <text 
                          y={labelRoleOffset} 
                          textAnchor="middle" 
                          className={`${roleLabelColor} font-semibold text-[6.5px] uppercase tracking-wider font-mono`}
                          style={{ fontSize: N > 15 ? '5.5px' : '7px' }}
                        >
                          {node.role}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* Right Column: Dynamic Flow Details Sidebar */}
          <div className="lg:col-span-4 bg-white border border-[#E4E4E7] rounded-xl p-5 flex flex-col space-y-4 h-[39.5rem] overflow-y-auto shadow-xs">
            
            {currentNode ? (
              <>
                {/* Node details header */}
                <div className="border-b border-[#F4F4F5] pb-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded font-mono ${
                      currentNode.role === 'sender' ? 'bg-blue-50 text-blue-800' :
                      currentNode.role === 'accumulator' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                    }`}>
                      {currentNode.role} Point
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentNode.id);
                        setCopiedId(currentNode.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold cursor-pointer hover:underline ${
                        copiedId === currentNode.id ? 'text-green-600 hover:text-green-700' : 'text-[#2563EB] hover:text-blue-700'
                      }`}
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === currentNode.id ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-[#18181B] truncate" title={currentNode.id}>
                      {currentNode.label}
                    </h3>
                    <p className="text-[10px] text-[#71717A] mt-1 font-mono break-all font-light">
                      {currentNode.id}
                    </p>
                  </div>

                  {/* Malicious-activity flags for this account */}
                  {(() => {
                    const risk = riskByNode[currentNode.id];
                    if (!risk || (risk.tags?.length ?? 0) === 0) return null;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded border ${
                          risk.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' :
                          risk.risk_level === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                          risk.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {risk.risk_level} Risk
                        </span>
                        <RiskBadges tags={risk.tags} size="xs" />
                      </div>
                    );
                  })()}

                  {/* Fund velocity gauge (rapid pass-through) — reuses the app's progress-bar look */}
                  {(() => {
                    const pt = riskByNode[currentNode.id]?.passthrough;
                    if (!pt) return null;
                    const ratio = Math.max(0, Math.min(1, pt.fast_ratio ?? 0));
                    const label = pt.avg_latency_min != null
                      ? (pt.avg_latency_min < 60 ? `~${Math.round(pt.avg_latency_min)} min` : `~${(pt.avg_latency_min / 60).toFixed(1)} hr`)
                      : 'same-day';
                    return (
                      <div className="bg-white border border-[#E4E4E7] rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#18181B] flex items-center gap-1 font-mono uppercase tracking-wider">
                            <Zap className="w-2.5 h-2.5 text-[#DC2626]" /> Fund Velocity
                          </span>
                          <span className="text-[10px] text-red-700 font-mono font-bold">{label}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F4F4F5] overflow-hidden relative">
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#16A34A,#D97706,#DC2626)', opacity: 0.25 }} />
                          <div className="absolute left-0 top-0 bottom-0 rounded-full bg-[#DC2626]" style={{ width: `${Math.round(ratio * 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] text-[#A1A1AA] font-mono uppercase tracking-wider">
                          <span>Slow (safe)</span><span>Instant (suspicious)</span>
                        </div>
                      </div>
                    );
                  })()}

                  <p className="text-xs text-[#52525B] leading-relaxed font-sans font-light">
                    {currentNode.desc}
                  </p>

                  {/* Investigator identity + activity window */}
                  {(currentNode.holderName || currentNode.bank || currentNode.ifsc || currentNode.firstSeen || currentNode.lastSeen) && (
                    <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-2.5 grid grid-cols-1 gap-1 text-[10px] font-mono">
                      {currentNode.holderName && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#71717A] uppercase tracking-wider">Holder</span>
                          <span className="font-bold text-[#18181B] truncate max-w-[170px]" title={currentNode.holderName}>{currentNode.holderName}</span>
                        </div>
                      )}
                      {currentNode.bank && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#71717A] uppercase tracking-wider">Bank</span>
                          <span className="font-bold text-[#18181B] truncate max-w-[170px]" title={currentNode.bank}>{currentNode.bank}</span>
                        </div>
                      )}
                      {currentNode.ifsc && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#71717A] uppercase tracking-wider">IFSC</span>
                          <span className="font-bold text-[#18181B]">{currentNode.ifsc}</span>
                        </div>
                      )}
                      {(currentNode.firstSeen || currentNode.lastSeen) && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#71717A] uppercase tracking-wider">Active</span>
                          <span className="font-bold text-[#18181B]">{activeWindow(currentNode.firstSeen, currentNode.lastSeen)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* financial aggregate figures */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3 text-left">
                    <span className="text-[9px] text-[#15803D] uppercase font-bold tracking-wider font-mono block">Total Inflow</span>
                    <strong className="text-sm font-extrabold text-[#166534] font-mono mt-1 block">
                      {formatCurrency(currentNode.totalIn)}
                    </strong>
                  </div>
                  <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3 text-left">
                    <span className="text-[9px] text-[#1D4ED8] uppercase font-bold tracking-wider font-mono block">Total Outflow</span>
                    <strong className="text-sm font-extrabold text-[#1E40AF] font-mono mt-1 block">
                      {formatCurrency(currentNode.totalOut)}
                    </strong>
                  </div>
                </div>

                {/* Net Flow Balance Badge */}
                <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl p-3.5 flex items-center justify-between">
                  <span className="text-[10px] text-[#71717A] font-semibold uppercase tracking-wider font-mono">Net Flow Volume</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    (currentNode.totalIn - currentNode.totalOut) >= 0 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {(currentNode.totalIn - currentNode.totalOut) >= 0 ? '+' : ''}
                    {formatCurrency(currentNode.totalIn - currentNode.totalOut)}
                  </span>
                </div>

                {/* Flow Transaction directory list */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-1.5">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider font-mono">
                      Associated Transfers
                    </span>
                    <span className="text-[9px] text-[#71717A] font-mono">
                      {associatedConnections.length} connection{associatedConnections.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[17.5rem] overflow-y-auto pr-1">
                    {associatedConnections.map((conn, cIdx) => {
                      const isIncoming = conn.to === activeNodeId;
                      const otherNodeId = isIncoming ? conn.from : conn.to;
                      const otherNode = nodes[otherNodeId];
                      const otherLabel = otherNode ? otherNode.label : otherNodeId;

                      return (
                        <div 
                          key={cIdx}
                          onClick={() => {
                            if (otherNodeId) {
                              setActiveNodeId(otherNodeId);
                            }
                          }}
                          className="w-full text-left p-3 rounded-lg border border-[#E4E4E7] hover:border-[#18181B] bg-[#FAF9F6] hover:bg-white transition-all text-xs flex flex-col justify-between cursor-pointer space-y-2 select-none"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5">
                              {isIncoming ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">
                                  <ArrowLeft className="w-2.5 h-2.5" />
                                  <span>In</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                  <ArrowRight className="w-2.5 h-2.5" />
                                  <span>Out</span>
                                </span>
                              )}
                              <span className="font-bold text-[#18181B] truncate max-w-[130px]" title={otherNodeId}>
                                {otherLabel}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-[#18181B] font-mono">
                              {conn.amountStr}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-[#71717A] font-mono">
                            <span className="flex items-center gap-1">
                              <span>Txns:</span>
                              <span className="font-bold text-[#52525B]">{conn.txn_count}</span>
                            </span>
                            {conn.first_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                <span>{conn.first_date.slice(2)} to {conn.last_date?.slice(2) || 'N/A'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {associatedConnections.length === 0 && (
                      <p className="text-[11px] text-[#71717A] font-light text-center py-6">
                        No direct ledger connections mapped to this node.
                      </p>
                    )}
                  </div>
                </div>

                {/* Chronological transaction ledger (time-ordered) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-1.5">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider font-mono">
                      Transaction Ledger
                    </span>
                    <span className="text-[9px] text-[#71717A] font-mono">
                      {isLoadingTimeline ? 'loading…' : `${nodeTimeline.length} entries`}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[16rem] overflow-y-auto pr-1">
                    {nodeTimeline.length === 0 && !isLoadingTimeline ? (
                      <p className="text-[11px] text-[#71717A] font-light text-center py-4">
                        No per-transaction ledger available for this node.
                      </p>
                    ) : (
                      nodeTimeline.map((ev, i) => {
                        const isCredit = (ev.direction || '').toUpperCase() === 'CREDIT';
                        return (
                          <div key={i} className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-2 text-[10px] space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[#52525B] flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {ev.date || 'N/A'}{ev.time ? ` · ${ev.time}` : ''}
                              </span>
                              <span className={`font-mono font-bold ${isCredit ? 'text-emerald-700' : 'text-[#C2410C]'}`}>
                                {isCredit ? '+' : '−'}{formatCurrency(Math.abs(Number(ev.amount) || 0))}
                              </span>
                            </div>
                            {(ev.counterparty || ev.narration) && (
                              <p className="text-[#71717A] font-light font-sans truncate" title={ev.narration || ev.counterparty || ''}>
                                {ev.counterparty ? `${ev.counterparty} · ` : ''}{ev.narration || ''}
                              </p>
                            )}
                            {ev.location && (
                              <p className="text-[#DC2626] font-bold font-mono flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 shrink-0" /> {ev.location.city}, {ev.location.state}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-zinc-300" />
                <p className="text-xs text-[#71717A] font-light">Select a node in the graph workspace to analyze flow aggregates.</p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
