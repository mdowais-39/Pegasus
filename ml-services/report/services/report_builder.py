"""
ReportBuilder — assembles the investigation report data model from the DB
(counts, validation, entities) + the graph service (money-flow, round-trips,
risk). Graph enrichment is best-effort so a report is always produced.
"""

import datetime
import json
import os
import urllib.request

from services.postgres_loader import PostgresLoader
from services.location_parser import parse_location
from services import persistence
from services import channel_analytics

GRAPH_URL = os.getenv("GRAPH_URL", "http://localhost:8005")


def _get(url, timeout=30):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        print(f"[INFO] report graph fetch failed ({url}): {exc}")
        return {}


class ReportBuilder:

    def __init__(self):
        self.loader = PostgresLoader()

    def build(self, case_id="all", refresh=False):
        if not refresh:
            cached = persistence.load(case_id, "report")
            if cached:
                return cached

        scoped = case_id and case_id != "all"
        stmt = case_id if scoped else None

        counts = self.loader.summary_counts(stmt)
        validation = self.loader.validation_summary(stmt)
        entities = self.loader.top_entities(25)
        cash_locations = self._cash_locations(stmt)
        analytics = channel_analytics.compute(
            self.loader.transactions_for_analytics(stmt))

        # Risk + flow must follow the SAME scope as the counts above:
        #  - scoped: this statement's transactions only.
        #  - all   : the whole network, but via the *representative* ranking so
        #    every statement's top suspicious accounts are guaranteed to appear
        #    (a plain global top-N buries smaller statements under global
        #    volume normalization).
        if scoped:
            analysis = _get(f"{GRAPH_URL}/flow/analyze/statement/{case_id}")
            risks = _get(f"{GRAPH_URL}/risk/top/statement/{case_id}?limit=20")
        else:
            analysis = _get(f"{GRAPH_URL}/flow/analyze/all")
            risks = _get(f"{GRAPH_URL}/risk/top/representative?limit=25")

        mf = analysis.get("summary", {}) if isinstance(analysis, dict) else {}
        round_trips = analysis.get("round_trips", []) if isinstance(analysis, dict) else []
        communities = analysis.get("communities", []) if isinstance(analysis, dict) else []
        top_risks = risks.get("top_risks", []) if isinstance(risks, dict) else []

        report = {
            "title": "Financial Crime Investigation Report",
            "case_id": case_id,
            "scope": "Whole Network (all statements)" if not scoped
                     else f"Single statement: {case_id}",
            "generated_at": datetime.datetime.now(datetime.timezone.utc)
                            .strftime("%Y-%m-%d %H:%M UTC"),
            "risk_distribution": self._risk_distribution(top_risks),
            "flagged_findings": self._flagged_findings(top_risks),
            "flags_summary": self._flags_summary(self._flagged_findings(top_risks)),
            "executive_summary": {
                "statements": counts.get("statements", 0),
                "transactions": counts.get("transactions", 0),
                "entities": counts.get("entities", 0),
                "duplicates": counts.get("duplicates", 0),
                "failed_or_reversed": counts.get("failed", 0),
                "total_credit": counts.get("total_credit", 0.0),
                "total_debit": counts.get("total_debit", 0.0),
                "round_trips_detected": len(round_trips),
                "communities_detected": len(communities),
                "high_risk_accounts": sum(
                    1 for r in top_risks if r.get("risk_level") in ("HIGH", "CRITICAL")
                ),
            },
            "money_flow": {
                "destination_account": mf.get("destination_account"),
                "accumulation_accounts": mf.get("accumulation_accounts", [])[:10],
                "source_accounts": mf.get("source_accounts", [])[:10],
                "fan_in": mf.get("fan_in", [])[:10],
                "fan_out": mf.get("fan_out", [])[:10],
                "layering": mf.get("layering", [])[:10],
            },
            "round_trips": round_trips[:25],
            "top_risks": top_risks,
            "top_entities": entities,
            "cash_locations": cash_locations,
            "channel_breakdown": analytics["channel_breakdown"],
            "category_counts": analytics["categories"],
            "activity_timeline": analytics["timeline"],
            "validation": validation,
            "recommendations": self._recommendations(mf, round_trips, top_risks, validation),
        }
        persistence.save(case_id, "report", report)
        return report

    def _cash_locations(self, statement_id):
        """Physical ATM / cash withdrawal & deposit sites (city, state) — the
        leads list for officers. Parsed deterministically from narrations."""
        out = []
        for r in self.loader.cash_transactions(statement_id):
            parsed = parse_location(r.get("narration"))
            loc = parsed["location"]
            if loc["city"] == "Unknown":
                continue
            out.append({
                "city": loc["city"],
                "state": loc["state"],
                "amount": float(r.get("amount") or 0),
                "date": r.get("date"),
                "time": r.get("time") if r.get("time")
                        else (parsed["time"] if parsed["time"] != "Unknown" else None),
                "direction": r.get("debit_credit"),
                "narration": r.get("narration"),
            })
        return out

    def _flagged_findings(self, top_risks):
        """HIGH/CRITICAL accounts distilled into investigator-facing findings —
        severity, plain-language flags, evidence and source statement."""
        out = []
        for r in top_risks or []:
            level = r.get("risk_level")
            if level not in ("HIGH", "CRITICAL"):
                continue
            pt = r.get("passthrough") or {}
            out.append({
                "account": r.get("node") or r.get("account"),
                "severity": level,
                "risk_score": r.get("risk_score"),
                "tags": [t.get("label") for t in (r.get("tags") or [])],
                "reasons": r.get("top_reasons") or [],
                "passthrough_latency_min": pt.get("avg_latency_min"),
                "source_statement": r.get("source_statement"),
            })
        return out

    def _flags_summary(self, flagged):
        if not flagged:
            return "No accounts flagged for malicious activity."
        crit = sum(1 for f in flagged if f["severity"] == "CRITICAL")
        high = sum(1 for f in flagged if f["severity"] == "HIGH")
        return (f"{len(flagged)} account(s) flagged for malicious activity "
                f"({crit} critical, {high} high).")

    def _risk_distribution(self, top_risks):
        dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for r in top_risks or []:
            level = r.get("risk_level")
            if level in dist:
                dist[level] += 1
        return dist

    def _recommendations(self, mf, round_trips, top_risks, validation):
        recs = []
        if round_trips:
            recs.append(
                f"Investigate {len(round_trips)} circular/round-trip chain(s); "
                "these strongly indicate layering."
            )
        dest = mf.get("destination_account")
        if dest:
            recs.append(
                f"Scrutinize destination account {dest} where funds accumulate."
            )
        crit = [r for r in top_risks if r.get("risk_level") == "CRITICAL"]
        if crit:
            names = ", ".join(str(r.get("node")) for r in crit[:5])
            recs.append(f"Prioritize CRITICAL-risk accounts: {names}.")
        if validation.get("failed"):
            recs.append(
                f"Review {validation['failed']} failed/reversed transactions for "
                "intentional probing or refunds."
            )
        if not recs:
            recs.append("No high-priority red flags detected in the current dataset.")
        return recs
