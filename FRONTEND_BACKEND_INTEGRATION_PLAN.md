# FinIntel Frontend Backend Integration Plan

## Purpose

Frontend currently has a polished React/Vite workspace, but most workspace pages still use hardcoded mock data or simulated pipeline timers. Backend now exposes real ingestion, job polling, statement, validation, investigation, graph, FIFO trail, summary, and report endpoints through the Rust API gateway at `http://localhost:8080`.

Goal: wire the frontend to real backend services, preserve current UI design, update the ingestion pipeline nodes, and make each investigation page use the correct endpoint.

## Important Pipeline Clarification

The frontend should not fake OCR, cleaning, standardization, validation, or DB-store completion with timers.

When user uploads a statement, backend worker runs the real pipeline:

```txt
upload -> OCR -> standardize -> validate -> entity extraction -> DB save -> graph refresh
```

Frontend must:

1. Upload the file through gateway.
2. Poll job status.
3. Drive node states from real `status`, `stage`, and `progress`.
4. Refresh the endpoint data tied to each node when the job reaches that point.

Meaning: while the visual pipeline is running, backend work is also running. The frontend should show stages as active/completed based on backend job status, not merely animate them.

## Backend Contract

Gateway:

```txt
http://localhost:8080
```

API prefix:

```txt
/api/v1
```

JSON endpoints return:

```ts
type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: null | {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    request_id: string;
    timestamp: string;
    pagination?: {
      page: number;
      page_size: number;
      total_items: number;
      total_pages: number;
    } | null;
  };
};
```

Binary report endpoints return raw files, not this envelope:

```txt
GET /api/v1/reports/{case_id}/pdf
GET /api/v1/reports/{case_id}/excel
GET /api/v1/reports/{case_id}/docx
```

## Frontend Current State

Stack:

- React 19
- Vite 6
- TypeScript
- React Router 7
- Tailwind CSS 4
- lucide-react
- Local auth via `localStorage.finintel_auth`
- No real API client layer yet

Relevant files:

- `frontend/src/App.tsx`
- `frontend/src/components/WorkspaceLayout.tsx`
- `frontend/src/components/OverviewPage.tsx`
- `frontend/src/components/RoundTripsPage.tsx`
- `frontend/src/components/MoneyFlowPage.tsx`
- `frontend/src/components/MoneyTrailPage.tsx`
- `frontend/src/components/ReportsPage.tsx`
- `frontend/src/components/SettingsPage.tsx`
- `frontend/src/types.ts`
- `frontend/src/data/mockData.ts`

## Required Frontend Architecture

Add:

```txt
frontend/src/services/api.ts
frontend/src/services/finintelApi.ts
frontend/src/services/downloads.ts
frontend/src/types/api.ts
frontend/src/types/viewModels.ts
```

Responsibilities:

- `api.ts`: base URL, fetch wrapper, envelope unwrap, query string builder, typed errors.
- `finintelApi.ts`: typed endpoint functions.
- `downloads.ts`: direct binary report download helpers.
- `types/api.ts`: backend response types.
- `types/viewModels.ts`: adapted UI models, if needed.

Add to `frontend/.env.example`:

```txt
VITE_FININTEL_API_BASE_URL=http://localhost:8080
```

Base URL priority:

1. `localStorage.finintel_api_base_url`
2. `import.meta.env.VITE_FININTEL_API_BASE_URL`
3. `http://localhost:8080`

## Endpoint Map

### Ingestion and Job Tracking

```txt
POST /api/v1/statements/upload
GET  /api/v1/jobs/{job_id}/status
GET  /api/v1/statements?page=1&page_size=50
GET  /api/v1/statements/{id}
GET  /api/v1/statements/{id}/transactions?page=1&page_size=50
GET  /api/v1/statements/{id}/validation-report
```

Upload form fields:

- `file`
- `bank_name` optional

Upload response:

```ts
type UploadResponse = {
  job_id: string;
  statement_id: string;
  status: "queued";
};
```

Job status:

```ts
type JobStatus = {
  job_id: string;
  statement_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  stage: string | null;
  error: string | null;
};
```

### Data Cleaning and Validation

Use this endpoint for the frontend Data Cleaning and Validation outputs:

```txt
GET /api/v1/statements/{statement_id}/validation-report
```

