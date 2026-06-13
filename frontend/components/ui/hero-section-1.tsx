import React, { useState, useEffect, useRef } from "react"
import { 
  Building, 
  Coins, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  Network, 
  ArrowRight, 
  ChevronRight, 
  Menu, 
  X, 
  Send, 
  Sparkles, 
  Terminal, 
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Download,
  Flame,
  ArrowUpRight,
  Globe,
  RefreshCw,
  Activity,
  FileCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedGroup } from "@/components/ui/animated-group"
import { cn } from "@/lib/utils"

// Transition variants for animated-group
const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

// Interfaces for our interactive workspace simulation
interface TraceNode {
  id: string;
  label: string;
  type: 'corporation' | 'crypto' | 'mule' | 'offshore';
  risk: number;
  country: string;
  amount: string;
  flag: string;
  x: number;
  y: number;
  description: string;
}

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export function HeroSection() {
  const [selectedDoc, setSelectedDoc] = useState<string>("MegaCorp_Statement.csv");
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestionStep, setIngestionStep] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<string>("delta");
  const [activeTab, setActiveTab] = useState<'graph' | 'copilot' | 'report'>("graph");
  
  // Chat state for copilot
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "### Ingested Intelligence File: `MegaCorp_Bank_Statement_Oct2026.csv`\n\nI have cross-matched corporate registries and resolved 5 active entities.\n\nType or select one of the core investigative directives below to begin tracing the fund flows:",
      timestamp: "05:46:07"
    }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  // Handle ingestion simulation
  const triggerIngestion = (docName: string) => {
    setSelectedDoc(docName);
    setIsIngesting(true);
    setIngestionStep("1. Reading raw CSV file bytes and sanitizing data headers...");
    
    setTimeout(() => {
      setIngestionStep("2. Applying automated Entity Resolution (matching business tax IDs with SEC files)...");
    }, 800);

    setTimeout(() => {
      setIngestionStep("3. Running transaction loop identification algorithms (Tarjan cycle detection)...");
    }, 1600);

    setTimeout(() => {
      setIngestionStep("4. Resolving offshore beneficial ownership & bearer token contracts...");
    }, 2400);

    setTimeout(() => {
      setIsIngesting(false);
      setIngestionStep("");
      // Add system message
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      setChatHistory(prev => [
        ...prev,
        {
          sender: "ai",
          text: `### 📂 Successfully Re-Indexed Workspace Evidence: \`${docName}\`
- Resolved \`4\` high probability shell entities.
- Flags: Circular round-tripping alert active ($1.2M cycle volume).
- Dynamic risk score updated to: **0.91** (Extreme).`,
          timestamp
        }
      ]);
      setActiveTab("graph");
    }, 3200);
  };

  // Chat request with server API
  const handleSendMessage = async (textToSend?: string) => {
    const rawMsg = textToSend || chatInput;
    if (!rawMsg.trim()) return;

    if (!textToSend) setChatInput("");
    
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setChatHistory(prev => [...prev, { sender: "user", text: rawMsg, timestamp }]);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: rawMsg })
      });
      const data = await response.json();
      setChatHistory(prev => [
        ...prev, 
        { 
          sender: "ai", 
          text: data.text || "No intelligence generated. Please try again.", 
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) 
        }
      ]);
    } catch (err) {
      console.error("Failed to query FinIntel Copilot:", err);
      setChatHistory(prev => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ Intelligence pipeline error. Server is unresponsive. Please retry.",
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Trace interactive nodes definition
  const nodes: Record<string, TraceNode> = {
    apex: {
      id: "apex",
      label: "Apex Venture Corp",
      type: "corporation",
      risk: 42,
      country: "United States",
      flag: "🇺🇸",
      amount: "$1.20M USD",
      x: 20,
      y: 35,
      description: "US-registered LLC. Initiated Consultative SLA agreements sending $1.2M directly to Caribbean bank."
    },
    delta: {
      id: "delta",
      label: "Delta Shell Holdings",
      type: "offshore",
      risk: 91,
      country: "Cayman Islands",
      flag: "🇰🇾",
      amount: "$1.18M Layers",
      x: 50,
      y: 18,
      description: "Secrecy-jurisdiction corporation. Possesses nominee directors. Forwards 98% of inflows within 48 hours."
    },
    vanguard: {
      id: "vanguard",
      label: "Vanguard Seychelles Trading",
      type: "corporation",
      risk: 76,
      country: "Seychelles",
      flag: "🇸🇨",
      amount: "$1.15M Equity",
      x: 80,
      y: 35,
      description: "Offshore trade agent. Re-routes funds back into US Venture LLC as 'Capital injections' to close laundering loop."
    },
    mule: {
      id: "mule",
      label: "Carlos Santana (Acct #39281)",
      type: "mule",
      risk: 94,
      country: "United States",
      flag: "🇺🇸",
      amount: "$390K Deposited",
      x: 35,
      y: 65,
      description: "Nominee mule node. Student holding account. 42 physical structured branch deposits made consecutively under $10K limit."
    },
    crypto: {
      id: "crypto",
      label: "ERC20 Mixer (0x7a84...)",
      type: "crypto",
      risk: 98,
      country: "Decentralized",
      flag: "🌐",
      amount: "USDT Swap Desks",
      x: 65,
      y: 65,
      description: "Smart contract linked to state-sanctioned digital asset mixing pools & token anonymizers."
    }
  };

  return (
    <>
      <HeroHeader />
      <main className="relative pt-20 overflow-hidden bg-[#050505] text-white select-none">
        
        {/* Ambient Radial Glows matching theme */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px] pointer-events-none"></div>

        {/* Hero Section */}
        <section className="relative z-10 px-6 pt-16 mx-auto max-w-7xl md:pt-28">
          <div className="flex flex-col items-center text-center">
            
            {/* Announcement Pill */}
            <div 
              onClick={() => document.getElementById("scroll-story")?.scrollIntoView({ behavior: "smooth" })}
              className="mb-6 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-bold tracking-widest uppercase text-white/80 inline-flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all shadow-md"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span> 
              <span>Introducing AI-Powered Financial Crime Intelligence</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            </div>

            {/* Massive Display Title with ultra bold font display and tight tracking */}
            <h1 className="mt-8 font-display font-bold tracking-tighter text-balance text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] text-white max-w-4xl leading-[0.95]">
              Turn Financial Evidence <br />
              Into <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">Intelligence.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-sm sm:text-base md:text-lg lg:text-xl text-white/50 max-w-2xl font-medium leading-relaxed font-sans">
              Upload bank statements, transactional records, PDFs, spreadsheets, and imagery. 
              FinIntel uncovers suspicious entities, traces fund flows, and reveals hidden networks in seconds.
            </p>

            {/* Call To Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-10 md:mt-12 w-full max-w-md">
              <Button 
                onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto px-8 py-6 bg-white text-black hover:bg-neutral-200 font-semibold rounded-lg transition-colors cursor-pointer text-sm shadow-xl"
              >
                Request Demo
                <ArrowRight className="w-4 h-4 text-black ml-1" />
              </Button>
              <Button 
                onClick={() => document.getElementById("scroll-story")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto px-8 py-6 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold rounded-lg transition-colors cursor-pointer text-sm"
              >
                See How It Works
              </Button>
            </div>

            {/* Sub-footer indicators as high-contrast subtle text */}
            <div className="flex flex-wrap gap-x-12 gap-y-4 justify-center mt-14 opacity-40 font-display text-[11px] uppercase tracking-[0.2em] font-bold text-white max-w-4xl">
              <div>Global Graph Intelligence</div>
              <div>Real-time Risk Mapping</div>
              <div>Evidence Provenance Engine</div>
            </div>
          </div>
        </section>

        {/* Cinematic Workspace Container (Hero Visual) */}
        <section id="workspace" className="relative z-10 max-w-7xl mx-auto mt-16 md:mt-24 px-4 lg:px-6">
          <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 lg:p-7 shadow-2xl shadow-zinc-950/90 overflow-hidden ring-1 ring-white/5">
            
            {/* Workspace Overlay Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

            {/* Ambient Background Grid for visualizer */}
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

            {/* App Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-white/10 z-20 relative">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <span className="text-xs font-mono text-zinc-500">WORKSPACE // APEX-DELTA-LOOP</span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-950/40 text-red-400 border border-red-900/30 flex items-center gap-1 font-bold">
                  <ShieldAlert className="w-3 h-3" /> CRIMINAL INTEL ACTIVE
                </span>
              </div>

              {/* Document Selection Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                <span className="text-xs text-zinc-500 font-mono hidden lg:inline mr-2">EVIDENCE DOCS:</span>
                <button 
                  onClick={() => triggerIngestion("MegaCorp_Statement.csv")}
                  disabled={isIngesting}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono border duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    selectedDoc === "MegaCorp_Statement.csv" 
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100" 
                      : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Statement_Oct.csv
                </button>
                <button 
                  onClick={() => triggerIngestion("Cayman_Holdings_Reg.pdf")}
                  disabled={isIngesting}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono border duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    selectedDoc === "Cayman_Holdings_Reg.pdf" 
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100" 
                      : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" /> Cayman_Holdings.pdf
                </button>
                <button 
                  onClick={() => triggerIngestion("USDT_Token_Flow.json")}
                  disabled={isIngesting}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono border duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    selectedDoc === "USDT_Token_Flow.json" 
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100" 
                      : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Coins className="w-3.5 h-3.5" /> Crypto_Trace.json
                </button>
              </div>
            </div>

            {/* Ingestion Scanning Overlay */}
            {isIngesting && (
              <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center font-mono">
                <div className="max-w-md p-6 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl text-center">
                  <RefreshCw className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-zinc-200 mb-2">Ingesting Evidence Document</h3>
                  <div className="text-xs text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800 text-left space-y-1">
                    <p className="text-violet-400">{ingestionStep}</p>
                    <p className="text-zinc-600">Analyzing transaction nodes via Graph Neural Net...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Workspace Frame */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-5">
              
              {/* Left Column: Evidence Ledger & Workspace Navigation */}
              <div className="xl:col-span-3 flex flex-col gap-4">
                <div className="border border-white/10 p-4 rounded-xl bg-black/40 backdrop-blur-sm shadow-xl flex flex-col gap-3 relative z-20">
                  <div className="text-xs text-zinc-400 font-mono flex justify-between">
                    <span>Evidence Repository</span>
                    <span>12 Records</span>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    <div className="p-2 border border-white/10 bg-white/5 rounded flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-zinc-350 max-w-[110px] truncate">Bank_Ledger_US.csv</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/20 px-1 py-0.5 rounded">VERIFIED</span>
                    </div>

                    <div className="p-2 border border-red-500/20 bg-red-950/10 rounded flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Coins className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-200 max-w-[110px] truncate">TRON_Audit_12.json</span>
                      </div>
                      <span className="text-[10px] text-red-400 bg-red-950/30 px-1 py-0.5 rounded">FLAGGED</span>
                    </div>

                    <div className="p-2 border border-white/10 bg-white/5 rounded flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-zinc-350 max-w-[110px] truncate">KYC_ApexCorp.pdf</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded">PROCESSED</span>
                    </div>
                  </div>

                  {/* Smart Filters */}
                  <div className="border-t border-white/10 pt-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">AI Forensic Detections</span>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400 p-1 bg-white/5 rounded hover:bg-white/10 hover:text-zinc-200 duration-150 cursor-pointer">
                        <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Circular Loops</span>
                        <span className="font-mono text-amber-400 font-bold bg-amber-950/30 px-1.5 py-0.2 text-[10px] rounded">1 Active</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 p-1 bg-white/5 rounded hover:bg-white/10 hover:text-zinc-200 duration-150 cursor-pointer">
                        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-red-500" /> Structuring Wires</span>
                        <span className="font-mono text-red-400 font-bold bg-red-950/20 px-1.5 py-0.2 text-[10px] rounded">3 Tracked</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 p-1 bg-white/5 rounded hover:bg-white/10 hover:text-zinc-200 duration-150 cursor-pointer">
                        <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-sky-400" /> Layering Companies</span>
                        <span className="font-mono text-sky-400 font-bold bg-sky-950/10 px-1.5 py-0.2 text-[10px] rounded">2 Identified</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Radar / Key Status Metric */}
                <div className="border border-white/10 p-4 rounded-xl bg-[#0D0D0D] shadow-xl flex flex-col justify-between relative z-20">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">System Diagnostics</span>
                    <h4 className="text-sm font-semibold text-zinc-300 mt-1">Aggregated Risk Velocity</h4>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="relative w-14 h-14 rounded-full border-2 border-zinc-800 flex items-center justify-center font-mono">
                      <span className="text-red-400 text-xs font-bold">91%</span>
                      <div className="absolute inset-0 rounded-full border-r-2 border-t-2 border-red-500 animate-spin [animation-duration:3s]" />
                    </div>
                    <div className="text-xs font-mono space-y-1 text-zinc-400">
                      <p className="text-red-400 font-semibold">• EXTREME ALARMS ENABLED</p>
                      <p>Flow Velocity: 14.8M/s</p>
                      <p>Total Hop Counts: 7</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Column: Interactive Graph & Tracing Sandbox */}
              <div className="xl:col-span-6 border border-white/10 rounded-xl bg-[#0D0D0D]/90 p-4 relative min-h-[420px] flex flex-col justify-between overflow-hidden shadow-2xl z-20">
                
                {/* Active Segment Navigation */}
                <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 w-full mb-3 z-10">
                  <button 
                    onClick={() => setActiveTab("graph")}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-xs font-semibold font-sans transition-all cursor-pointer",
                      activeTab === "graph" ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
                    )}
                  >
                    Interactive Relationship Graph
                  </button>
                  <button 
                    onClick={() => setActiveTab("copilot")}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-xs font-semibold font-sans transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      activeTab === "copilot" ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" /> AI Investigator Copilot
                  </button>
                  <button 
                    onClick={() => setActiveTab("report")}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-xs font-semibold font-sans transition-all cursor-pointer",
                      activeTab === "report" ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
                    )}
                  >
                    Investigation Report (PDF)
                  </button>
                </div>

                {/* VIEW A: GRAPH VIEW */}
                {activeTab === "graph" && (
                  <div className="relative flex-1 bg-black/40 border border-white/10 rounded-lg p-3 overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-2 left-2 z-10 text-[10px] font-mono text-zinc-400 bg-black/90 px-2.5 py-1 rounded-md border border-white/15 shadow-md">
                      INTERACTIVE SELECTION: CLICK NODES TO INVESTIGATE FLOWS
                    </div>

                    {/* Interactive Drawing Stage */}
                    <div className="relative w-full h-[280px] mt-4 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                          <linearGradient id="gradient-loop" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                          </linearGradient>
                        </defs>
                        {/* Circular laundering paths */}
                        <path 
                          d="M100 110 Q 200 60 300 70" 
                          fill="none" 
                          stroke="url(#gradient-loop)" 
                          strokeWidth="2.5" 
                          strokeDasharray="4,4" 
                          className="animate-[dash_10s_linear_infinite]" 
                        />
                        <path 
                          d="M300 70 Q 400 110 410 110" 
                          fill="none" 
                          stroke="url(#gradient-loop)" 
                          strokeWidth="2.5" 
                          strokeDasharray="4,4" 
                          className="animate-[dash_10s_linear_infinite]" 
                        />
                        <path 
                          d="M410 110 Q 250 200 100 110" 
                          fill="none" 
                          stroke="#a855f7" 
                          strokeWidth="2.5" 
                          strokeDasharray="4,4" 
                          className="animate-[dash_6s_linear_infinite]" 
                        />
                        
                        {/* Connection to Sanctioned Crypto */}
                        <line 
                          x1="300" y1="70" 
                          x2="350" y2="200" 
                          stroke="rgba(239, 68, 68, 0.4)" 
                          strokeWidth="2" 
                          strokeDasharray="5,3" 
                        />
                        
                        {/* Connection back to Nominee Account */}
                        <line 
                          x1="100" y1="110" 
                          x2="170" y2="200" 
                          stroke="rgba(16, 185, 129, 0.4)" 
                          strokeWidth="2" 
                          strokeDasharray="5,4" 
                        />
                      </svg>

                      {/* Node Entities */}
                      {Object.values(nodes).map((n) => {
                        const isSelected = selectedNode === n.id;
                        return (
                          <div
                            key={n.id}
                            onClick={() => setSelectedNode(n.id)}
                            className={cn(
                              "absolute cursor-pointer p-2 rounded-xl transition-all duration-300 max-w-[140px] font-mono select-none text-center",
                              isSelected 
                                ? "bg-[#111] border-2 border-white scale-105 shadow-xl shadow-white/5 z-20" 
                                : "bg-black/90 border border-white/10 text-white/70 hover:border-white/30 z-10"
                            )}
                            style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}
                          >
                            <div className="flex items-center justify-center gap-1.5 text-xs">
                              <span>{n.flag}</span>
                              <span className="font-bold text-[10px] md:text-xs text-white truncate">{n.label}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-1">
                              <span className="text-[10px] text-zinc-500">{n.amount}</span>
                              <span className={cn(
                                "text-[9px] px-1 py-0.1 font-bold rounded",
                                n.risk > 80 ? "bg-red-950/50 text-red-450" : "bg-yellow-950/50 text-yellow-450"
                              )}>
                                {n.risk}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dynamic Brief describing selected node in Graph */}
                    <div className="bg-black/85 p-3 rounded-lg border border-white/10 text-xs font-mono relative">
                      <div className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </div>
                      <p className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">SOLVED FLOW DETECTED</p>
                      <h4 className="text-white font-bold mt-1 text-sm">
                        {nodes[selectedNode].flag} {nodes[selectedNode].label} ({nodes[selectedNode].country})
                      </h4>
                      <p className="text-zinc-400 mt-1 leading-relaxed font-sans font-light">
                        {nodes[selectedNode].description}
                      </p>
                    </div>
                  </div>
                )}

                {/* VIEW B: INTEGRATED COPILET CHAT */}
                {activeTab === "copilot" && (
                  <div className="relative flex-1 bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col justify-between overflow-hidden">
                    
                    {/* Chat Messages Scrolling History */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs max-h-[220px]">
                      {chatHistory.map((c, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "p-2.5 rounded-lg border leading-relaxed font-sans",
                            c.sender === 'user' 
                              ? "bg-white/5 border-white/10 text-white ml-8 text-right font-light" 
                              : "bg-black/60 border-white/5 text-white/90 mr-8 text-left space-y-1.5"
                          )}
                        >
                          <div className={cn("text-[9px] font-mono text-zinc-500 mb-0.5", c.sender === "user" ? "text-right" : "text-left")}>
                            {c.sender === "ai" ? "FININTEL CO-COPILOT" : "YOU"} • {c.timestamp}
                          </div>
                          
                          {/* Rendering Markdown formatted text cleanly */}
                          <div className="text-zinc-300 font-light prose prose-invert font-sans whitespace-pre-line text-[11px] leading-relaxed">
                            {c.text}
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="bg-black/40 border border-white/10 p-2.5 rounded-lg mr-8 text-left text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                          <span>Generating analytical intelligence report...</span>
                        </div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>

                    {/* Prepackaged Intelligent Queries */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10 mt-2 z-10 bg-black/40">
                      <button 
                        onClick={() => handleSendMessage("Show accounts involved in Delta circular flow")}
                        disabled={isTyping}
                        className="text-[10px] font-mono bg-white/5 border border-white/10 hover:border-white/30 hover:text-white duration-150 px-2 py-1 rounded text-zinc-400 cursor-pointer"
                      >
                        💡 Trace Delta Loop
                      </button>
                      <button 
                        onClick={() => handleSendMessage("Analyze transaction patterns for mule Account #39281")}
                        disabled={isTyping}
                        className="text-[10px] font-mono bg-white/5 border border-white/10 hover:border-white/30 hover:text-white duration-150 px-2 py-1 rounded text-zinc-400 cursor-pointer"
                      >
                        💡 Check Nominee Mule Santana
                      </button>
                      <button 
                        onClick={() => handleSendMessage("Has high risk crypto mixing been detected in USDT file?")}
                        disabled={isTyping}
                        className="text-[10px] font-mono bg-white/5 border border-white/10 hover:border-white/30 hover:text-white duration-150 px-2 py-1 rounded text-zinc-400 cursor-pointer"
                      >
                        💡 Find Sanctioned Mixers
                      </button>
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        disabled={isTyping}
                        placeholder="Ask AI Copilot (e.g. Is there circular flow registered here?)..."
                        className="flex-1 bg-black border border-white/10 rounded px-3 py-1.5 text-xs font-sans text-white placeholder-zinc-650 focus:outline-none focus:border-white duration-200"
                      />
                      <button 
                        onClick={() => handleSendMessage()}
                        disabled={isTyping}
                        className="bg-white text-black hover:bg-neutral-200 font-bold px-3.5 py-1.5 rounded text-xs transition duration-200 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW C: REPORT PREVIEW VIEW */}
                {activeTab === "report" && (
                  <div className="relative flex-1 bg-black/40 border border-white/10 rounded-lg p-3 font-mono text-xs overflow-y-auto max-h-[290px] space-y-4">
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[9px] text-zinc-500">CLASSIFICATION: HIGHLY RESTRICTED</span>
                        <h3 className="text-white font-bold text-sm">FORENSIC AUDIT RECORD #99-0128</h3>
                        <p className="text-[10px] text-zinc-400">Subject: APEX-DELTA SHELL CAPITAL DRAIN</p>
                      </div>
                      <button className="bg-white text-black font-semibold px-2.5 py-1 rounded text-[10px] hover:bg-neutral-200 duration-150 flex items-center gap-1 cursor-pointer">
                        <Download className="w-3 h-3 text-black" /> Export PDF
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="border border-white/10 p-2.5 bg-black/85 rounded">
                        <span className="text-[9px] text-amber-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> SEC. 1: EXECUTIVE SUMMARY
                        </span>
                        <p className="text-zinc-400 text-[10px] mt-1.5 leading-relaxed font-sans font-light">
                          Our transaction neural engine resolved high-probability round-tripping layers. Apex Venture Corp routed $1.2M USD offshore to Cayman Entity 'Delta Holdings', which was laundered through crypto mixer platforms and sub-entities, returning 96% back to initiator Apex LLC.
                        </p>
                      </div>

                      <div className="border border-white/10 p-2.5 bg-black/85 rounded space-y-1.5">
                        <span className="text-[9px] text-blue-400 font-bold">SEC. 2: ACCOUNT TRAILS</span>
                        <div className="text-[10px] space-y-1 text-zinc-500 font-mono">
                          <p className="text-zinc-300">• Account 0x7a84...38c9: Swapped $450,000 to anonymity nodes</p>
                          <p className="text-zinc-300">• Nominee carlos santana: Initiated smurfing wires totaling $390,000 USD</p>
                          <p className="text-zinc-300">• Bearer company shares: Cayman Holdings possesses bearer shares</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Evidence Tracker & Insights Panel */}
              <div className="xl:col-span-3 flex flex-col gap-4">
                <div className="border border-white/10 p-4 rounded-xl bg-[#0D0D0D] shadow-xl flex flex-col justify-between flex-1 relative z-20">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Investigation Insights</span>
                    <h4 className="text-xs font-semibold text-zinc-300 mt-1">Laid Pattern Diagnostics</h4>
                  </div>
                  
                  {/* Explanations checklist */}
                  <div className="mt-4 space-y-2.5">
                    <div className="p-2 border border-violet-500/20 bg-violet-950/20 rounded flex gap-2">
                      <CheckCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <div className="text-xs font-mono">
                        <p className="text-zinc-200 font-bold font-sans">Circular transaction detected</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Asset loop back to host Corp complete</p>
                      </div>
                    </div>

                    <div className="p-2 border border-white/10 bg-white/5 rounded flex gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs font-mono">
                        <p className="text-zinc-200 font-bold font-sans">Structuring (Smurfing)</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Wires grouped under KYC limit threshold</p>
                      </div>
                    </div>

                    <div className="p-2 border border-white/10 bg-white/5 rounded flex gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs font-mono">
                        <p className="text-zinc-200 font-bold font-sans">Offshore Shelving</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Bearer shares of Cayman company audit</p>
                      </div>
                    </div>

                    <div className="p-2 border border-red-500/20 bg-red-950/20 rounded flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs font-mono">
                        <p className="text-zinc-200 font-bold font-sans">Sanctioned Mixer Node</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Crypto output traces into Tornado Cash</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 mt-4 flex items-center justify-between text-xs font-mono text-zinc-500">
                    <span>Forensic Engine v3.14</span>
                    <span className="flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> status: online</span>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Bottom Legend/Status Bar */}
            <div className="h-8 border-t border-white/10 bg-black/80 flex items-center px-4 justify-between text-[10px] font-mono text-white/40 mt-5 rounded-b-xl z-30">
              <div className="flex gap-4">
                <span>STATUS: ANALYZING NODE TOPOLOGY</span>
                <span>SESSION: INVESTIGATION_481_ALPHA</span>
              </div>
              <div className="flex gap-4" id="stat-indicators">
                <span className="text-blue-500">PROCESSED: 16.2GB</span>
                <span className="text-white/60">UTC 14:21:03</span>
              </div>
            </div>
            
          </div>
        </section>

        {/* Scroll Story Telling Narrative Section */}
        <section id="scroll-story" className="relative z-10 mt-28 md:mt-40 max-w-7xl mx-auto px-6 space-y-36 pb-32">
          
          {/* Section 1: Chaos to Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-mono font-bold text-violet-400 tracking-widest uppercase block">// SECTION 01</span>
              <h2 className="text-4xl md:text-5xl font-display font-medium text-balance tracking-tight leading-snug">
                Financial Crime Doesn't Hide in Plain Sight.
              </h2>
              <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed font-sans">
                Investigators today are drowned in billions of unstructured bank statements, isolated crypto ledgers, and offshore registry pdf sheets. 
                Sifting through records is a manual, human-error prone bottleneck. Traditional systems flag millions of alerts, but fail to tie disconnected evidence together.
              </p>
              <div className="pt-2">
                <Button 
                  onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })}
                  variant="outline" 
                  className="rounded-xl border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 border"
                >
                  Start Forensic Trace
                </Button>
              </div>
            </div>
            <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden min-h-[300px] flex flex-col justify-center shadow-2xl">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500">COMPLEXITY MATRIX // RAW DISCONNECTED DATA</div>
              
              <div className="grid grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 border border-white/10 bg-white/5 rounded space-y-1.5 hover:border-red-500/20 duration-150">
                  <span className="text-red-400 text-[10px] font-bold block">• TRANSACTION VOLUMES</span>
                  <span className="text-zinc-200 text-lg font-bold block">14,281,902</span>
                  <span className="text-zinc-500 text-[9px] block">Unstandardized daily CSV wire entries.</span>
                </div>
                <div className="p-3 border border-white/10 bg-white/5 rounded space-y-1.5 hover:border-red-500/20 duration-150">
                  <span className="text-red-400 text-[10px] font-bold block">• DISCONNECTED RECORDS</span>
                  <span className="text-zinc-200 text-lg font-bold block">92% Isolated</span>
                  <span className="text-zinc-500 text-[9px] block">No linked beneficial tax registry.</span>
                </div>
                <div className="p-3 border border-white/10 bg-white/5 rounded space-y-1.5 hover:border-red-500/20 duration-150">
                  <span className="text-red-400 text-[10px] font-bold block">• FALSE ALERTS</span>
                  <span className="text-zinc-200 text-lg font-bold block">99.2% Rate</span>
                  <span className="text-zinc-500 text-[9px] block">Clogs operations, hiding actual crime.</span>
                </div>
              </div>
              <div className="mt-6 p-3 bg-white/5 rounded border border-white/10 border-dashed text-xs text-zinc-400 font-sans text-center font-light">
                FinIntel automatically converts this disparate noise into a continuous, deterministic relationship graph.
              </div>
            </div>
          </div>

          {/* Section 2: Follow The Money */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 lg:order-2 space-y-6">
              <span className="text-xs font-mono font-bold text-violet-400 tracking-widest uppercase block">// SECTION 02</span>
              <h2 className="text-4xl md:text-5xl font-display font-medium text-balance tracking-tight leading-snug">
                Follow The Money.
              </h2>
              <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed font-sans">
                Our dynamic graph intelligence engine maps out flow connections in real-time. Accounts automatically resolve. 
                Shell structures connect, entities crystallize, and circular loop clusters emerge right before your eyes. 
              </p>
              <div className="space-y-2 mt-4 font-mono text-xs">
                <div className="flex items-center gap-3 text-zinc-300 py-1 border-b border-zinc-900">
                  <span className="w-5 h-5 rounded bg-violet-950 text-violet-400 flex items-center justify-center font-bold">1</span>
                  <span>Instant transaction ledger linking</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300 py-1 border-b border-zinc-900">
                  <span className="w-5 h-5 rounded bg-violet-950 text-violet-400 flex items-center justify-center font-bold">2</span>
                  <span>Auto entity resolution (SEC/FATF sources)</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300 py-1 border-b border-zinc-900">
                  <span className="w-5 h-5 rounded bg-violet-950 text-violet-400 flex items-center justify-center font-bold">3</span>
                  <span>Interactive flow speed visualizers</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden min-h-[300px] flex flex-col justify-between lg:order-1 shadow-2xl">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500">GRAPH INTELLIGENCE // TRANSACTION VECTOR ANALYSIS</div>
              
              <div className="space-y-3 font-mono text-xs mt-4">
                <div className="p-2 border border-white/10 rounded bg-black/40 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-450 flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Apex LLC</span>
                  <span className="text-zinc-500">➖➖ $1,200,000 Wires ➡️</span>
                  <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">Delta Cayman</span>
                </div>
                
                <div className="p-2 border border-white/10 rounded bg-black/40 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">Delta Cayman</span>
                  <span className="text-zinc-500">➖➖ $1,180,000 Layers ➡️</span>
                  <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">Vanguard Trading</span>
                </div>

                <div className="p-2 border border-white/10 rounded bg-black/40 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">Vanguard Trading</span>
                  <span className="text-zinc-500">➖➖ $1,150,000 Equity ➡️</span>
                  <span className="text-[10px] font-bold text-zinc-450 flex items-center gap-1">Apex LLC</span>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded border border-white/10 text-xs text-zinc-300 font-sans text-center mt-6">
                ⚡ Circular Money Loop flagged (Risk Severity 0.91). Total volume cycled: $1.20M USD.
              </div>
            </div>
          </div>

          {/* Section 3: See The Whole Network */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-mono font-bold text-violet-400 tracking-widest uppercase block">// SECTION 03</span>
              <h2 className="text-4xl md:text-5xl font-display font-medium text-balance tracking-tight leading-snug">
                See The Whole Network.
              </h2>
              <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed font-sans">
                FinIntel maps hidden relationships across jurisdictions. Uncover nominee directors, trace fiat to cryptocurrency off-ramps, detect smurfing mules, and monitor shell company holdings within a unified investigator terminal.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 border border-white/10 rounded-lg hover:bg-white/5 duration-150">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase">Shell Companies</h4>
                  <p className="text-[11px] text-zinc-500 font-sans mt-1">Bearer tokens & nominal directories verified internally.</p>
                </div>
                <div className="p-3 border border-white/10 rounded-lg hover:bg-white/5 duration-150">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase">Mule Networks</h4>
                  <p className="text-[11px] text-zinc-500 font-sans mt-1">Cross-reference deposits below CTR thresholds of $10,000.</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden min-h-[320px] flex flex-col justify-between shadow-2xl">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500">FORENSIC SUITE // NETWORK MAPPING OVERVIEW</div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 font-mono text-xs">
                <div className="p-3.5 border border-white/10 rounded bg-black/55 text-center">
                  <span className="text-xl">🇨🇾</span>
                  <h5 className="font-bold text-zinc-200 mt-2">Cyprus</h5>
                  <p className="text-[10px] text-zinc-500 mt-1">2 Holding Shells</p>
                </div>
                <div className="p-3.5 border border-white/10 rounded bg-black/55 text-center">
                  <span className="text-xl">🇰🇾</span>
                  <h5 className="font-bold text-zinc-200 mt-2">Cayman</h5>
                  <p className="text-[10px] text-zinc-500 mt-1">1 Offsite Trust</p>
                </div>
                <div className="p-3.5 border border-red-500/25 rounded bg-red-950/10 text-center border-red-900/40">
                  <span className="text-xl">🇸🇨</span>
                  <h5 className="font-bold text-red-300 mt-2">Seychelles</h5>
                  <p className="text-[10px] text-zinc-500 mt-1">1 Mixing Contract</p>
                </div>
                <div className="p-3.5 border border-white/10 rounded bg-black/55 text-center">
                  <span className="text-xl">🇵🇦</span>
                  <h5 className="font-bold text-zinc-200 mt-2">Panama</h5>
                  <p className="text-[10px] text-zinc-500 mt-1">3 Nominee Agent</p>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded border border-white/10 text-xs text-zinc-400 font-sans text-center mt-6">
                Connected across 4 sovereign privacy jurisdictions to follow beneficial capital traces actively.
              </div>
            </div>
          </div>

          {/* Section 4: Explainable AI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 lg:order-2 space-y-6">
              <span className="text-xs font-mono font-bold text-violet-400 tracking-widest uppercase block">// SECTION 04</span>
              <h2 className="text-4xl md:text-5xl font-display font-medium text-balance tracking-tight leading-snug">
                AI That Explains Itself.
              </h2>
              <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed font-sans">
                We believe security models must never be black boxes. FinIntel doesn't just score transactions; it cites exact transaction references, points to exact regulatory files, and explains the forensic logic inside a beautifully formatted diagnostic briefing.
              </p>
              
              <div className="p-4 border border-white/10 bg-[#0A0A0A] rounded-xl font-mono text-xs max-w-xl shadow-xl">
                <div className="flex justify-between border-b border-white/10 pb-2 mb-2 text-[10px] text-zinc-500">
                  <span>ANALYSIS CHIP // DELTA LOOP</span>
                  <span>RISK SCORE: 0.91</span>
                </div>
                <div className="space-y-1 text-zinc-450">
                  <p className="text-emerald-400 font-bold">✓ Loop alert: Circular transaction pattern confirmed</p>
                  <p className="text-emerald-400 font-bold">✓ Speed alert: Hop propagation time below 48 hours</p>
                  <p className="text-emerald-400 font-bold">✓ Owner alert: Cayman bearer company nominee director identified</p>
                  <p className="text-red-400 font-bold">✗ Transaction block: Funds offshore switched to privacy mixer</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-5 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden min-h-[300px] flex flex-col justify-center lg:order-1 shadow-2xl">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500">EXPLAINABILITY DIAGNOSTIC TERMINAL</div>
              
              <div className="p-4 bg-black border border-white/10 rounded-lg shadow-inner font-mono text-xs text-zinc-300">
                <span className="text-violet-400 font-semibold">FinIntel_Model_v3.14_Audit:</span>
                <p className="mt-2 text-zinc-400 font-sans font-light text-[11px] leading-relaxed">
                  "Target account Carlos Santana resembles student nominee layout. 42 consecutive fiat deposits made physically below CTR limits ($9.5K median) constitute high probability structured smurfing to circumvent Bank Secrecy Act (BSA) compliance reporting."
                </p>
                <div className="mt-3 flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-900 pt-2">
                  <span>Confidence: 98.42%</span>
                  <span>Class: Smurfing / Structuring</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: From Evidence to Report */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-mono font-bold text-violet-400 tracking-widest uppercase block">// SECTION 05</span>
              <h2 className="text-4xl md:text-5xl font-display font-medium text-balance tracking-tight leading-snug">
                From Evidence To Report.
              </h2>
              <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed font-sans">
                Compile exhaustive, court-ready Suspicious Activity Reports (SARs) or compliance summaries in one click. 
                Our system automates writing PDF briefings, maps complete money trails with vector graphs, compiles exact dates, times, and transaction hashes, and packages them for compliance officers and legal counsel instantly.
              </p>
              <div className="pt-2">
                <Button 
                  onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-violet-600 hover:bg-violet-500 text-zinc-100 px-6 py-5 rounded-xl text-xs flex items-center gap-1.5 duration-200 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" /> Download Demo SARS Report (PDF)
                </Button>
              </div>
            </div>
            
            <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden min-h-[300px] flex flex-col justify-between shadow-2xl">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500">SARS REPORT EXPORT PREVIEW</div>
              
              <div className="border border-white/10 bg-black/80 rounded-lg p-4 font-mono text-xs text-zinc-400 space-y-3 mt-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-2 text-[10px]">
                  <span className="font-bold text-zinc-200">FORM SAR-2026 // CASE REF #991</span>
                  <span className="text-zinc-500">VERIFIED STATUS // EXPORT SUBMITTED</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p><b className="text-zinc-200">Executive Summary:</b> Apex Venture Corp money cycle traced across offshore trusts and TRON network mixers.</p>
                  <p><b className="text-zinc-200">Flagged Wires Volume:</b> $1,200,000 USD (fiat), $450,000 swap OTC (USDT).</p>
                  <p><b className="text-zinc-200">Jurisdictions Affected:</b> United States, Cayman Islands, Seychelles.</p>
                </div>
                <div className="border-t border-white/10 pt-2 text-[9px] text-zinc-500 flex justify-between">
                  <span>Prepared by FinIntel Engine</span>
                  <span>Compliance Officer Approved</span>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded border border-white/10 text-xs text-zinc-400 font-sans text-center mt-6">
                Our reports comply with FATF & BSA templates, minimizing compliance officers' paperwork overhead by up to 88%.
              </div>
            </div>
          </div>

        </section>

        {/* Final Call To Action Section */}
        <section className="relative z-10 bg-[#050505] py-24 md:py-32 border-t border-white/10 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[70rem] h-[30rem] rounded-full ambient-radial-glow blur-3xl opacity-30" />
          </div>

          <div className="max-w-4xl mx-auto text-center px-6 space-y-8 relative z-10">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tighter text-white leading-tight">
              See The Network. <br />
              Follow The Money. <br />
              Understand The Risk.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-sans font-light leading-relaxed">
              Built for forensic investigators, enterprise compliance teams, top banks, and regulatory bodies. 
              Equip your security desk with an operating system for financial crime intelligence.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-white text-black hover:bg-neutral-200 px-8 py-6 rounded-xl text-sm font-semibold shadow-lg shadow-white/5 cursor-pointer"
              >
                Request Access Demo
              </Button>
              <Button 
                onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })}
                variant="ghost" 
                className="px-8 py-6 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium cursor-pointer"
              >
                Launch Simulator
              </Button>
            </div>
          </div>
        </section>

        {/* Premium Corporate Footer */}
        <footer className="relative z-10 py-12 border-t border-white/10 bg-[#050505] text-zinc-500 text-xs text-center font-mono">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-auto text-zinc-300" />
              <span className="text-zinc-500 font-sans font-light">| Crime Intelligence Operating System</span>
            </div>
            <div className="flex gap-6 text-zinc-500 font-sans font-light">
              <a href="#link" className="hover:text-zinc-300 duration-150">Security Policy</a>
              <a href="#link" className="hover:text-zinc-300 duration-150">FATF Guidelines</a>
              <a href="#link" className="hover:text-zinc-300 duration-150">Terms of Service</a>
            </div>
            <div>
              <p className="text-[11px] font-sans font-light text-zinc-600">© 2026 FinIntel Corp. Confidential enterprise system.</p>
            </div>
          </div>
        </footer>

      </main>
    </>
  )
}

const menuItems = [
  { name: 'How It Works', href: '#scroll-story' },
  { name: 'Intelligence Engine', href: '#workspace' },
  { name: 'Investigations', href: '#workspace' },
  { name: 'AI Copilot', href: '#workspace' },
  { name: 'Reports', href: '#workspace' },
]

const HeroHeader = () => {
  const [menuState, setMenuState] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="relative z-50">
      <nav
        data-state={menuState && 'active'}
        className="fixed z-40 w-full px-2 group mt-2"
      >
        <div className={cn(
          'mx-auto max-w-6xl px-6 transition-all duration-300 lg:px-12 py-3 lg:py-4', 
          isScrolled 
            ? 'bg-black/90 border border-white/10 max-w-4xl rounded-xl shadow-2xl shadow-black/80 backdrop-blur-md' 
            : 'bg-transparent border-transparent'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            
            {/* Elegant Vector Logo */}
            <div className="flex w-full justify-between lg:w-auto">
              <a
                href="/"
                aria-label="home"
                className="flex items-center space-x-2 text-zinc-100 font-display font-bold tracking-tight text-lg"
              >
                <Logo className="text-violet-400" />
                <span className="font-semibold text-zinc-200 tracking-tight font-display">FinIntel</span>
              </a>

              {/* Mobile Menu Icon */}
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden text-zinc-300"
              >
                {menuState ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-xs font-mono tracking-wider uppercase text-zinc-400 font-medium">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className="text-zinc-400 hover:text-zinc-200 block duration-150"
                    >
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Desktop CTA Action Button / Mobile Drawers */}
            <div className={cn(
              "mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl p-6 lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:p-0",
              menuState ? "block bg-zinc-950/95 border border-zinc-800 rounded-2xl mt-4" : "hidden"
            )}>
              <div className="lg:hidden w-full">
                <ul className="space-y-6 text-sm font-mono tracking-wider uppercase text-zinc-400">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        onClick={() => setMenuState(false)}
                        className="text-zinc-300 hover:text-violet-400 block duration-150"
                      >
                        <span>{item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit mt-4 lg:mt-0">
                <Button
                  onClick={() => {
                    setMenuState(false);
                    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border hover:bg-zinc-900 border-zinc-800 text-zinc-350 cursor-pointer"
                >
                  Request Demo
                </Button>
              </div>
            </div>

          </div>
        </div>
      </nav>
    </header>
  )
}

const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-5 w-auto', className)}
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="url(#prism-logo)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="url(#prism-logo)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="url(#prism-logo)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="prism-logo"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  )
}
