import React, { useState, useEffect, useCallback } from 'react';
import { GitFork, ShieldCheck, Focus, Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { useFinintelData } from '../context/FinintelDataContext';
import { getMoneyFlow } from '../services/finintelApi';

interface NetworkNode {
  id: string;
  label: string;
  role: 'sender' | 'receiver' | 'accumulator';
  totalIn: number;
  totalOut: number;
  amountStr: string;
  x: number;
  y: number;
  desc: string;
  notes: string;
}

interface NetworkConnection {
  from: string;
  to: string;
  amount: string;
  flowDirection: 'out' | 'in';
}

export default function MoneyFlowPage() {
  const { caseId, setCaseId, latestStatementId } = useFinintelData();

  const [nodes, setNodes] = useState<Record<string, NetworkNode>>({});
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

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
          notes: node.is_accumulation ? 'Identified accumulation sink point.' : `Active ${role} transit router.`
        };
      });

      // Filter to top 15 nodes by size if too large
      const maxNodes = 15;
      let finalNodes = computedNodes;
      let finalEdges = rawEdges;
      let hiddenNodesCount = 0;

      if (computedNodes.length > maxNodes) {
        const sorted = [...computedNodes].sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));
        const keepIds = new Set(sorted.slice(0, maxNodes).map(n => n.id));
        finalNodes = computedNodes.filter(n => keepIds.has(n.id));
        finalEdges = rawEdges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
        hiddenNodesCount = computedNodes.length - maxNodes;
      }
      setHiddenCount(hiddenNodesCount);

      // Compute dynamic ellipse positions for final nodes
      const cx = 450;
      const cy = 200;
      const rx = 330;
      const ry = 135;
      const N = finalNodes.length;

      const nodesMap: Record<string, NetworkNode> = {};
      finalNodes.forEach((node, i) => {
        let x = cx;
        let y = cy;
        
        if (N > 1) {
          const angle = (2 * Math.PI * i) / N;
          x = cx + rx * Math.cos(angle);
          y = cy + ry * Math.sin(angle);
        }

        nodesMap[node.id] = {
          ...node,
          x,
          y
        };
      });

      setNodes(nodesMap);

      // Build connections
      const conns: NetworkConnection[] = finalEdges.map(edge => {
        return {
          from: edge.source,
          to: edge.target,
          amount: `₹${(edge.total_amount ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}`,
          flowDirection: 'out'
        };
      });
      setConnections(conns);

      // Pick default active node
      if (finalNodes.length > 0) {
        setActiveNodeId(finalNodes[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load money flow graph from gateway.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  const currentNode = nodes[activeNodeId] || Object.values(nodes)[0] || null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in flex flex-col justify-between select-none">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-6">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] flex items-center gap-1 font-mono">
            <GitFork className="w-3.5 h-3.5" />
            Intel Ledger Mapping
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Money Flow Network</h1>
          <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
            Visual ledger network mapping outflows, transit shells, and final integration accumulation nodes.
          </p>
        </div>

        {/* Case Scope Selection */}
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
        <div className="h-[32rem] border border-[#E4E4E7] bg-white rounded-xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
          <p className="text-xs text-[#71717A] font-light">Synthesizing network topology...</p>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50/50 rounded-xl p-12 text-center space-y-4 h-[32rem] flex flex-col items-center justify-center">
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
        <div className="border border-dashed border-[#E4E4E7] bg-white rounded-xl p-12 text-center h-[32rem] flex flex-col items-center justify-center space-y-3">
          <HelpCircle className="w-10 h-10 text-zinc-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-[#18181B]">No Flow Data</h3>
            <p className="text-xs text-[#71717A] font-light max-w-sm mx-auto mt-1 leading-relaxed">
              No transactions or entities found matching this scope to map out a money flow graph. Try uploading a statement first.
            </p>
          </div>
        </div>
      ) : (
        /* Network Graph Section */
        <div className="border border-[#E4E4E7] rounded-xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative">
          
          {/* Overlay warning for hidden nodes */}
          {hiddenCount > 0 && (
            <div className="absolute top-4 right-4 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 text-[10px] text-amber-800 font-mono shadow-sm z-30">
              Showing top 15 nodes. {hiddenCount} smaller nodes hidden from view.
            </div>
          )}

          {/* SVG Container */}
          <div className="w-full h-[32rem] bg-[#FAF9F6] rounded-lg border border-[#F4F4F5] relative overflow-hidden">
            
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 400">
              {/* Draw connections with directed animated dashes */}
              {connections.map((conn, idx) => {
                const startNode = nodes[conn.from];
                const endNode = nodes[conn.to];
                if (!startNode || !endNode) return null;

                // Simple line drawing from node centers
                const pathD = `M ${startNode.x} ${startNode.y} L ${endNode.x} ${endNode.y}`;
                const isActive = activeNodeId === conn.from || activeNodeId === conn.to;

                // Center coordinates for label
                const midX = (startNode.x + endNode.x) / 2;
                const midY = (startNode.y + endNode.y) / 2;

                return (
                  <g key={idx} className="transition-opacity duration-300">
                    {/* Background line */}
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={isActive ? '#18181B' : '#E4E4E7'} 
                      strokeWidth={isActive ? '2.2' : '1.2'} 
                      className="transition-all"
                    />
                    
                    {/* Animated dash flow */}
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={isActive ? '#3B82F6' : '#2563EB'} 
                      strokeWidth={isActive ? '2.5' : '1.2'} 
                      strokeDasharray="6 20"
                      className="animate-[pulse_1.5s_infinite]"
                      opacity={isActive ? 0.9 : 0.15}
                    />

                    {/* Edge text label container */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect 
                        x="-30" 
                        y="-7" 
                        width="60" 
                        height="14" 
                        rx="3" 
                        fill="#FFFFFF" 
                        stroke={isActive ? '#18181B' : '#E4E4E7'} 
                        strokeWidth="0.5"
                      />
                      <text 
                        y="3" 
                        textAnchor="middle" 
                        fill="#18181B" 
                        fontSize="7" 
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {conn.amount}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {Object.values(nodes).map((node) => {
                const isSelected = activeNodeId === node.id;
                
                const roleColor = 
                  node.role === 'sender' ? 'fill-[#EFF6FF] stroke-[#C7D2FE]' : 
                  node.role === 'accumulator' ? 'fill-[#FEF2F2] stroke-[#FCA5A5]' : 
                  'fill-[#F0FDF4] stroke-[#A7F3D0]';

                const roleLabelColor = 
                  node.role === 'sender' ? 'fill-[#1D4ED8]' : 
                  node.role === 'accumulator' ? 'fill-[#DC2626]' : 
                  'fill-[#047857]';

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer transition-transform duration-200"
                    onClick={() => setActiveNodeId(node.id)}
                  >
                    {isSelected && (
                      <circle r="44" fill="#18181B" opacity="0.04" className="animate-pulse" />
                    )}

                    <circle 
                      r="34" 
                      className={`${roleColor} transition-all`} 
                      strokeWidth={isSelected ? '2.5' : '1.2'} 
                      stroke={isSelected ? '#18181B' : undefined}
                    />

                    <circle r="6" fill="#18181B" opacity={isSelected ? '1' : '0.2'} />

                    <text y="48" textAnchor="middle" className="fill-[#18181B] font-bold text-[9px] font-sans">
                      {node.label.length > 14 ? `${node.label.slice(0, 11)}...` : node.label}
                    </text>
                    <text y="57" textAnchor="middle" className={`${roleLabelColor} font-semibold text-[7px] uppercase tracking-wide font-mono`}>
                      {node.role}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Node HUD Tooltip */}
            {currentNode && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border border-[#E4E4E7] rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md max-w-2xl mx-auto animate-fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded font-mono ${
                      currentNode.role === 'sender' ? 'bg-blue-50 text-blue-800' :
                      currentNode.role === 'accumulator' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                    }`}>
                      {currentNode.role} Point
                    </span>
                    <span className="text-[11px] font-bold text-[#18181B] font-sans">{currentNode.label}</span>
                  </div>
                  <p className="text-[11px] text-[#71717A] font-light leading-relaxed font-sans">{currentNode.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[9px] text-[#71717A] uppercase block font-mono">Volume flow</span>
                  <strong className="text-xs font-semibold text-[#18181B] font-mono">{currentNode.amountStr}</strong>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
