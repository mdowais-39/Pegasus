"""Render the report data model to an .xlsx workbook (Core Requirement 6)."""

import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.chart import PieChart, BarChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList

_HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
_HEADER_FONT = Font(bold=True, color="FFFFFF")
_TITLE_FONT = Font(bold=True, size=14)


def _sheet(wb, title):
    ws = wb.create_sheet(title=title[:31])
    return ws


def _header_row(ws, headers, row=1):
    for col, h in enumerate(headers, start=1):
        c = ws.cell(row=row, column=col, value=h)
        c.font = _HEADER_FONT
        c.fill = _HEADER_FILL


def _autosize(ws):
    for col in ws.columns:
        width = max((len(str(c.value)) for c in col if c.value is not None), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(60, width + 2)


# --------------------------------------------------------------------------
# Chart helpers — the previous charts were unreliable because data, headers and
# the charts themselves were crammed onto one sheet with references that drifted
# off by a row. Each chart now owns a CLEAN 2-column data block (header row +
# label/value rows) placed in columns A:B, with the chart anchored well clear in
# column D. References are derived from the exact block, so labels and values
# always line up.
# --------------------------------------------------------------------------
def _write_block(ws, header, pairs, top_row=1, label_col=1):
    """Write [header] then (label, value) rows in two adjacent columns.
    Returns (cats_ref, data_ref) — data_ref includes the header cell so
    `titles_from_data=True` names the series."""
    vcol = label_col + 1
    ws.cell(row=top_row, column=label_col, value=header[0]).font = _HEADER_FONT
    ws.cell(row=top_row, column=label_col).fill = _HEADER_FILL
    ws.cell(row=top_row, column=vcol, value=header[1]).font = _HEADER_FONT
    ws.cell(row=top_row, column=vcol).fill = _HEADER_FILL
    r = top_row + 1
    for label, value in pairs:
        ws.cell(row=r, column=label_col, value=label)
        ws.cell(row=r, column=vcol, value=value)
        r += 1
    last = r - 1
    if last < top_row + 1:      # no data rows
        return None, None
    cats = Reference(ws, min_col=label_col, min_row=top_row + 1, max_row=last)
    data = Reference(ws, min_col=vcol, min_row=top_row, max_row=last)  # incl header
    return cats, data


def _pie(ws, anchor, title, cats, data):
    ch = PieChart()
    ch.title = title
    ch.add_data(data, titles_from_data=True)
    ch.set_categories(cats)
    ch.dataLabels = DataLabelList()
    ch.dataLabels.showPercent = True
    ch.height, ch.width = 9, 15
    ws.add_chart(ch, anchor)


def _bar(ws, anchor, title, cats, data, horizontal=False, show_val=True):
    ch = BarChart()
    ch.type = "bar" if horizontal else "col"
    ch.title = title
    ch.add_data(data, titles_from_data=True)
    ch.set_categories(cats)
    ch.legend = None
    if show_val:
        ch.dataLabels = DataLabelList()
        ch.dataLabels.showVal = True
    ch.height, ch.width = 9, 16
    ws.add_chart(ch, anchor)


def _channels_sheet(wb, report):
    """Native, editable Excel charts on clean dedicated sheets."""
    channels = report.get("channel_breakdown") or []
    cats = report.get("category_counts") or {}
    timeline = report.get("activity_timeline") or []
    dist = report.get("risk_distribution") or {}
    es = report.get("executive_summary") or {}
    top_risks = [r for r in (report.get("top_risks") or []) if r.get("risk_score")][:10]
    cash_by_city = (report.get("cash_by_city") or [])[:12]

    # ---- Channel Analysis (pie share + bar counts) ----
    if channels:
        ws = _sheet(wb, "Channel Analysis")
        pairs = [(c.get("channel"), c.get("count") or 0) for c in channels]
        cref, dref = _write_block(ws, ["Channel / Class", "Transactions"], pairs)
        if cref:
            _pie(ws, "D1", "Transaction Share by Channel", cref, dref)
            _bar(ws, "D20", "Transactions per Channel / Class", cref, dref,
                 horizontal=True)
        _autosize(ws)

    # ---- Category & Risk (category bar + risk pie + credit/debit bar) ----
    if cats or dist or es.get("total_credit") or es.get("total_debit"):
        ws = _sheet(wb, "Category & Risk")
        label_map = [
            ("total_transactions", "Total Transactions"), ("credits", "Credits"),
            ("debits", "Debits"), ("atm_withdrawals", "ATM Withdrawals"),
            ("cash_deposits", "Cash Deposits"),
            ("failed_transactions", "Failed / Reversed"),
            ("digital_upi", "Digital (UPI/apps)"), ("cheque", "Cheque"),
            ("card_pos", "Card / POS"),
        ]
        cat_pairs = [(lbl, cats.get(key, 0)) for key, lbl in label_map]
        cref, dref = _write_block(ws, ["Category", "Count"], cat_pairs, top_row=1)
        if cref:
            _bar(ws, "D1", "Category Counts", cref, dref, horizontal=True)

        # risk distribution block lower down (col A), pie to its right
        risk_top = len(cat_pairs) + 4
        risk_pairs = [(lvl.title(), dist.get(lvl, 0))
                      for lvl in ("CRITICAL", "HIGH", "MEDIUM", "LOW")]
        if any(v for _, v in risk_pairs):
            cref2, dref2 = _write_block(ws, ["Risk Level", "Accounts"], risk_pairs,
                                        top_row=risk_top)
            _pie(ws, f"D{risk_top}", "Accounts by Risk Level", cref2, dref2)

        # credit vs debit block further down
        cd_top = risk_top + len(risk_pairs) + 4
        cd_pairs = [("Credit", es.get("total_credit") or 0),
                    ("Debit", es.get("total_debit") or 0)]
        if any(v for _, v in cd_pairs):
            cref3, dref3 = _write_block(ws, ["Direction", "Total Value"], cd_pairs,
                                        top_row=cd_top)
            _bar(ws, f"D{cd_top}", "Total Credit vs Debit (Rs)", cref3, dref3)
        _autosize(ws)

    # ---- Top Suspicious Accounts (bar) ----
    if top_risks:
        ws = _sheet(wb, "Top Risk Accounts")
        pairs = [(str(r.get("node") or r.get("account")), r.get("risk_score") or 0)
                 for r in top_risks]
        cref, dref = _write_block(ws, ["Account", "Risk Score"], pairs)
        if cref:
            _bar(ws, "D1", "Top Accounts by Risk Score", cref, dref, horizontal=True)
        _autosize(ws)

    # ---- Cash Hotspots by city (bar) ----
    if cash_by_city:
        ws = _sheet(wb, "Cash Hotspots")
        pairs = [(c["city"], c["count"]) for c in cash_by_city]
        cref, dref = _write_block(ws, ["City", "Cash Transactions"], pairs)
        if cref:
            _bar(ws, "D1", "Cash Transactions by City", cref, dref, horizontal=True)
        _autosize(ws)

    # ---- Fund Velocity over time (count bars + credit/debit lines) ----
    if timeline:
        tw = _sheet(wb, "Fund Velocity")
        _header_row(tw, ["Date", "Txn Count", "Credit", "Debit"], row=1)
        for i, t in enumerate(timeline, start=2):
            tw.cell(row=i, column=1, value=t.get("date"))
            tw.cell(row=i, column=2, value=t.get("count"))
            tw.cell(row=i, column=3, value=t.get("credit"))
            tw.cell(row=i, column=4, value=t.get("debit"))
        _autosize(tw)
        n = len(timeline) + 1
        dates_ref = Reference(tw, min_col=1, min_row=2, max_row=n)

        vol = BarChart()
        vol.title = "Transaction Count Over Time"
        vol.add_data(Reference(tw, min_col=2, min_row=1, max_row=n),
                     titles_from_data=True)
        vol.set_categories(dates_ref)
        vol.legend = None
        vol.height, vol.width = 8, 20
        tw.add_chart(vol, "F1")

        line = LineChart()
        line.title = "Fund Movement Over Time (Credit vs Debit)"
        line.add_data(Reference(tw, min_col=3, max_col=4, min_row=1, max_row=n),
                      titles_from_data=True)
        line.set_categories(dates_ref)
        line.height, line.width = 8, 20
        tw.add_chart(line, "F18")


def build_excel(report: dict) -> bytes:
    wb = Workbook()
    wb.remove(wb.active)  # drop default sheet

    # --- Summary ---
    ws = _sheet(wb, "Summary")
    ws["A1"] = report.get("title", "Investigation Report")
    ws["A1"].font = _TITLE_FONT
    ws["A2"] = report.get("scope") or f"Case: {report.get('case_id', 'all')}"
    if report.get("generated_at"):
        ws["A3"] = f"Generated: {report.get('generated_at')}"
    es = report.get("executive_summary", {})
    _header_row(ws, ["Metric", "Value"], row=5)
    r = 6
    for k, v in es.items():
        ws.cell(row=r, column=1, value=k.replace("_", " ").title())
        ws.cell(row=r, column=2, value=v)
        r += 1
    dist = report.get("risk_distribution") or {}
    if dist:
        r += 1
        ws.cell(row=r, column=1, value="Risk Distribution").font = _TITLE_FONT
        r += 1
        for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
            ws.cell(row=r, column=1, value=level.title())
            ws.cell(row=r, column=2, value=dist.get(level, 0))
            r += 1
    _autosize(ws)

    # --- Flagged Findings ---
    flagged = report.get("flagged_findings", [])
    ws = _sheet(wb, "Flagged Findings")
    ws["A1"] = report.get("flags_summary", "")
    ws["A1"].font = _TITLE_FONT
    _header_row(ws, ["Account", "Severity", "Risk Score", "Flags", "Evidence", "Source Statement"], row=3)
    r = 4
    for f in flagged:
        ws.cell(row=r, column=1, value=f.get("account"))
        ws.cell(row=r, column=2, value=f.get("severity"))
        ws.cell(row=r, column=3, value=f.get("risk_score"))
        ws.cell(row=r, column=4, value=", ".join(f.get("tags", []) or []))
        ws.cell(row=r, column=5, value="; ".join(f.get("reasons", []) or []))
        ws.cell(row=r, column=6, value=f.get("source_statement"))
        r += 1
    _autosize(ws)

    # --- Validation ---
    val = report.get("validation") or {}
    if val:
        ws = _sheet(wb, "Validation")
        _header_row(ws, ["Metric", "Value"])
        for k in ("total", "valid", "invalid", "duplicates", "failed",
                  "balance_mismatches", "missing_data", "average_confidence"):
            if k in val:
                ws.append([k.replace("_", " ").title(), val.get(k)])
        _autosize(ws)

    # --- Top Risks ---
    ws = _sheet(wb, "Top Risks")
    _header_row(ws, ["Account", "Risk Score", "Risk Level", "Flags", "Patterns"])
    for r in report.get("top_risks", []):
        ws.append([
            r.get("node") or r.get("account"),
            r.get("risk_score"),
            r.get("risk_level"),
            ", ".join(t.get("label", "") for t in (r.get("tags") or [])),
            "; ".join(r.get("patterns", []) or r.get("top_reasons", []) or []),
        ])
    _autosize(ws)

    # --- Round Trips ---
    ws = _sheet(wb, "Round Trips")
    _header_row(ws, ["Chain ID", "Path", "Length", "Bottleneck", "Total"])
    for c in report.get("round_trips", []):
        ws.append([
            c.get("id"),
            " -> ".join(c.get("nodes", [])),
            c.get("length"),
            c.get("min_amount"),
            c.get("total_amount"),
        ])
    _autosize(ws)

    # --- Money Flow ---
    ws = _sheet(wb, "Money Flow")
    mf = report.get("money_flow", {})
    ws.append(["Destination account", mf.get("destination_account")])
    ws.append([])
    ws.append(["Accumulation accounts"])
    _header_row(ws, ["Account", "Total Received", "Sender Count"], row=ws.max_row + 1)
    for a in mf.get("accumulation_accounts", []):
        ws.append([a.get("node"), a.get("total_received"), a.get("sender_count")])
    ws.append([])
    ws.append(["Source accounts"])
    _header_row(ws, ["Account", "Total Sent", "Receiver Count"], row=ws.max_row + 1)
    for a in mf.get("source_accounts", []):
        ws.append([a.get("node"), a.get("total_sent"), a.get("receiver_count")])
    ws.append([])
    ws.append(["Layering / Pass-through accounts"])
    _header_row(ws, ["Account", "Total In", "Total Out", "Pass-Through %"],
                row=ws.max_row + 1)
    for a in mf.get("layering", []):
        ws.append([a.get("node"), a.get("total_in"), a.get("total_out"),
                   round((a.get("passthrough_ratio") or 0) * 100)])
    _autosize(ws)

    # --- Channels & Categories (with native charts) ---
    _channels_sheet(wb, report)

    # --- Cash Locations ---
    cash = report.get("cash_locations", [])
    if cash:
        ws = _sheet(wb, "Cash Locations")
        _header_row(ws, ["City", "State", "Direction", "Amount", "Date", "Time", "Narration"])
        for c in cash:
            ws.append([c.get("city"), c.get("state"), c.get("direction"),
                       c.get("amount"), c.get("date"), c.get("time"), c.get("narration")])
        _autosize(ws)

    # --- Entities ---
    ws = _sheet(wb, "Entities")
    _header_row(ws, ["Type", "Identifier", "Display Name"])
    for e in report.get("top_entities", []):
        ws.append([e.get("entity_type"), e.get("identifier"), e.get("display_name")])
    _autosize(ws)

    # --- Recommendations ---
    ws = _sheet(wb, "Recommendations")
    _header_row(ws, ["#", "Recommendation"])
    for i, rec in enumerate(report.get("recommendations", []), start=1):
        ws.append([i, rec])
    _autosize(ws)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
