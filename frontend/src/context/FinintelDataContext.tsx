import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Statement, CaseSummary } from "../types/api";
import { getStatements, getCaseSummary } from "../services/finintelApi";

interface FinintelDataContextProps {
  caseId: string;
  setCaseId: (id: string) => void;
  latestStatementId: string | null;
  setLatestStatementId: (id: string | null) => void;
  statements: Statement[];
  refreshStatements: () => Promise<void>;
  caseSummary: CaseSummary | null;
  refreshSummary: (id?: string) => Promise<void>;
  isLoadingSummary: boolean;
  summaryError: string | null;
}

const FinintelDataContext = createContext<FinintelDataContextProps | undefined>(undefined);

export const FinintelDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [caseId, setCaseIdState] = useState<string>("all");
  const [latestStatementId, setLatestStatementId] = useState<string | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const refreshStatements = useCallback(async () => {
    try {
      const data = await getStatements(1, 100);
      setStatements(data);
      // Determine if there is a completed statement we can treat as the latestStatementId
      const completed = data.filter((s) => s.status === "completed");
      if (completed.length > 0) {
        // Use the newest one as the latest completed
        setLatestStatementId(completed[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load statements list:", err);
    }
  }, []);

  const refreshSummary = useCallback(async (id?: string) => {
    const targetId = id || caseId;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const summary = await getCaseSummary(targetId);
      setCaseSummary(summary);
    } catch (err: any) {
      console.error("Failed to fetch case summary:", err);
      setSummaryError(err.message || "Failed to load case summary.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, [caseId]);

  const setCaseId = useCallback((id: string) => {
    setCaseIdState(id);
    refreshSummary(id);
  }, [refreshSummary]);

  // Load initial statements list
  useEffect(() => {
    refreshStatements();
  }, [refreshStatements]);

  // Load summary whenever caseId changes
  useEffect(() => {
    refreshSummary(caseId);
  }, [caseId, refreshSummary]);

  return (
    <FinintelDataContext.Provider
      value={{
        caseId,
        setCaseId,
        latestStatementId,
        setLatestStatementId,
        statements,
        refreshStatements,
        caseSummary,
        refreshSummary,
        isLoadingSummary,
        summaryError,
      }}
    >
      {children}
    </FinintelDataContext.Provider>
  );
};

export const useFinintelData = () => {
  const context = useContext(FinintelDataContext);
  if (!context) {
    throw new Error("useFinintelData must be used within a FinintelDataProvider");
  }
  return context;
};
