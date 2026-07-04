import React from 'react';
import { FileDown } from 'lucide-react';
import { downloadServiceReport, ServiceReport } from '../services/downloads';

// Compact "export this service's report" control (PDF + Excel), reusing the
// app's existing button styling. Scoped to the caller's current caseId.
export function ServiceReportButtons({
  caseId,
  service,
}: {
  caseId: string;
  service: ServiceReport;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono pr-1">Export</span>
      <button
        type="button"
        onClick={() => downloadServiceReport(caseId, service, 'pdf')}
        className="px-2.5 py-1.5 bg-[#18181B] hover:bg-black text-white text-[11px] font-semibold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
        title="Download this service's report (PDF)"
      >
        <FileDown className="w-3 h-3" /> PDF
      </button>
      <button
        type="button"
        onClick={() => downloadServiceReport(caseId, service, 'excel')}
        className="px-2.5 py-1.5 bg-white border border-[#E4E4E7] hover:border-[#18181B] text-[#18181B] text-[11px] font-semibold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
        title="Download this service's report (Excel)"
      >
        <FileDown className="w-3 h-3 text-[#52525B]" /> Excel
      </button>
    </div>
  );
}
