import React, { useState } from 'react';
import { GitFork, ArrowUpRight, ArrowDownLeft, ShieldCheck, Focus } from 'lucide-react';

interface NetworkNode {
  id: string;
  label: string;
  role: 'sender' | 'receiver' | 'accumulator';
  amount: string;
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
  const [activeNodeId, setActiveNodeId] = useState<string>('apex');

  const nodes: Record<string, NetworkNode> = {
    apex: {
      id: 'apex',
      label: 'Apex Venture Corp (US)',
      role: 'sender',
      amount: '₹1,200,000 Sent',
      x: 120,
      y: 100,
      desc: 'US parent seed node. Originated ₹1,200,000 disguised as offshore SLA retainer fees.',
      notes: 'Origin point for primary round-trip loops.'
    },
    santana: {
      id: 'santana',
      label: 'Carlos Santana (Mule Proxy)',
      role: 'sender',
      amount: '₹385,000 Sent',
      x: 120,
      y: 280,
      desc: 'Nominee cash mule. Staggered consecutive teller cash deposits below reporting triggers.',
      notes: 'Structures retail ATM deposits.'
    },
    cayman: {
      id: 'cayman',
      label: 'Delta Shell Holdings (Cayman)',
      role: 'receiver',
      amount: '₹1,585,000 Cleared',
      x: 350,
      y: 190,
      desc: 'Jurisdictional shell. Acts as a high-velocity transit sink routing funds within 48 hours.',
      notes: 'Bypasses standard reporting checks.'
    },
    seychelles: {
      id: 'seychelles',
      label: 'Vanguard Trading (Seychelles)',
      role: 'receiver',
      amount: '₹1,180,000 Ingested',
      x: 580,
      y: 100,
      desc: 'Seychelles trade entity. Repatriates funds back to US Parent as equity capital placement.',
      notes: 'Closes circular assets-inflation loops.'
    },
    mixer: {
      id: 'mixer',
      label: 'ERC20 Decentralized Swap Desk',
      role: 'accumulator',
      amount: '₹450,000 Accumulated',
      x: 580,
      y: 280,
      desc: 'Smart-contract mixer integration. Active landing point where token blends are dispersed.',
      notes: 'Peak capital accumulation sink.'
    },
    property: {
      id: 'property',
      label: 'UK Real Estate Escrow Holder',
      role: 'accumulator',
      amount: '₹95,000 Accumulated',
      x: 780,
      y: 190,
      desc: 'Luxury escrow buffer. Funds integrated into high-value tangible assets under nominee trusts.',
      notes: 'Integration phase target destination.'
    }
  };

  const connections: NetworkConnection[] = [
    { from: 'apex', to: 'cayman', amount: '₹1,200,000', flowDirection: 'out' },
    { from: 'santana', to: 'cayman', amount: '₹385,000', flowDirection: 'out' },
    { from: 'cayman', to: 'seychelles', amount: '₹1,180,000', flowDirection: 'in' },
    { from: 'seychelles', to: 'apex', amount: '₹1,150,000', flowDirection: 'out' }, // Loop close
    { from: 'cayman', to: 'mixer', amount: '₹450,000', flowDirection: 'in' },
    { from: 'seychelles', to: 'property', amount: '₹95,000', flowDirection: 'in' }
  ];

  const currentNode = nodes[activeNodeId] || nodes.apex;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in flex flex-col justify-between select-none">
      
      {/* Title section */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] flex items-center gap-1 font-mono">
          <GitFork className="w-3.5 h-3.5" />
          Intel Ledger Mapping
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Money Flow Network</h1>
        <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
          At least 70% of this workspace is dedicated to the visual ledger ledger network graph mapping outflows, transit shells, and final integration accumulation nodes.
        </p>
      </div>

      {/* Network Graph Section */}
      <div className="border border-[#E4E4E7] rounded-xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        
        {/* SVG Container taking exactly 70% height equivalent */}
        <div className="w-full h-[32rem] bg-[#FAF9F6] rounded-lg border border-[#F4F4F5] relative overflow-hidden">
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 400">
            {/* Draw connections with directed animated dashes */}
            {connections.map((conn, idx) => {
              const startNode = nodes[conn.from];
              const endNode = nodes[conn.to];
              if (!startNode || !endNode) return null;

              // Quadratic curve calculation for non-overlapping organic flow paths
              const midX = (startNode.x + endNode.x) / 2;
              const midY = (startNode.y + endNode.y) / 2 - (conn.from === 'seychelles' && conn.to === 'apex' ? 50 : 0);

              const pathD = conn.from === 'seychelles' && conn.to === 'apex'
                ? `M ${startNode.x} ${startNode.y} Q ${midX} ${midY}, ${endNode.x} ${endNode.y}`
                : `M ${startNode.x} ${startNode.y} L ${endNode.x} ${endNode.y}`;

              const isActive = activeNodeId === conn.from || activeNodeId === conn.to;

              return (
                <g key={idx} className="transition-opacity duration-300">
                  {/* Backdrop shadow connecting line */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke={isActive ? '#18181B' : '#E4E4E7'} 
                    strokeWidth={isActive ? '2.5' : '1.5'} 
                    className="transition-all"
                  />
                  
                  {/* Animated ledger token movement */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke={isActive ? '#3B82F6' : '#2563EB'} 
                    strokeWidth={isActive ? '3' : '1.5'} 
                    strokeDasharray="6 20"
                    className="animate-[pulse_1.5s_infinite]"
                    opacity={isActive ? 0.9 : 0.2}
                  />

                  {/* Text mid-way amount tag */}
                  <rect 
                    x={midX - 35} 
                    y={midY - 10} 
                    width="70" 
                    height="16" 
                    rx="4" 
                    fill="#FFFFFF" 
                    stroke="#E4E4E7" 
                    strokeWidth="0.5"
                  />
                  <text 
                    x={midX} 
                    y={midY + 1} 
                    textAnchor="middle" 
                    fill="#18181B" 
                    fontSize="7" 
                    fontWeight="bold"
                    className="font-mono text-[8px]"
                  >
                    {conn.amount}
                  </text>
                </g>
              );
            })}

            {/* Render Nodes */}
            {Object.values(nodes).map((node) => {
              const isSelected = activeNodeId === node.id;
              
              // Node styling based on functional role
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
                  {/* Backdrop halo anchor */}
                  {isSelected && (
                    <circle r="44" fill="#18181B" opacity="0.04" className="animate-pulse" />
                  )}

                  {/* Base Circle shape */}
                  <circle 
                    r="34" 
                    className={`${roleColor} transition-all`} 
                    strokeWidth={isSelected ? '2.5' : '1.2'} 
                    stroke={isSelected ? '#18181B' : undefined}
                  />

                  {/* Core identifier symbol */}
                  <circle r="6" fill="#18181B" opacity={isSelected ? '1' : '0.2'} />

                  {/* Responsive metadata label */}
                  <text y="48" textAnchor="middle" className="fill-[#18181B] font-bold text-[10px] font-sans">
                    {node.label.split(' ')[0]}
                  </text>
                  <text y="58" textAnchor="middle" className={`${roleLabelColor} font-semibold text-[8px] uppercase tracking-wide font-mono`}>
                    {node.role}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick HUD Tooltip absolute overlay inside graph space */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border border-[#E4E4E7] rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md max-w-2xl mx-auto">
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
              <span className="text-[9px] text-[#71717A] uppercase block font-mono">Flow Weight</span>
              <strong className="text-xs font-semibold text-[#18181B] font-mono">{currentNode.amount}</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