Response:

```ts
type ValidationReport = {
  statement_id: string;
  summary: {
    total: number;
    duplicates: number;
    failed_or_reversed: number;
    invalid: number;
    average_confidence: number | null;
  };
  issues: Array<{
    id: string;
    date: string | null;
    amount: number | null;
    debit_credit: string | null;
    narration: string | null;
    is_duplicate: boolean | null;
    is_failed: boolean | null;
    is_valid: boolean | null;
    validation_notes: string[] | unknown;
  }>;
};
```

### Transactions

Use this to get transaction IDs, especially for Money Trail:

```txt
GET /api/v1/statements/{id}/transactions?page=1&page_size=50
```

Transaction type:

```ts
type BackendTransaction = {
  id: string;
  date: string | null;
  sender_account: string | null;
  receiver_account: string | null;
  amount: number | null;
  txn_type: string | null;
  upi_id: string | null;
  narration: string | null;
  narration_normalized: string | null;
  balance: number | null;
  bank_name: string | null;
  reference_number: string | null;
  debit_credit: "CREDIT" | "DEBIT" | string | null;
  platform: string | null;
  is_duplicate: boolean | null;
  is_failed: boolean | null;
  is_valid: boolean | null;
  confidence_score: number | null;
  validation_notes: string[] | unknown;
};
```

### Investigation Case ID Rule

For investigation, summary, and report endpoints:

```txt
case_id = "all" | statement_id
```

Use `"all"` for whole-network analysis. Use a real `statement_id` when user wants scoped analysis for one uploaded statement.

### Round Trip Detection

Circular chains:

```txt
GET /api/v1/investigations/{case_id}/round-trips
```

Round-trip explanation:

```txt
GET /api/v1/investigations/{case_id}/round-trips/{chain_id}/explanation
```

Frontend API function names may be:

```ts
getRoundTrips(caseId)
getRoundTripExplanation(caseId, chainId)
```

Round-trip response shape may vary slightly by graph service, so adapters must be defensive:

```ts
type RoundTripsResponse = {
  count?: number;
  round_trips: Array<{
    id?: string | number;
    nodes?: string[];
    accounts?: string[];
    min_amount?: number;
    total_amount?: number;
    totalAmount?: number;
    duration?: string;
    hops?: number;
    [key: string]: unknown;
  }>;
};
```

### Money Flow Visualization

Endpoint:

```txt
GET /api/v1/investigations/{case_id}/money-flow
```

Frontend must render this as a graph visualization, not a plain list.

Response:

```ts
type MoneyFlowResponse = {
  summary: Record<string, unknown> | null;
  nodes: Array<{
    id: string;
    type?: string;
    total_in?: number;
    total_out?: number;
    is_accumulation?: boolean;
    [key: string]: unknown;
  }>;
  edges: Array<{
    source: string;
    target: string;
    total_amount?: number;
    txn_count?: number;
    [key: string]: unknown;
  }>;
};
```

Graph requirement:

- Use existing `MoneyFlowPage` visual style.
- Replace hardcoded nodes and edges.
- Compute deterministic positions for variable node count.
- Show directed edges from `source` to `target`.
- Label edges with `total_amount` and optionally `txn_count`.
- Node click updates details panel.
- If graph is large, render top 12-20 important nodes and show hidden count.

### Money Trail

Endpoint:

```txt
GET /api/v1/investigations/{case_id}/money-trail/{transaction_id}
```

How to get `transaction_id`:

```txt
GET /api/v1/statements/{id}/transactions
```

Flow:

1. Pick latest completed statement or user-selected statement.
2. Fetch transactions.
3. Filter credit transactions with `debit_credit === "CREDIT"`.
4. Let user select a credit transaction.
5. Call money-trail endpoint with selected transaction id.

Response:

```ts
type MoneyTrailResponse = {
  kind?: string;
  trail?: {
    credit_amount?: number;
    spent?: number;
    remaining?: number;
    fully_traced?: boolean;
    consumed_by?: Array<{
      debit_txn_id?: string;
      amount?: number;
      destination?: string;
      date?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
```

### Summary and Reports

Summary:

```txt
GET /api/v1/cases/{case_id}/summary
```

Reports:

