import React, { useState } from 'react';
import { Key, Shield, User, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [investigatorName, setInvestigatorName] = useState('Agent Willis');
  const [agencyCode, setAgencyCode] = useState('AML-US-UNIT4');
  const [modelType, setModelType] = useState('gemini-2.5-flash');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10 animate-fade-in select-none">
      
      {/* Header and subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Profile & Configurations</h1>
        <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
          Configure local workspace descriptors, operational handles, and language model defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Settings form (Left) */}
        <form onSubmit={handleSave} className="md:col-span-7 bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider font-mono">
              Workspace Profile Settings
            </h3>
            <p className="text-xs text-[#71717A] mt-1 font-light font-sans">
              These details identify the investigator on compiled briefs or export audit trails.
            </p>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525B] uppercase block font-mono">
                  Investigator Handle
                </label>
                <input
                  type="text"
                  value={investigatorName}
                  onChange={(e) => setInvestigatorName(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-md px-3 py-1.5 text-[#18181B] focus:outline-none focus:ring-1 focus:ring-[#18181B] font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525B] uppercase block font-mono">
                  Division Identifier Code
                </label>
                <input
                  type="text"
                  value={agencyCode}
                  onChange={(e) => setAgencyCode(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-md px-3 py-1.5 text-[#18181B] focus:outline-none focus:ring-1 focus:ring-[#18181B] font-semibold"
                />
              </div>
            </div>

            {/* Token keys */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#52525B] uppercase flex justify-between font-mono">
                <span>Secure API Proxy token</span>
                <span className="text-[9px] text-[#047857] font-bold bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.2 rounded leading-none">
                  PROXY VERIFIED
                </span>
              </label>
              
              <div className="relative">
                <input
                  type="password"
                  disabled
                  value="••••••••••••••••••••••••••••••••••••••••"
                  className="w-full bg-[#FAF9F6] border border-[#E4E4E7] rounded-md px-3 py-1.5 text-[#A1A1AA] focus:outline-none cursor-not-allowed font-sans font-extrabold"
                />
              </div>
              <p className="text-[10.5px] text-[#71717A] font-light">
                Secure tokens are handled proxy-side to prevent client-side leaks in shared frames.
              </p>
            </div>

            {/* Models */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#52525B] uppercase block font-mono">
                Default Extraction Model
              </label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full bg-white border border-[#E4E4E7] hover:border-[#18181B] rounded-md px-3 py-1.5 text-[#18181B] focus:outline-none cursor-pointer font-medium font-sans"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (High Efficiency)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Precision Logic Reasoning)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#E4E4E7]">
            <span className="text-[10px] text-[#71717A] font-mono">Forensics Core v2.4</span>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#18181B] hover:bg-black text-white rounded-md text-xs font-semibold cursor-pointer transition-colors font-sans"
            >
              Save Configurations
            </button>
          </div>

          {isSaved && (
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-lg text-xs font-bold flex items-center gap-2 animate-fade-in font-sans">
              <Shield className="w-4 h-4 text-[#10B981]" />
              <span>Configurations successfully synchronized.</span>
            </div>
          )}
        </form>

        {/* Security guidelines policy (Right) */}
        <div className="md:col-span-5 bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4 shadow-xs text-xs font-sans">
          <div>
            <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider font-mono">
              Legal Compliance Policy
            </h3>
            <p className="text-xs text-[#71717A] mt-1 font-light">
              Workspace legal jurisdiction constraints.
            </p>
          </div>

          <div className="space-y-4 pt-1 text-[#52525B] font-light leading-relaxed font-sans">
            <div className="space-y-1.5">
              <span className="text-[9px] text-[#18181B] font-bold uppercase block font-mono">
                1. Account Auditing Clearance
              </span>
              <p>
                Compliance parameters are governed by active international AML agreements. All downloaded files and compiled briefs are logged for ledger audit trail accountability reviews.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#E4E4E7]">
              <span className="text-[9px] text-[#18181B] font-bold uppercase block font-mono">
                2. Data Privacy Limits
              </span>
              <p>
                Beneficial Ownership Registry extracts are sourced purely from active corporate registries. Retransmissions must conform to sovereign confidentiality covenants.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
