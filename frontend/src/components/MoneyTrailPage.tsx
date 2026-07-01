import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, CornerDownRight, Coins, ShieldAlert, FileSearch, Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { useFinintelData } from '../context/FinintelDataContext';
import { getStatementTransactions, getMoneyTrail } from '../services/finintelApi';
import { BackendTransaction, MoneyTrailResponse } from '../types/api';

export default function MoneyTrailPage() {
  const { caseId, latestStatementId, statements } = useFinintelData();

  // Selected statement for credit source selection
  const [selectedStmtId, setSelectedStmtId] = useState<string>('');
  const [creditTxns, setCreditTxns] = useState<BackendTransaction[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  
  // Money Trail states
  const [trailData, setTrailData] = useState<MoneyTrailResponse['trail'] | null>(null);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [isLoadingTrail, setIsLoadingTrail] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [trailError, setTrailError] = useState<string | null>(null);

  // Completed statements list
  const completedStatements = statements.filter(s => s.status === 'completed');

  // Align selectedStmtId based on global caseId and latestStatementId changes
  useEffect(() => {
    if (caseId && caseId !== 'all') {
      setSelectedStmtId(caseId);
    } else if (latestStatementId) {
      setSelectedStmtId(latestStatementId);
    } else if (completedStatements.length > 0) {
      setSelectedStmtId(completedStatements[0].id);
    }
  }, [caseId, latestStatementId, statements]);

  // Fetch transactions for the selected statement to list CREDITS
  const fetchTransactions = useCallback(async (stmtId: string) => {
    if (!stmtId) return;
    setIsLoadingTxns(true);
    setTxnError(null);
    setCreditTxns([]);
    setSelectedTxId('');
    setTrailData(null);
    try {
      const txs = await getStatementTransactions(stmtId, 1, 150);
      // Filter credit transactions
      const credits = txs.filter(t => t.debit_credit === 'CREDIT');
      setCreditTxns(credits);
      if (credits.length > 0) {
        setSelectedTxId(credits[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setTxnError(err.message || "Failed to load statement transactions.");
    } finally {
      setIsLoadingTxns(false);
    }
  }, []);

  // Fetch money trail for the selected transaction
  const fetchTrail = useCallback(async (txId: string) => {
    if (!txId) return;
    setIsLoadingTrail(true);
    setTrailError(null);
    try {
      const response = await getMoneyTrail(caseId, txId);
      if (response && response.trail) {
        setTrailData(response.trail);
      } else {
        setTrailData(null);
      }
    } catch (err: any) {
      console.error(err);
      setTrailError(err.message || "Failed to retrieve FIFO money trail.");
    } finally {
      setIsLoadingTrail(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (selectedStmtId) {
      fetchTransactions(selectedStmtId);
    }
  }, [selectedStmtId, fetchTransactions]);

  useEffect(() => {
    if (selectedTxId) {
      fetchTrail(selectedTxId);
    }
  }, [selectedTxId, fetchTrail]);

  const activeTx = creditTxns.find(t => t.id === selectedTxId);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatPercent = (val: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((val / total) * 100)}%`;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-12 animate-fade-in select-none">
      
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] font-semibold bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full font-mono">
            <Coins className="w-3.5 h-3.5" />
            <span>FIFO Asset Tracing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B] font-display">Chronological Money Trails</h1>
          <p className="text-sm text-[#71717A] max-w-xl leading-relaxed font-sans font-light">
            First-In, First-Out (FIFO) tracing pairs chronological outflows back to suspicious source triggers, bypassing intermediate shell shields.
          </p>
        </div>

        {/* Statement Select dropdown */}
        {completedStatements.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-[#E4E4E7] rounded-lg p-1.5 shrink-0 shadow-xs self-start">
            <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono px-2">Statement</span>
            <select
              value={selectedStmtId}
              disabled={caseId !== 'all'}
              onChange={(e) => setSelectedStmtId(e.target.value)}
              className="bg-transparent border-0 rounded text-xs font-semibold focus:ring-0 cursor-pointer font-sans text-zinc-950 p-1 pr-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completedStatements.map(s => (
                <option key={s.id} value={s.id}>
                  {s.filename.length > 15 ? `${s.filename.slice(0, 12)}...` : s.filename}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoadingTxns ? (
        <div className="h-64 border border-[#E4E4E7] bg-white rounded-xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
          <p className="text-xs text-[#71717A] font-light">Loading statement transaction indices...</p>
        </div>
      ) : txnError ? (
        <div className="border border-red-200 bg-red-50/50 rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-950">Failed to Retrieve Transactions</h3>
          <p className="text-xs text-red-700 font-light max-w-md mx-auto">{txnError}</p>
        </div>
      ) : creditTxns.length === 0 ? (
        <div className="border border-dashed border-[#E4E4E7] bg-white rounded-xl p-12 text-center space-y-3">
          <HelpCircle className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-bold text-[#18181B]">No Credit Sources Found</h3>
          <p className="text-xs text-[#71717A] font-light max-w-sm mx-auto">
            This statement does not contain any completed credit transactions to trace FIFO dispersion. Ingest a ledger containing credit deposits first.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Credit Selection Pill Container */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider font-bold text-[#71717A] font-mono">Select Credit to Trace</span>
              <p className="text-xs text-[#71717A] font-light">Chronological FIFO disperses from this chosen ledger deposit.</p>
            </div>
            
            <select
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              className="w-full sm:w-80 bg-[#FAF9F6] border border-[#E4E4E7] hover:border-[#18181B] rounded-lg px-3 py-2 text-xs font-semibold text-zinc-950 focus:outline-none cursor-pointer font-sans shadow-sm"
            >
              {creditTxns.map(tx => (
                <option key={tx.id} value={tx.id}>
                  {tx.date} • {formatCurrency(tx.amount || 0)} - {tx.narration?.slice(0, 30) || 'Generic Inflow'}
                </option>
              ))}
            </select>
          </div>

          {isLoadingTrail ? (
            <div className="h-64 border border-[#E4E4E7] bg-white rounded-xl flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
              <p className="text-xs text-[#71717A] font-light">Resolving FIFO waterfall trails...</p>
            </div>
          ) : trailError ? (
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-red-950">Dispersion Calculation Failed</h3>
              <p className="text-xs text-red-700 font-light max-w-md mx-auto">{trailError}</p>
            </div>
          ) : !trailData ? (
            <div className="border border-dashed border-[#E4E4E7] bg-white rounded-xl p-12 text-center space-y-2">
              <FileSearch className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-[#18181B]">No Trail Path Compiled</h3>
              <p className="text-xs text-[#71717A] font-light">FIFO dispatch was not tracked for this transaction. Try choosing another credit item.</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: VISUAL WATERFALL TREE */}
              <div className="bg-white border border-[#E4E4E7] rounded-xl p-8 space-y-10 shadow-xs relative">
                <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block font-mono">
                  Asset Allocation Waterfall Diagram
                </span>

                {/* Chronological Waterfall Block */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF9F6] p-6 rounded-lg border border-[#F4F4F5]">
                  
                  {/* Source node (Left) */}
                  <div className="md:col-span-4 border border-[#18181B] bg-[#18181B] text-white p-5 rounded-lg space-y-3 shadow-md relative">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA] font-mono">Waterfall Source</span>
                      <h3 className="text-sm font-bold mt-0.5 font-sans truncate" title={activeTx?.narration || 'Credit Inflow'}>
                        {activeTx?.narration?.slice(0, 30) || 'Credit Inflow'}
                      </h3>
                    </div>
                    
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#A1A1AA] font-mono">Sender Acc: {activeTx?.sender_account || 'N/A'}</span>
                      <p className="text-2xl font-extrabold text-white mt-1.5 font-mono">
                        {formatCurrency(trailData.credit_amount ?? activeTx?.amount ?? 0)}
                      </p>
                    </div>

                    <div className="text-[9px] text-[#71717A] bg-white/5 py-1 px-2 rounded mt-2 text-center font-mono">
                      Settled: {activeTx?.date || 'N/A'}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="hidden md:flex md:col-span-1 items-center justify-center text-[#A1A1AA]">
                    <ArrowRight className="w-6 h-6 stroke-[1.5px]" />
                  </div>

                  {/* Allocation targets list (Right) */}
                  <div className="md:col-span-7 space-y-3">
                    {(!trailData.consumed_by || trailData.consumed_by.length === 0) ? (
                      <div className="bg-white border border-[#E4E4E7] rounded-lg p-6 text-center text-xs text-zinc-500 font-light">
                        No chronologically subsequent debits consumed this credit volume. Remaining balance sits in account.
                      </div>
                    ) : (
                      trailData.consumed_by.map((node, idx) => {
                        const amt = node.amount || 0;
                        const srcAmt = trailData.credit_amount || activeTx?.amount || 1;
                        
                        return (
                          <div 
                            key={idx}
                            className="bg-white border border-[#E4E4E7] rounded-lg p-3.5 flex items-center justify-between text-xs transition-shadow hover:shadow-xs"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-700 bg-[#EEF2FF] px-1.5 py-0.5 rounded leading-none font-mono">
                                  Dispersion #{idx + 1}
                                </span>
                                <span className="text-[10px] text-[#71717A] font-mono">
                                  • Ratio: {formatPercent(amt, srcAmt)}
                                </span>
                              </div>
                              <h4 className="font-semibold text-[#18181B] truncate font-sans">{node.destination || 'Unspecified Account'}</h4>
                              <p className="text-[10px] text-[#71717A] truncate font-light font-sans">
                                Date: {node.date || 'N/A'} • TX ID: {node.debit_txn_id?.slice(0, 12)}...
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-bold text-[#18181B] font-mono">{formatCurrency(amt)}</p>
                              <p className="text-[9px] text-[#C2410C] mt-0.5 font-semibold uppercase font-mono">Flagged Outflow</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </div>

              {/* SECTION 2: CHRONOCHART SPECIFICATION SUMMARY */}
              <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider font-mono">
                    Chronological FIFO Dispatch Log
                  </h3>
                  <p className="text-[11px] text-[#71717A] mt-1 font-light font-sans">
                    Detailed dispersion allocations based on first-in first-out account ledger balancing. Fully Traced: <strong className="font-bold text-zinc-950">{trailData.fully_traced ? 'YES' : 'NO'}</strong>.
                  </p>
                </div>

                <div className="divide-y divide-[#E4E4E7] text-xs">
                  <div className="py-2.5 flex justify-between font-mono text-[11px] text-zinc-500">
                    <span>Credit Received: {formatCurrency(trailData.credit_amount || 0)}</span>
                    <span>Spent: {formatCurrency(trailData.spent || 0)}</span>
                    <span>Remaining Balance: {formatCurrency(trailData.remaining || 0)}</span>
                  </div>

                  {trailData.consumed_by && trailData.consumed_by.map((node, index) => {
                    const amt = node.amount || 0;
                    const srcAmt = trailData.credit_amount || activeTx?.amount || 1;
                    return (
                      <div key={index} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0 font-sans">
                        <CornerDownRight className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
                        <div className="flex-1 font-sans">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#18181B]">{node.destination || 'Unspecified Account'}</span>
                            <span className="font-semibold text-[#C2410C] font-mono">{formatCurrency(amt)}</span>
                          </div>
                          <p className="text-[11px] text-[#71717A] mt-0.5 font-light leading-relaxed font-sans">
                            Dispersion debit chronologically charged against this credit trigger volume at proportion ratio of <strong className="font-semibold text-[#18181B] font-mono">{formatPercent(amt, srcAmt)}</strong>. Debit Tx: {node.debit_txn_id}.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