```txt
GET /api/v1/reports/{case_id}/json
GET /api/v1/reports/{case_id}/pdf
GET /api/v1/reports/{case_id}/excel
GET /api/v1/reports/{case_id}/docx
```

Case summary:

```ts
type CaseSummary = {
  statements: number;
  transactions: number;
  entities: number;
  duplicates: number;
  failed_or_reversed: number;
  total_credit: number;
  total_debit: number;
  top_risks?: unknown[];
  money_flow_summary?: unknown;
};
```

Reports page must:

- Display summary/report JSON where possible.
- Provide downloadable PDF, Excel, and DOCX.
- Use direct binary URLs for PDF/Excel/DOCX.
- Use JSON envelope unwrap only for `/reports/{case_id}/json` and `/cases/{case_id}/summary`.

## Updated Ingestion Pipeline UI

Current Overview pipeline must become:

```txt
Ingestion -> OCR -> Data Cleaning -> Standardization -> Validation -> Data Base Store -> Round Trips / Money Flow / Money Trails -> Report -> PDF / Excel
```

New required nodes:

- `Standardization`, between Data Cleaning and Validation.
- `Data Base Store`, after Validation and before the three investigation branches.

Keep the existing three downstream branches:

- Round Trip Detection
- Money Flow Map
- Money Trail Trace

Keep report/export nodes after those branches.

Suggested node keys:

```ts
type PipelineNodeKey =
  | "ingestion"
  | "ocr"
  | "cleaning"
  | "standardization"
  | "validation"
  | "database"
  | "roundTrips"
  | "moneyFlow"
  | "moneyTrails"
  | "report"
  | "exportPdf"
  | "exportExcel";
```

Suggested backend stage to node mapping:

```txt
queued       -> ingestion complete, ocr queued
ocr          -> ocr running
standardize  -> standardization running
validate     -> cleaning + validation running or validation running after standardization
entities     -> database running
graph        -> database complete, roundTrips/moneyFlow/moneyTrails running
completed    -> all complete
failed       -> current running node failed, show error
```

Because backend has no separate public "data cleaning" endpoint, show Data Cleaning as part of validation/report refresh:

- Data Cleaning node should become active around `validate`.
- Validation node should call and display:

```txt
GET /api/v1/statements/{statement_id}/validation-report
```

Database Store node should complete after persisted transactions are available from:

```txt
GET /api/v1/statements/{statement_id}/transactions
```

## Page Integration Plan

### OverviewPage

Replace simulated upload pipeline with real upload/job polling.

Behavior:

1. On mount:
   - `GET /api/v1/statements`
   - `GET /api/v1/cases/all/summary`
2. On file selection/drop:
   - `POST /api/v1/statements/upload`
   - Store `job_id` and `statement_id`.
   - Store last selected case id as uploaded `statement_id`, but default analysis can remain `"all"`.
3. Poll:
   - `GET /api/v1/jobs/{job_id}/status`
4. Drive visual node states from job response.
5. When job reaches validation/completion:
   - `GET /api/v1/statements/{statement_id}/validation-report`
6. When DB store completes:
   - `GET /api/v1/statements/{statement_id}/transactions`
7. When graph/completed:
   - `GET /api/v1/investigations/{case_id}/round-trips`
   - `GET /api/v1/investigations/{case_id}/money-flow`
   - refresh summary and reports.

Summary cards should use real values:

- Extracted Tx: `caseSummary.transactions` or transaction pagination total.
- Identified Accounts/Entities: `caseSummary.entities`.
- De-Duplicated: `validationReport.summary.duplicates`.
- Failures Logged: `validationReport.summary.failed_or_reversed`.
- Loops Found: `roundTrips.count ?? roundTrips.round_trips.length`.
- Money Trails: number of credit transactions available for tracing.

### RoundTripsPage

Use:

```txt
GET /api/v1/investigations/{case_id}/round-trips
GET /api/v1/investigations/{case_id}/round-trips/{chain_id}/explanation
```

Requirements:

- Support `case_id = all` and `case_id = statement_id`.
- Show selector/toggle if there is a current statement id.
- Render returned circular chains.
- On chain select, fetch explanation when `chain_id` exists.
- Add loading, error, retry, and empty states.

Adapter:

