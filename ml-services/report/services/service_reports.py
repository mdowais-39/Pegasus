"""
Per-service investigation reports — Round Trips, Money Flow, Money Trail — each
scoped to a single statement or the whole network, with the full detail the
corresponding UI shows, structured for investigation.

Produces the generic "doc" (see generic_render) which is then rendered to
JSON / PDF / Excel / DOCX.
"""

import datetime
import json
import os
import urllib.request

from services.postgres_loader import PostgresLoader
from services.location_parser import parse_location, is_cash_narration

GRAPH_URL = os.getenv("GRAPH_URL", "http://localhost:8005")
TRAIL_URL = os.getenv("TRAIL_URL", "http://localhost:8009")

_loader = PostgresLoader()

SERVICES = ("round-trips", "money-flow", "money-trail")


def _get(url, timeout=40):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        print(f"[INFO] service-report fetch failed ({url}): {exc}")
        return {}


def _money(x):
    try:
        return f"Rs {float(x):,.0f}"
    except Exception:
        return "" if x is None else str(x)


def _now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _scope_label(case_id):
    return "Whole Network (all statements)" if case_id == "all" else f"Single statement: {case_id}"


def _analysis(case_id):
    if case_id == "all":
        return _get(f"{GRAPH_URL}/flow/analyze/all")
    return _get(f"{GRAPH_URL}/flow/analyze/statement/{case_id}")


# ------------------------------------------------------------------ round trips
def _round_trips_doc(case_id):
    a = _analysis(case_id)
    trips = a.get("round_trips", []) if isinstance(a, dict) else []

    chain_rows = []
    hop_rows = []
    for t in trips:
        nodes = t.get("nodes", [])
        cid = t.get("id")
        chain_rows.append([
            f"#{cid}",
            " -> ".join(nodes + ([nodes[0]] if nodes else [])),
            t.get("length"),
            _money(t.get("min_amount")),
            _money(t.get("total_amount")),
        ])
        amts = t.get("edge_amounts") or []
        for i, n in enumerate(nodes):
            nxt = nodes[(i + 1) % len(nodes)] if nodes else ""
            amt = amts[i] if i < len(amts) else None
            hop_rows.append([f"#{cid}", n, nxt, _money(amt)])

    total_circulated = sum(t.get("min_amount", 0) or 0 for t in trips)
    return {
        "title": "Round-Trip Investigation Report",
        "scope": _scope_label(case_id),
        "generated_at": _now(),
        "subtitle": f"{len(trips)} circular / round-trip chain(s) detected. "
                    f"Bottleneck (circulatable) total: {_money(total_circulated)}.",
        "sections": [
            {"heading": "Detected Round Trips", "kind": "table",
             "columns": ["Chain", "Path", "Hops", "Bottleneck", "Total"],
             "rows": chain_rows, "widths": [0.7, 5.0, 0.9, 1.6, 1.6],
             "right_cols": [3, 4], "empty": "No round trips detected in this scope."},
            {"heading": "Per-Hop Transfers", "kind": "table",
             "columns": ["Chain", "From", "To", "Amount"],
             "rows": hop_rows, "widths": [0.8, 3.2, 3.2, 1.6], "right_cols": [3],
             "empty": "No hop-level detail available."},
        ],
    }


# -------------------------------------------------------------------- money flow
def _money_flow_doc(case_id):
    a = _analysis(case_id)
    summary = a.get("summary", {}) if isinstance(a, dict) else {}
    graph = a.get("graph", {}) if isinstance(a, dict) else {}
    edges = graph.get("edges", []) or []
    nodes = graph.get("nodes", []) or []

    top_edges = sorted(edges, key=lambda e: e.get("total_amount", 0) or 0, reverse=True)[:40]
    edge_rows = [[
        e.get("source"), e.get("target"), _money(e.get("total_amount")),
        e.get("txn_count"),
        f"{e.get('first_date') or ''} - {e.get('last_date') or ''}".strip(" -"),
    ] for e in top_edges]

    acc_rows = [[a2.get("node"), _money(a2.get("total_received")), a2.get("sender_count")]
                for a2 in (summary.get("accumulation_accounts") or [])[:15]]
    src_rows = [[s.get("node"), _money(s.get("total_sent")), s.get("receiver_count")]
                for s in (summary.get("source_accounts") or [])[:15]]
    lay_rows = [[l.get("node"), _money(l.get("total_in")), _money(l.get("total_out")),
                 f"{round((l.get('passthrough_ratio') or 0) * 100)}%"]
                for l in (summary.get("layering") or [])[:15]]

    return {
        "title": "Money-Flow Investigation Report",
        "scope": _scope_label(case_id),
        "generated_at": _now(),
        "subtitle": f"Network of {summary.get('node_count', len(nodes))} account(s) "
                    f"and {summary.get('edge_count', len(edges))} transfer route(s).",
        "sections": [
            {"heading": "Flow Summary", "kind": "kv", "data": {
                "destination_account": summary.get("destination_account"),
                "node_count": summary.get("node_count", len(nodes)),
                "edge_count": summary.get("edge_count", len(edges)),
                "unresolved_counterparties": summary.get("unresolved_counterparties"),
            }},
            {"heading": "Accumulation Accounts (money collects here)", "kind": "table",
             "columns": ["Account", "Total Received", "Senders"], "rows": acc_rows,
             "widths": [4, 2.5, 1.5], "right_cols": [1, 2], "empty": "None."},
            {"heading": "Source Accounts (money originates here)", "kind": "table",
             "columns": ["Account", "Total Sent", "Receivers"], "rows": src_rows,
             "widths": [4, 2.5, 1.5], "right_cols": [1, 2], "empty": "None."},
            {"heading": "Layering / Pass-Through Accounts", "kind": "table",
             "columns": ["Account", "In", "Out", "Pass-Through"], "rows": lay_rows,
             "widths": [4, 2, 2, 1.6], "right_cols": [1, 2, 3], "empty": "None."},
            {"heading": "Top Transfers (routes by amount)", "kind": "table",
             "columns": ["From", "To", "Amount", "Txns", "Active Dates"], "rows": edge_rows,
             "widths": [2.8, 2.8, 1.6, 0.8, 2.0], "right_cols": [2, 3],
             "empty": "No transfers found."},
        ],
    }


