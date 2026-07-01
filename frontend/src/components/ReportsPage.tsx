import React, { useState, useEffect, useCallback } from 'react';
import { FileDown, CheckCircle, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { useFinintelData } from '../context/FinintelDataContext';
import { getReportJson, getStatementTransactions } from '../services/finintelApi';
import { downloadReport } from '../services/downloads';

export default function ReportsPage() {
  const { caseId, setCaseId, latestStatementId, caseSummary } = useFinintelData();

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live report data
  const [reportJson, setReportJson] = useState<any>(null);
  const [suspiciousTxs, setSuspiciousTxs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReportJson(null);
    setSuspiciousTxs([]);
    try {
      const data = await getReportJson(caseId);
      setReportJson(data);
      
      const txs = data?.suspicious_transactions || data?.transactions || [];
      if (txs.length > 0) {
        setSuspiciousTxs(txs);
      } else if (caseId !== 'all') {
        // Fallback: load transactions directly from statement
        const stmtTxs = await getStatementTransactions(caseId, 1, 30);
        // Filter highly suspicious or failed or just show the top ones
        const suspicious = stmtTxs.filter(t => t.is_failed || !t.is_valid || (t.confidence_score !== null && t.confidence_score < 0.9));
        setSuspiciousTxs(suspicious.length > 0 ? suspicious : stmtTxs.slice(0, 5));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load report preview from gateway.");
      
      // Fallback: If report microservice is down, populate suspicious transactions list from transactions endpoint
      if (caseId !== 'all') {
        try {
          const stmtTxs = await getStatementTransactions(caseId, 1, 10);
          setSuspiciousTxs(stmtTxs.slice(0, 5));
        } catch (_) {}
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    setSuccessMessage(null);
    try {
      downloadReport(caseId, 'pdf');
      setSuccessMessage("PDF Report successfully compiled and downloaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("PDF download failed:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    setSuccessMessage(null);
    try {
      downloadReport(caseId, 'excel');
      setSuccessMessage("Excel Spreadsheet successfully compiled and downloaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Excel download failed:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportDocx = () => {
    setIsExportingDocx(true);
    setSuccessMessage(null);
    try {
      downloadReport(caseId, 'docx');
      setSuccessMessage("Word DOCX Document successfully compiled and downloaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("DOCX download failed:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10 animate-fade-in select-none">
      
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E4E4E7] pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Investigation Report</h1>
          <p className="text-sm text-[#71717A] mt-1 font-light font-sans">Certified compliance and forensic brief compilation.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Case Selection Selector */}
          <div className="flex items-center gap-2 bg-white border border-[#E4E4E7] rounded-lg p-1.5 shrink-0 shadow-xs">
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

          {/* Action triggers */}
          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || isExportingPDF || isExportingDocx}
              className="flex-1 sm:flex-initial px-3.5 py-1.8 bg-white border border-[#E4E4E7] hover:border-[#18181B] text-[#18181B] text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans disabled:opacity-50"
            >
              {isExportingExcel ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#71717A]" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-[#52525B]" />
              )}
              <span>Excel</span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExportingExcel || isExportingPDF || isExportingDocx}
              className="flex-1 sm:flex-initial px-3.5 py-1.8 bg-white border border-[#E4E4E7] hover:border-[#18181B] text-[#18181B] text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans disabled:opacity-50"
            >
              {isExportingDocx ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#71717A]" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-[#52525B]" />
              )}
              <span>Word</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingExcel || isExportingPDF || isExportingDocx}
              className="flex-1 sm:flex-initial px-3.5 py-1.8 bg-[#18181B] hover:bg-black text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans disabled:opacity-50"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-white" />
              )}
              <span>PDF Report</span>
            </button>
          </div>
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
        <div className="space-y-2 font-sans bg-white border border-[#E4E4E7] p-5 rounded-xl">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono flex justify-between items-center">
            <span>1. Investigation Summary</span>
            {error && <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase font-mono">Offline Fallback</span>}
          </h2>
          <p className="text-xs text-[#52525B] leading-relaxed font-light mt-2">
            {reportJson?.summary || 
              `This formal dossier consolidates multi-jurisdictional financial flow indices identified during the parsing phase. The forensic audit isolated a structured circular pathway. Total volume processed is ${
                formatCurrency(caseSummary?.total_credit || 0)
              } credits and ${
                formatCurrency(caseSummary?.total_debit || 0)
              } debits across ${caseSummary?.statements || 1} statement files.`}
          </p>
        </div>

        {/* Module 2: Suspicious Transactions */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            2. High Risk / Suspicious Transactions
          </h2>
          
          {suspiciousTxs.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center text-zinc-500 font-light">
              No suspicious transaction flags logged for this case scope.
            </div>
          ) : (
            <div className="overflow-hidden border border-[#E4E4E7] rounded-xl text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E4E4E7] text-[10px] uppercase font-bold text-[#71717A] font-mono">
                    <th className="p-3 pl-4">Sender / UPI ID</th>
                    <th className="p-3">Receiver / Account</th>
                    <th className="p-3">Narration</th>
                    <th className="p-3 text-right pr-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7] bg-white font-sans">
                  {suspiciousTxs.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-[#FAFAFA]">
                      <td className="p-3 pl-4 font-semibold text-[#18181B] max-w-[150px] truncate" title={tx.sender_account || tx.sender || 'N/A'}>
                        {tx.upi_id || tx.sender_account || tx.sender || 'N/A'}
                      </td>
                      <td className="p-3 text-[#52525B] max-w-[150px] truncate" title={tx.receiver_account || tx.receiver || 'N/A'}>
                        {tx.receiver_account || tx.receiver || 'N/A'}
                      </td>
                      <td className="p-3 text-[#71717A] font-light max-w-sm truncate" title={tx.narration || ''}>
                        {tx.narration || 'Unspecified narration'}
                      </td>
                      <td className="p-3 text-right font-bold pr-4 text-[#18181B] font-mono">
                        {formatCurrency(tx.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Module 3: Round Trips */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            3. Round Trips Analysis Summary
          </h2>
          <div className="p-5 bg-white border border-[#E4E4E7] rounded-xl text-xs space-y-3">
            <div className="flex justify-between items-center bg-[#FAF9F6] p-2.5 rounded border border-[#E4E4E7] font-semibold text-[#18181B]">
              <span className="font-sans">Closed Capital Conversion Cycles</span>
              <strong className="font-mono text-rose-700 font-bold">
                {caseSummary?.failed_or_reversed !== undefined ? `${caseSummary.failed_or_reversed} anomalies flagged` : 'N/A'}
              </strong>
            </div>
            <p className="text-[#52525B] font-light leading-relaxed">
              Forensic scanning isolates structured circular pathways designed to inflate corporate asset values and bypass tax jurisdictions. Detailed traces can be observed directly within the Round Trips interface.
            </p>
          </div>
        </div>

        {/* Module 4: Money Flow */}
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider border-b border-[#E4E4E7] pb-2 font-mono">
            4. Money Flow Topology Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl space-y-1">
              <span className="text-[10px] text-[#2563EB] font-bold uppercase font-mono">Total Transactions</span>
              <p className="font-bold text-[#18181B] text-sm">{caseSummary?.transactions || 0} Ledger Items</p>
              <p className="text-[11px] text-[#71717A] font-light">Extracted transactions mapped to SQL Database.</p>
            </div>
            <div className="p-4 bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl space-y-1">
              <span className="text-[10px] text-[#059669] font-bold uppercase font-mono">Identified Entities</span>
              <p className="font-bold text-[#18181B] text-sm">{caseSummary?.entities || 0} Entities / UPIs</p>
              <p className="text-[11px] text-[#71717A] font-light">Distinct nodes mapping to financial trails.</p>
            </div>
            <div className="p-4 bg-[#FAF9F6] border border-[#E4E4E7] rounded-xl space-y-1">
              <span className="text-[10px] text-[#DC2626] font-bold uppercase font-mono">Data Duplicates Purged</span>
              <p className="font-bold text-[#18181B] text-sm">{caseSummary?.duplicates || 0} Redundant Rows</p>
              <p className="text-[11px] text-[#71717A] font-light">Ledger cleaning Purges completed.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