- `id`: backend id or index.
- `flow`: `nodes` or `accounts`.
- `amount`: `total_amount`, `min_amount`, or fallback 0.
- `duration`: backend duration or `"Unknown"`.
- `whyFlagged`: explanation endpoint data if available, else generated sentence.

### MoneyFlowPage

Use:

```txt
GET /api/v1/investigations/{case_id}/money-flow
```

Requirements:

- Render graph visualization using backend `nodes` and `edges`.
- Support `case_id = all` and `case_id = statement_id`.
- Keep current visual style but replace static data.
- Node roles:
  - `is_accumulation` -> accumulator
  - `total_out > total_in` -> sender
  - otherwise receiver
- Edge direction:
  - `source` -> `target`
- Edge label:
  - currency formatted `total_amount`
  - optional `txn_count`

### MoneyTrailPage

Use:

```txt
GET /api/v1/statements/{id}/transactions
GET /api/v1/investigations/{case_id}/money-trail/{transaction_id}
```

Requirements:

- Fetch latest/user-selected statement transactions.
- Filter credit transactions.
- Let user select credit transaction.
- Fetch FIFO trail for selected transaction.
- Render source credit, spent, remaining, fully traced, and `consumed_by` debit outputs.
- Support `case_id = all` and `statement_id`.

Empty states:

- No completed statement.
- No credit transactions.
- No FIFO trail for selected transaction.

### ReportsPage / Summary Page

Use:

```txt
GET /api/v1/cases/{case_id}/summary
GET /api/v1/reports/{case_id}/json
GET /api/v1/reports/{case_id}/pdf
GET /api/v1/reports/{case_id}/excel
GET /api/v1/reports/{case_id}/docx
```

Requirements:

- Investigation/summary/report area must show report preview/summary data.
- All supported formats must be downloadable:
  - JSON
  - PDF
  - Excel
  - DOCX
- JSON can be fetched and displayed.
- PDF/Excel/DOCX must use direct download URLs.
- Add DOCX button if missing.
- Keep current report design.

### SettingsPage

Add:

- API Base URL field.
- Test Connection button.
- Persist base URL in `localStorage.finintel_api_base_url`.

Test:

```txt
GET {baseUrl}/health
GET {baseUrl}/services/health
```

## Shared Case Selection

Add small shared context or lightweight state:

```txt
frontend/src/context/FinintelDataContext.tsx
```

Store:

- `caseId`
- `setCaseId`
- `latestStatementId`
- `statements`
- `caseSummary`
- refresh functions

Default:

```txt
caseId = "all"
```

When user uploads a statement, store latest `statement_id` and allow pages to switch between:

- Whole network: `all`
- Current statement: `{statement_id}`

## Error Handling

Show backend `error.message` where available.

Specific handling:

- `415 UNSUPPORTED_MEDIA_TYPE`: show allowed file formats.
- `502 UPSTREAM_SERVICE_ERROR`: show service down / graph, trail, or report service unavailable.
- `504 TIMEOUT`: show timeout with retry.
- Empty graph/round-trip/trail: show useful empty state, not broken layout.

## Verification Plan

Run:

```txt
cd frontend
npm run lint
npm run build
npm run dev
```

Manual checks:

1. Login still works.
2. `/workspace` loads.
3. Overview shows updated nodes:
   - Ingestion
   - OCR
   - Data Cleaning
   - Standardization
   - Validation
   - Data Base Store
   - Round Trips / Money Flow / Money Trails
   - Report / PDF / Excel
4. Upload triggers real `POST /statements/upload`.
5. Job polling drives node states.
6. Validation report loads for uploaded `statement_id`.
7. Transactions load and provide transaction IDs.
8. Round Trips page calls real endpoint and explanation endpoint.
9. Money Flow page renders backend graph.
10. Money Trail page selects credit transaction and renders FIFO trail.
11. Reports/Summary downloads JSON/PDF/Excel/DOCX.
12. Backend offline states are graceful.

Backend full startup reference:

```txt
cd backend
cargo run
```

Python services for full pipeline:

```txt
ml-services/ocr        :8001
ml-services/standardize:8002
ml-services/entity     :8003
ml-services/validation :8004
ml-services/graph      :8005
ml-services/anomaly    :8007
ml-services/temporal   :8008
ml-services/trail      :8009
ml-services/report     :8010
```

