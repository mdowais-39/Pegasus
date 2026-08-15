import { getApiBaseUrl } from "./api";

export function getDownloadUrl(caseId: string, format: "pdf" | "excel" | "docx"): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/v1/reports/${caseId}/${format}`;
}

export function downloadReport(caseId: string, format: "pdf" | "excel" | "docx", filename?: string) {
  const url = getDownloadUrl(caseId, format);
  const a = document.createElement("a");
  a.href = url;
  // The server returns Content-Disposition: attachment, but having download attribute is a good client-side fallback.
  const ext = format === "excel" ? "xlsx" : format;
  a.download = filename || `Forensic_Report_${caseId}.${ext}`;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export type ServiceReport = "round-trips" | "money-flow" | "money-trail";

/** Download a per-service investigation report (scoped to caseId). */
export function downloadServiceReport(
  caseId: string,
  service: ServiceReport,
  format: "pdf" | "excel" | "docx"
) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/reports/${caseId}/service/${service}/${format}`;
  const ext = format === "excel" ? "xlsx" : format;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${service.replace("-", "_")}_report_${caseId}.${ext}`;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
