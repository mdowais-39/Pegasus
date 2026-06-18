import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Play, 
  Loader2, 
  ArrowRight,
  GitFork,
  Activity,
  RefreshCw,
  FileCheck,
  Cpu,
  Eraser,
  FileSpreadsheet,
  FileDown,
  Coins,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface OverviewPageProps {
  onNavigateToView: (view: string) => void;
}

interface EvidenceFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'Ready' | 'Processing';
  rowCount: number;
}

type NodeStatus = 'queued' | 'running' | 'complete';

const nodeCoords: Record<string, { x: number; y: number }> = {
  upload: { x: 20, y: 190 },
  ocr: { x: 240, y: 190 },
  cleaning: { x: 460, y: 190 },
  validation: { x: 680, y: 190 },
  router: { x: 900, y: 190 },
  loops: { x: 1120, y: 50 },
  flow: { x: 1120, y: 190 },
  trails: { x: 1120, y: 330 },
  report: { x: 1340, y: 190 },
  exportPdf: { x: 1560, y: 100 },
  exportExcel: { x: 1560, y: 280 },
};

const getBezierPath = (startX: number, startY: number, endX: number, endY: number) => {
  const horizontalOffset = Math.max(40, Math.abs(endX - startX) * 0.5);
  return `M ${startX} ${startY} C ${startX + horizontalOffset} ${startY}, ${endX - horizontalOffset} ${endY}, ${endX} ${endY}`;
};