# ------------------------------------------------------------------- money trail
def _statement_trails(sid):
    data = _get(f"{TRAIL_URL}/trail/statement/{sid}")
    return data.get("trails", []) if isinstance(data, dict) else []


def _cash_loc(narration):
    if is_cash_narration(narration):
        p = parse_location(narration)
        if p["location"]["city"] != "Unknown":
            return f"{p['location']['city']}, {p['location']['state']}"
    return ""


def _ledger_row(label, txn, meta, is_credit):
    """One bank-ledger row from full DB detail (falling back to trail meta)."""
    date = txn.get("date") or meta.get("credit_date") or meta.get("date")
    time = txn.get("time")
    dt = f"{date or ''} {time or ''}".strip()
    narr = txn.get("narration") or meta.get("narration") or ""
    ref = txn.get("reference_number") or ""
    dc = (txn.get("debit_credit") or "").upper()
    amt = txn.get("amount")
    debit = _money(amt) if dc == "DEBIT" else ""
    credit = _money(amt) if dc == "CREDIT" else ""
    if not debit and not credit:  # txn not in index -> use trail amount
        m = meta.get("credit_amount") if is_credit else meta.get("amount")
        if is_credit:
            credit = _money(m)
        else:
            debit = _money(m)
    bal = _money(txn.get("balance")) if txn.get("balance") is not None else ""
    return [label, dt, date, narr, ref, debit, credit, bal, _cash_loc(narr)]


def _money_trail_doc(case_id):
    sids = _loader.all_statement_ids() if case_id == "all" else [case_id]

    credit_rows, dispersion_rows, ledger_rows = [], [], []
    total_credit = 0.0
    trail_no = 0
    for sid in sids:
        trails = _statement_trails(sid)
        txn_index = {r["id"]: r for r in _loader.transactions_full(sid)}
        for tr in trails:
            trail_no += 1
            camt = tr.get("credit_amount", 0) or 0
            total_credit += camt
            credit_rows.append([
                f"#{trail_no}", tr.get("credit_date"), tr.get("source") or "Unresolved",
                _money(camt), _money(tr.get("spent")), _money(tr.get("remaining")),
                "Yes" if tr.get("fully_traced") else "No",
            ])
            # bank-ledger: the credit line, then each debit that consumed it
            cid = str(tr.get("credit_txn_id") or "")
            ledger_rows.append(_ledger_row(f"Credit #{trail_no}", txn_index.get(cid, {}), tr, True))
            for c in tr.get("consumed_by", []) or []:
                narr = c.get("narration")
                dispersion_rows.append([
                    f"#{trail_no}", c.get("date"),
                    c.get("destination") or (narr or "")[:40],
                    _money(c.get("amount")), _cash_loc(narr),
                ])
                did = str(c.get("debit_txn_id") or "")
                ledger_rows.append(_ledger_row(f"  -> #{trail_no}", txn_index.get(did, {}), c, False))

    return {
        "title": "Money-Trail (FIFO) Investigation Report",
        "scope": _scope_label(case_id),
        "generated_at": _now(),
        "subtitle": f"{len(credit_rows)} credit inflow(s) traced FIFO to their outflows. "
                    f"Total credited: {_money(total_credit)}. Prepared for onward bank investigation.",
        "sections": [
            {"heading": "Credit Inflows (traced)", "kind": "table",
             "columns": ["Trail", "Credit Date", "Source", "Credited", "Spent", "Remaining", "Fully Traced"],
             "rows": credit_rows, "widths": [0.7, 1.4, 2.8, 1.4, 1.4, 1.4, 1.1],
             "right_cols": [3, 4, 5], "empty": "No credit inflows to trace in this scope."},
            {"heading": "Full Transaction Ledger (for bank investigation)", "kind": "table",
             "columns": ["Trail", "Date & Time", "Value Date", "Transaction Details",
                         "Cheque/Ref No", "Debit", "Credit", "Balance", "Cash Location"],
             "rows": ledger_rows, "widths": [1.0, 1.5, 1.1, 3.0, 1.3, 1.2, 1.2, 1.3, 1.5],
             "right_cols": [5, 6, 7], "empty": "No ledger detail available."},
            {"heading": "Dispersion Summary (where each credit went)", "kind": "table",
             "columns": ["Trail", "Debit Date", "Destination", "Amount", "Cash Location"],
             "rows": dispersion_rows, "widths": [0.8, 1.4, 3.6, 1.4, 2.2],
             "right_cols": [3], "empty": "No dispersion recorded."},
        ],
    }


def build_service_doc(service, case_id):
    if service == "round-trips":
        return _round_trips_doc(case_id)
    if service == "money-flow":
        return _money_flow_doc(case_id)
    if service == "money-trail":
        return _money_trail_doc(case_id)
    raise ValueError(f"unknown service '{service}'")
