import { apiRequest } from "./api";
import {
  UploadResponse,
  JobStatus,
  Statement,
  BackendTransaction,
  ValidationReport,
  RoundTripsResponse,
  RoundTripExplanation,
  MoneyFlowResponse,
  MoneyTrailResponse,
  CaseSummary,
} from "../types/api";

export async function uploadStatement(file: File, bankName?: string): Promise<UploadResponse> {
  const formData = new FormData();
  const baseName = file.name.split('/').pop()?.split('\\').pop() || file.name;
  formData.append("file", file, baseName);
  if (bankName) {
    formData.append("bank_name", bankName);
  }

  return apiRequest<UploadResponse>("/api/v1/statements/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiRequest<JobStatus>(`/api/v1/jobs/${jobId}/status`);
}

export async function getStatements(page = 1, pageSize = 50): Promise<Statement[]> {
  return apiRequest<Statement[]>(`/api/v1/statements?page=${page}&page_size=${pageSize}`);
}

export async function getStatementTransactions(
  statementId: string,
  page = 1,
  pageSize = 50
): Promise<BackendTransaction[]> {
  return apiRequest<BackendTransaction[]>(
    `/api/v1/statements/${statementId}/transactions?page=${page}&page_size=${pageSize}`
  );
}

export async function getStatementValidationReport(statementId: string): Promise<ValidationReport> {
  return apiRequest<ValidationReport>(`/api/v1/statements/${statementId}/validation-report`);
}

export async function getRoundTrips(caseId: string): Promise<RoundTripsResponse> {
  return apiRequest<RoundTripsResponse>(`/api/v1/investigations/${caseId}/round-trips`);
}

export async function getRoundTripExplanation(
  caseId: string,
  chainId: string | number
): Promise<RoundTripExplanation> {
  return apiRequest<RoundTripExplanation>(
    `/api/v1/investigations/${caseId}/round-trips/${chainId}/explanation`
  );
}

export async function getMoneyFlow(caseId: string): Promise<MoneyFlowResponse> {
  return apiRequest<MoneyFlowResponse>(`/api/v1/investigations/${caseId}/money-flow`);
}

export async function getMoneyTrail(caseId: string, transactionId: string): Promise<MoneyTrailResponse> {
  return apiRequest<MoneyTrailResponse>(
    `/api/v1/investigations/${caseId}/money-trail/${transactionId}`
  );
}

export async function getCaseSummary(caseId: string): Promise<CaseSummary> {
  return apiRequest<CaseSummary>(`/api/v1/cases/${caseId}/summary`);
}

export async function getReportJson(caseId: string): Promise<any> {
  return apiRequest<any>(`/api/v1/reports/${caseId}/json`);
}

export async function getHealth(): Promise<any> {
  return apiRequest<any>("/health");
}

export async function getServicesHealth(): Promise<any> {
  return apiRequest<any>("/services/health");
}

export async function deleteStatement(statementId: string): Promise<any> {
  return apiRequest<any>(`/api/v1/statements/${statementId}`, {
    method: "DELETE",
  });
}

export async function clearDatabase(): Promise<any> {
  return apiRequest<any>("/api/v1/database/clear", {
    method: "POST",
  });
}