export default function OverviewPage({ onNavigateToView }: OverviewPageProps) {
  // Configured with initial mock evidence files so there is active context right away
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([
    { id: 'EVID-001', name: 'Standard_Charter_Audit_Oct2026.csv', size: '2.4 MB', type: 'CSV', status: 'Ready', rowCount: 12042 },
    { id: 'EVID-002', name: 'Seychelles_UBO_Extract.pdf', size: '1.1 MB', type: 'PDF', status: 'Ready', rowCount: 45 }
  ]);

  const [dragActive, setDragActive] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [activeLogMsg, setActiveLogMsg] = useState<string>('Ready to initiate diagnostics pipeline.');

  // Node individual execution states
  const [nodeStates, setNodeStates] = useState<Record<string, NodeStatus>>({
    upload: 'complete', // Ready because initial mock files are present
    ocr: 'queued',
    cleaning: 'queued',
    validation: 'queued',
    router: 'queued',
    loops: 'queued',
    flow: 'queued',
    trails: 'queued',
    report: 'queued',
    exportPdf: 'queued',
    exportExcel: 'queued',
  });

  // Numeric details dynamically ticking during active engine steps
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [cleanedCount, setCleanedCount] = useState<number>(0);
  const [validatedCount, setValidatedCount] = useState<number>(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addSimulatedFile(e.dataTransfer.files[0].name, e.dataTransfer.files[0].size);
    }
  };

  const triggerSearchFile = () => {
    const fileSelector = document.createElement('input');
    fileSelector.type = 'file';
    fileSelector.accept = '.pdf,.csv,.xlsx,.docx,image/*';
    fileSelector.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        addSimulatedFile(e.target.files[0].name, e.target.files[0].size);
      }
    };
    fileSelector.click();
  };

  const addSimulatedFile = (name: string, rawSize: number) => {
    const sizeStr = rawSize > 1024 * 1024 
      ? (rawSize / (1024 * 1024)).toFixed(1) + ' MB' 
      : (rawSize / 1024).toFixed(0) + ' KB';
    
    const newFile: EvidenceFile = {
      id: `EVID-00${evidenceFiles.length + 1}`,
      name,
      size: sizeStr || '482 KB',
      type: name.split('.').pop()?.toUpperCase() || 'CSV',
      status: 'Ready',
      rowCount: Math.floor(Math.random() * 2400) + 120
    };
    setEvidenceFiles(prev => [...prev, newFile]);
    setNodeStates(prev => ({
      ...prev,
      upload: 'complete'
    }));
    
    // Reset pipeline to prompt clean diagnostic re-runs
    if (pipelineStatus === 'completed') {
      setPipelineStatus('idle');
      resetNodeStatesToInitial();
    }
  };

  const resetNodeStatesToInitial = () => {
    setNodeStates({
      upload: 'complete',
      ocr: 'queued',
      cleaning: 'queued',
      validation: 'queued',
      router: 'queued',
      loops: 'queued',
      flow: 'queued',
      trails: 'queued',
      report: 'queued',
      exportPdf: 'queued',
      exportExcel: 'queued',
    });
    setOcrProgress(0);
    setCleanedCount(0);
    setValidatedCount(0);
    setActiveLogMsg('Ready to initiate diagnostics pipeline.');
  };

  // Run n8n-inspired sequential pipeline simulation with fine-grained real-time counts
  const runForensicsPipeline = () => {
    setPipelineStatus('processing');
    
    // Step 2: OCR Extraction
    setNodeStates(prev => ({ ...prev, ocr: 'running' }));
    setActiveLogMsg('Active Node: Starting Optical Character Recognition on PDF layer...');
    
    let ocrIntervalVal = 0;
    const ocrTimer = setInterval(() => {
      ocrIntervalVal += 10;
      setOcrProgress(ocrIntervalVal);
      if (ocrIntervalVal >= 100) {
        clearInterval(ocrTimer);
        setNodeStates(prev => ({ ...prev, ocr: 'complete', cleaning: 'running' }));
        setActiveLogMsg('Active Node: Text recognized. Cleaning duplicate ledger tracks...');
        triggerCleaningStep();
      }
    }, 150);
  };

  const triggerCleaningStep = () => {
    let cleanVal = 0;
    const cleanTimer = setInterval(() => {
      cleanVal += 12;
      if (cleanVal >= 132) {
        setCleanedCount(132);
        clearInterval(cleanTimer);
        setNodeStates(prev => ({ ...prev, cleaning: 'complete', validation: 'running' }));
        setActiveLogMsg('Active Node: Duplicates purged. Validating structure definitions...');
        triggerValidationStep();
      } else {
        setCleanedCount(cleanVal);
      }
    }, 100);
  };

  const triggerValidationStep = () => {
    let validVal = 0;
    const valTimer = setInterval(() => {
      validVal += 1000;
      if (validVal >= 12042) {
        setValidatedCount(12042);
        clearInterval(valTimer);
        setNodeStates(prev => ({ ...prev, validation: 'complete', router: 'running' }));
        setActiveLogMsg('Active Node: Financial audit constraints confirmed. Framing routing matrices...');
        triggerRouterStep();
      } else {
        setValidatedCount(validVal);
      }
    }, 120);
  };

  const triggerRouterStep = () => {
    setTimeout(() => {
      // Complete router and start parent loops, flow, and trails simultaneously (Parallel branches!)
      setNodeStates(prev => ({
        ...prev,
        router: 'complete',
        loops: 'running',
        flow: 'running',
        trails: 'running'
      }));
      setActiveLogMsg('Active Nodes: Router branching! Tracking parallel flow networks...');
      
      triggerParallelSteps();
    }, 1200);
  };

  const triggerParallelSteps = () => {
    setTimeout(() => {
      setNodeStates(prev => ({
        ...prev,
        loops: 'complete',
        flow: 'complete',
        trails: 'complete',
        report: 'running'
      }));
      setActiveLogMsg('Active Node: Network layers synthesized. Generating consolidated PDF brief...');
      
      triggerReportStep();
    }, 1800);
  };

  const triggerReportStep = () => {
    setTimeout(() => {
      setNodeStates(prev => ({
        ...prev,
        report: 'complete',
        exportPdf: 'complete',
        exportExcel: 'complete'
      }));
      setPipelineStatus('completed');
      setActiveLogMsg('Forensics core diagnostic sequence terminated. Outputs verified.');
    }, 1400);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12 animate-fade-in select-none">
      
      {/* Inline custom styles for dynamic flow simulation (100% compliant and self-contained) */}
      <style>{`
        @keyframes flowingPath {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulseAmberNode {
          0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 1); }
          50% { box-shadow: 0 0 14px 4px rgba(245, 158, 11, 0.35); border-color: rgba(245, 158, 11, 0.6); }
        }
        .flow-line {
          stroke-dasharray: 6, 8;
          animation: flowingPath 1.2s linear infinite;
        }
        .flow-line-fast {
          stroke-dasharray: 5, 5;
          animation: flowingPath 0.8s linear infinite;
        }
        .node-running-glow {
          animation: pulseAmberNode 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Header Block */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#18181B] font-display">
          Forensic Processing Engine
        </h1>
        <p className="text-sm text-[#71717A] max-w-lg mx-auto leading-relaxed font-sans font-light">
          The intake control and analysis workshop. Upload multi-jurisdictional ledger records to trigger physical parsing, data cleaning, loop tracking and audit brief exports.
        </p>
      </div>

      {/* SECTION 1: CENTERED EVIDENCE UPLOAD AREA */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#52525B] uppercase tracking-wider">
            Evidence Intake Portal
          </h2>
          <span className="text-[10px] text-[#A1A1AA] font-medium bg-[#F4F4F5] border border-[#E4E4E7] px-2 py-0.5 rounded-md">
            PDF, CSV, XLSX, DOCX, Images
          </span>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerSearchFile}
          className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            dragActive 
              ? 'border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#EFF6FF]' 
              : 'border-[#E4E4E7] bg-white hover:border-[#18181B] shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#FAF9F6] flex items-center justify-center text-[#71717A] mb-4 border border-[#F4F4F5]">
            <UploadCloud className="w-6 h-6 text-[#18181B]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#18181B]">
              Drag & drop diagnostic ledger sheets, or <span className="text-[#2563EB] underline font-bold">browse workstation</span>
            </p>
            <p className="text-[11px] text-[#71717A] font-light">
              Maximum dataset ingestion capability: 100MB per bundle
            </p>
          </div>
        </div>

        {/* Small Uploaded File Cards */}
        {evidenceFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {evidenceFiles.map(file => (
              <div 
                key={file.id} 
                className="bg-white border border-[#E4E4E7] p-3 px-4 rounded-xl flex items-center justify-between hover:border-[#A1A1AA] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-[#FAF9F6] rounded-lg border border-[#F4F4F5] text-[#18181B] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-[#18181B] truncate">{file.name}</h3>
                    <p className="text-[10px] text-[#71717A] mt-0.5 font-light">
                      {file.rowCount.toLocaleString()} transactions • {file.size}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1 h-1 bg-[#10B981] rounded-full inline-block"></span>
                  Ready
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: INTERACTIVE VISUAL WORKFLOW PIPELINE (n8n styled canvas) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-[#52525B] uppercase tracking-wider">
              Investigation Execution Blueprint
            </h2>
            <p className="text-[11px] text-[#71717A] font-light">
              Watch real-time data flow connections cascade through localized orchestration pipelines.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Live Pipeline Status Log */}
            <div className="hidden lg:flex items-center gap-2 bg-white border border-[#E4E4E7] px-3.5 py-1.5 rounded-lg text-xs text-[#52525B] max-w-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                pipelineStatus === 'processing' ? 'bg-[#2563EB] animate-pulse' :
                pipelineStatus === 'completed' ? 'bg-[#10B981]' : 'bg-[#71717A]'
              }`} />
              <span className="truncate font-light text-[11px]">{activeLogMsg}</span>
            </div>

            {pipelineStatus === 'idle' && (
              <button
                onClick={runForensicsPipeline}
                className="w-full sm:w-auto px-4 py-1.8 bg-[#18181B] hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute Diagnostic Blueprint</span>
              </button>
            )}

            {pipelineStatus === 'processing' && (
              <div className="w-full sm:w-auto px-4 py-1.8 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Pipeline...</span>
              </div>
            )}

            {pipelineStatus === 'completed' && (
              <button
                onClick={resetNodeStatesToInitial}
                className="w-full sm:w-auto px-4 py-1.8 bg-white border border-[#E4E4E7] hover:border-[#18181B] text-[#52525B] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Workflow Canvas</span>
              </button>
            )}
          </div>
        </div>

        {/* WORKFLOW VIEWPORT CONTROLLER (Scrollable on small, full scale on large formats) */}
        <div className="bg-[#FAFDFB] border border-[#E4E4E7] rounded-xl overflow-x-auto shadow-sm relative" style={{ backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }}>
          
          {/* Main Visual Node Map Container */}
          <div className="min-w-[1780px] w-[1780px] h-[450px] relative p-8 select-none">
            
            {/* SVG Base Connection Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              
              {/* Dynamic Connection Path Generator */}
              {(() => {
                const drawConnection = (fromKey: string, toKey: string, targetStatus: NodeStatus, outPortYOffset = 38, inPortYOffset = 38) => {
                  const from = nodeCoords[fromKey];
                  const to = nodeCoords[toKey];
                  if (!from || !to) return null;
                  
                  const startX = from.x + 180;
                  const startY = from.y + outPortYOffset;
                  const endX = to.x;
                  const endY = to.y + inPortYOffset;
                  const path = getBezierPath(startX, startY, endX, endY);
                  
                  return (
                    <g key={`${fromKey}-${toKey}`}>
                      {/* Shadow background track */}
                      <path d={path} fill="none" stroke="#f4f4f5" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
                      {/* Main connection wire */}
                      <path 
                        d={path} 
                        fill="none" 
                        stroke={targetStatus === 'complete' ? '#10b981' : '#e4e4e7'} 
                        strokeWidth={targetStatus === 'running' ? '2.5' : '1.8'} 
                        strokeLinecap="round" 
                      />
                      {/* Process execution signal */}
                      {targetStatus === 'running' && (
                        <path 
                          d={path} 
                          fill="none" 
                          stroke={fromKey === 'upload' || fromKey === 'ocr' || fromKey === 'cleaning' || fromKey === 'validation' ? '#3b82f6' : '#f59e0b'} 
                          strokeWidth="2.5" 
                          strokeLinecap="round"
                          className="flow-line-fast"
                        />
                      )}
                    </g>
                  );
                };

                return (
                  <>
                    {/* upload -> ocr */}
                    {drawConnection('upload', 'ocr', nodeStates.ocr)}
                    {/* ocr -> cleaning */}
                    {drawConnection('ocr', 'cleaning', nodeStates.cleaning)}
                    {/* cleaning -> validation */}
                    {drawConnection('cleaning', 'validation', nodeStates.validation)}
                    {/* validation -> router */}
                    {drawConnection('validation', 'router', nodeStates.router)}

                    {/* Router outputs: 3 distinct parallel ports -> 3 inputs */}
                    {drawConnection('router', 'loops', nodeStates.loops, 20, 38)}
                    {drawConnection('router', 'flow', nodeStates.flow, 38, 38)}
                    {drawConnection('router', 'trails', nodeStates.trails, 56, 38)}

                    {/* Parallel paths -> Report builder merges */}
                    {drawConnection('loops', 'report', nodeStates.report === 'running' ? 'running' : (nodeStates.report === 'complete' ? 'complete' : 'queued'))}
                    {drawConnection('flow', 'report', nodeStates.report === 'running' ? 'running' : (nodeStates.report === 'complete' ? 'complete' : 'queued'))}
                    {drawConnection('trails', 'report', nodeStates.report === 'running' ? 'running' : (nodeStates.report === 'complete' ? 'complete' : 'queued'))}

                    {/* Report builder -> final exports split */}
                    {drawConnection('report', 'exportPdf', nodeStates.exportPdf, 25, 38)}
                    {drawConnection('report', 'exportExcel', nodeStates.exportExcel, 51, 38)}
                  </>
                );
              })()}
            </svg>

            {/* DOM Overlay of Interactive Node Cards positioned exactly according to coordinate grid */}
            {Object.entries(nodeCoords).map(([key, coords]) => {
              const status = nodeStates[key];
              
              // Map individual node details dynamically
              let title = '';
              let sub = '';
              let IconComponent = UploadCloud;
              let iconBg = 'bg-zinc-100 text-zinc-700';
              
              switch(key) {
                case 'upload':
                  title = 'Evidence Ingestion';
                  sub = '2 files loaded';
                  IconComponent = UploadCloud;
                  iconBg = 'bg-indigo-50 text-indigo-700 border border-indigo-100';
                  break;
                case 'ocr':
                  title = 'OCR Extraction';
                  sub = status === 'queued' ? 'PDF parsing queued' : (status === 'running' ? `Extracting text (${ocrProgress}%)` : 'Document mapped');
                  IconComponent = Cpu;
                  iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  break;
                case 'cleaning':
                  title = 'Data Cleaning';
                  sub = status === 'queued' ? 'Deduplication' : (status === 'running' ? `Cleaning (${cleanedCount}/132)` : '132 duplicates purged');
                  IconComponent = Eraser;
                  iconBg = 'bg-amber-50 text-amber-700 border border-amber-100';
                  break;
                case 'validation':
                  title = 'Data Validation';
                  sub = status === 'queued' ? 'Schema compliance' : (status === 'running' ? `Checking (${validatedCount.toLocaleString()})` : 'Format verified');
                  IconComponent = ShieldCheck;
                  iconBg = 'bg-sky-50 text-sky-700 border border-sky-100';
                  break;
                case 'router':
                  title = 'Detection Router';
                  sub = status === 'queued' ? 'Branching' : (status === 'running' ? 'Routing analysis...' : 'Separated into 3 paths');
                  IconComponent = GitFork;
                  iconBg = 'bg-rose-50 text-rose-700 border border-rose-100';
                  break;
                case 'loops':
                  title = 'Round Trip Seek';
                  sub = status === 'queued' ? 'Trace loops' : (status === 'running' ? 'Circular scan...' : '2 loops detected');
                  IconComponent = RefreshCw;
                  iconBg = 'bg-pink-50 text-pink-700 border border-pink-100';
                  break;
                case 'flow':
                  title = 'Money Flow Map';
                  sub = status === 'queued' ? 'Account graphs' : (status === 'running' ? 'Mapping nodes...' : '43 accounts mapped');
                  IconComponent = GitFork;
                  iconBg = 'bg-teal-50 text-teal-700 border border-teal-100';
                  break;
                case 'trails':
                  title = 'Money Trail Trace';
                  sub = status === 'queued' ? 'FIFO sequences' : (status === 'running' ? 'Resolving trails...' : '8 validation trails');
                  IconComponent = Activity;
                  iconBg = 'bg-violet-50 text-violet-700 border border-violet-100';
                  break;
                case 'report':
                  title = 'Report Builder';
                  sub = status === 'queued' ? 'Dossier compiling' : (status === 'running' ? 'Layering data...' : 'Dossier ready');
                  IconComponent = FileCheck;
                  iconBg = 'bg-blue-50 text-blue-700 border border-blue-100';
                  break;
                case 'exportPdf':
                  title = 'PDF Vector Brief';
                  sub = status === 'complete' ? '✓ Compiled Document' : 'Queued';
                  IconComponent = FileDown;
                  iconBg = 'bg-red-50 text-red-700 border border-red-100';
                  break;
                case 'exportExcel':
                  title = 'Excel Data Ledger';
                  sub = status === 'complete' ? '✓ Encrypted Sheet' : 'Queued';
                  IconComponent = FileSpreadsheet;
                  iconBg = 'bg-green-50 text-green-700 border border-green-100';
                  break;
              }

              const isRunning = status === 'running';
              const isComplete = status === 'complete';

              return (
                <div 
                  key={key}
                  className={`absolute bg-white rounded-xl border p-3 flex flex-col justify-between w-[180px] h-[76px] transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.03)] group hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,0,0,0.05)] ${
                    isRunning ? 'border-amber-500 node-running-glow ring-2 ring-amber-400/25 z-20' : 
                    isComplete ? 'border-[#10B981] z-10' : 'border-zinc-200 z-10'
                  }`}
                  style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
                >
                  {/* Left Connector handle (Input Port) */}
                  {key !== 'upload' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -left-1.25 top-1/2 -translate-y-1/2 flex items-center justify-center shadow-xs z-30">
                      <div className="w-1 h-1 rounded-full bg-zinc-600" />
                    </div>
                  )}

                  {/* Right Connector handle (Output Port) */}
                  {key !== 'exportPdf' && key !== 'exportExcel' && (
                    <>
                      {/* Router has 3 distinct output port markers on right border */}
                      {key === 'router' ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -right-1.25 top-[20px] flex items-center justify-center shadow-xs z-30">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          </div>
                          <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -right-1.25 top-1/2 -translate-y-1/2 flex items-center justify-center shadow-xs z-30">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          </div>
                          <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -right-1.25 top-[56px] flex items-center justify-center shadow-xs z-30">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          </div>
                        </>
                      ) : key === 'report' ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -right-1.25 top-[25px] flex items-center justify-center shadow-xs z-30">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          </div>
                          <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -right-1.25 top-[51px] flex items-center justify-center shadow-xs z-30">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          </div>
                        </>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 absolute -right-1.25 top-1/2 -translate-y-1/2 flex items-center justify-center shadow-xs z-30">
                          <div className="w-1 h-1 rounded-full bg-zinc-600" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Node Header Content */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-[11px] font-bold text-zinc-950 truncate">{title}</p>
                      <p className="text-[9px] text-zinc-500 font-light truncate mt-0.5">{sub}</p>
                    </div>
                  </div>

                  {/* Bottom details / status state */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100/80 font-mono">
                    <span className="text-[8px] tracking-wider uppercase font-semibold text-zinc-400">
                      {key === 'upload' ? 'source' : 
                       key.startsWith('export') ? 'export' : 'action'}
                    </span>
                    <div className="flex items-center gap-1">
                      {isRunning && (
                        <div className="flex items-center gap-1 text-amber-500 text-[8px] font-bold">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Active</span>
                        </div>
                      )}
                      {isComplete && (
                        <div className="flex items-center gap-1 text-[#10B981] text-[8px] font-bold">
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Done</span>
                        </div>
                      )}
                      {!isRunning && !isComplete && (
                        <span className="text-zinc-400 text-[8px] font-medium">Idle</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* SECTION 3: AFTER PROCESSING SUMMARY & ANALYSIS ACTIONS */}
      {(pipelineStatus === 'completed' || pipelineStatus === 'processing') && (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pt-4">
          
          {/* Real-time Summary Box */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                  Ingestion Extraction Results
                </h3>
                <p className="text-[11px] text-[#71717A] font-light mt-0.5">
                  Extracted analytical models matched against sovereign enforcement intelligence constraints.
                </p>
              </div>
              <span className="text-[10px] text-[#10B981] font-bold bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full uppercase">
                Success
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5 pt-1">
              <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-3 text-center space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-medium block">Extracted Tx</span>
                <p className="text-base font-bold text-[#18181B]">12,042</p>
              </div>
              <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-3 text-center space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-medium block">Identified Accs</span>
                <p className="text-base font-bold text-[#18181B]">43</p>
              </div>
              <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-3 text-center space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-medium block">De-Duplicated</span>
                <p className="text-base font-bold text-[#18181B]">132</p>
              </div>
              <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-3 text-center space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-medium block">Failures Logged</span>
                <p className="text-base font-bold text-[#18181B]">14</p>
              </div>
              <div className="bg-[#FAF9F6] border border-[#E4E4E7] text-orange-950 rounded-lg p-3 text-center space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-medium block">Loops Found</span>
                <p className="text-base font-bold text-[#C2410C]">2</p>
              </div>
              <div className="bg-[#FAF9F6] border border-[#E4E4E7] rounded-lg p-3 text-center space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-medium block">Money Trails</span>
                <p className="text-base font-bold text-[#18181B]">7</p>
              </div>
            </div>
          </div>

          {/* LARGE INTERACTIVE ANALYSIS ACTION CARDS */}
          {pipelineStatus === 'completed' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#52525B] uppercase tracking-wider">
                Investigate Extracted Findings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* 1. Round Trips Action */}
                <button
                  onClick={() => onNavigateToView('round-trips')}
                  className="bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-xl p-5 text-left transition-all duration-200 group cursor-pointer shadow-xs focus:outline-none flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF2F2] border border-[#FCA5A5] flex items-center justify-center text-[#DC2626]">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#18181B]">View Round Trips</h4>
                      <p className="text-xs text-[#71717A] mt-1 font-light leading-snug">
                        Investigate circular loops inflating entity values.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-950 font-semibold pt-2">
                    <span>Inspect Loops</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 2. Money Flow Action */}
                <button
                  onClick={() => onNavigateToView('money-flow')}
                  className="bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-xl p-5 text-left transition-all duration-200 group cursor-pointer shadow-xs focus:outline-none flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#18181B]">View Money Flow</h4>
                      <p className="text-xs text-[#71717A] mt-1 font-light leading-snug">
                        Interrogate full multi-party transit graphs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-950 font-semibold pt-2">
                    <span>Trace Flow Map</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 3. Money Trails Action */}
                <button
                  onClick={() => onNavigateToView('money-trails')}
                  className="bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-xl p-5 text-left transition-all duration-200 group cursor-pointer shadow-xs focus:outline-none flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] border border-[#A7F3D0] flex items-center justify-center text-[#16A34A]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#18181B]">View Money Trails</h4>
                      <p className="text-xs text-[#71717A] mt-1 font-light leading-snug">
                        Resolve FIFO dispersion trace sequences.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-950 font-semibold pt-2">
                    <span>View FIFO Trails</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 4. Generate Report Action */}
                <button
                  onClick={() => onNavigateToView('reports')}
                  className="bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-xl p-5 text-left transition-all duration-200 group cursor-pointer shadow-xs focus:outline-none flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E4E4E7] flex items-center justify-center text-zinc-700">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#18181B]">Generate Brief</h4>
                      <p className="text-xs text-[#A1A1AA] mt-1 font-light leading-snug">
                        Export formatted PDF and Excel ledger portfolios.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-950 font-semibold pt-2">
                    <span>Access Reports</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
