# 🕵️ FinIntel Investigator Workspace — Frontend Developer Documentation

This document provides a comprehensive overview of the **FinIntel React Frontend**, including its visual design system, layout standards, routing structure, state management, API integration, and user workflows.

---

## 🎨 Visual Design System & Aesthetics

The FinIntel Investigator Workspace uses a bespoke, premium **dark theme** optimized for law enforcement officers and forensic analysts who require high scannability during long investigation sessions.

### 1. Typography & Hierarchy
*   **Font Families:** Primary typography is set to [Outfit](https://fonts.google.com/specimen/Outfit) (for sleek headers, scores, and metrics) paired with [Inter](https://fonts.google.com/specimen/Inter) (for highly legible data grids and transaction details).
*   **Size Scales:** Curated typographic scale from micro-labels (`0.75rem`) up to hero statistics (`2.5rem`) with generous line-heights to prevent grid fatigue.

### 2. Core Color Palette (HSL & Transparency)
Designed using tailored HSL color tokens for seamless alpha transparency overlays:
*   `--background`: `240 10% 3.9%` (Deep Obsidian Black)
*   `--card`: `240 10% 6%` (Subtle dark gray panels)
*   `--primary`: `263.4 70% 50.4%` (High-contrast Neon Violet)
*   `--accent`: `280 80% 60%` (Vibrant Indigo-Purple accents)
*   `--risk-high`: `0 84.2% 60.2%` (Alert Red)
*   `--risk-medium`: `38 92% 50%` (Caution Amber)
*   `--risk-low`: `142.1 76.2% 36.3%` (Safe Emerald Green)

### 3. Visual Components & Styling
*   **Glassmorphism Panels:** Main cards use semi-transparent backdrops (`background: rgba(15, 15, 20, 0.65)`) with a backdrop blur filter (`backdrop-filter: blur(12px)`) and thin, light-emitting borders (`border: 1px solid rgba(255, 255, 255, 0.08)`).
*   **Emulated Window Controls:** Interactive cards and workspace modules feature a macOS-style window controls header (trio of flat red, yellow, and green circular dots) to convey a native application workspace feel.
*   **Micro-Animations:** Clean CSS transitions (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) applied to hover states, sidebar links, list items, and upload dropzones for fluid visual response.

---

## 🧭 Routing Schema & Workspace Layout

The application's client-side routing is declared inside [App.tsx](file:///C:/Users/Willis/OneDrive/Documents/Hackathons/CIDECODE/AI-Powered-Financial-Crime-Investigation-Platform/frontend/src/App.tsx) using `react-router-dom` v6. 

### 1. Main Navigation Hierarchy
*   **Public Portal Landing:** `/` — Interactive promotional entry point demonstrating the platform value and core capabilities.
*   **Identity Verification:** `/login` — Secure entry point to authenticate investigators and load workspace states.
*   **Investigator Workspace:** `/workspace` — The central, authenticated dashboard layout. All core analytical views render inside the `/workspace` layout container.

### 2. Workspace Subpages (Sub-routes)
Nested within the [WorkspaceLayout](file:///C:/Users/Willis/OneDrive/Documents/Hackathons/CIDECODE/AI-Powered-Financial-Crime-Investigation-Platform/frontend/src/components/WorkspaceLayout.tsx) layout shell:
*   **Overview Dashboard:** `/workspace` — Ingestion dropzone, active statements list, active case info, and system health status monitor.
*   **Round-Trips Analysis:** `/workspace/round-trips` — Displays detected circular-flow/layering loops with path lengths, transaction logs, and LLM-generated narrative summaries.
*   **Money-Flow Graph:** `/workspace/money-flow` — Force-directed entity-relationship network visualizer showing cash accumulation, layering, and transfer pipelines.
*   **Money-Trail Tracking:** `/workspace/money-trail` — Traces credit deposits down to their component debits in sequence using FIFO flow tracking.
*   **Investigation Reports:** `/workspace/reports` — Generate, customize, email, or download full-scale DOCX, PDF, and Excel reports.
*   **System Settings:** `/workspace/settings` — Configure database connection strings, model parameters, API endpoints, and clean mock databases.

