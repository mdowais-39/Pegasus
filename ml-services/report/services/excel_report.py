"""Render the report data model to an .xlsx workbook (Core Requirement 6)."""

import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.chart import PieChart, BarChart, LineChart, Reference

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


def _channels_sheet(wb, report):
    """Channel/category counts + native Excel pie, bar and velocity charts."""
    channels = report.get("channel_breakdown") or []
    cats = report.get("category_counts") or {}
    timeline = report.get("activity_timeline") or []
    if not channels and not cats:
        return

    ws = _sheet(wb, "Channels & Categories")

    # headline category counts
    ws["A1"] = "Category Counts"
    ws["A1"].font = _TITLE_FONT
    _header_row(ws, ["Category", "Count"], row=2)
    label_map = [
        ("total_transactions", "Total Transactions"),
        ("credits", "Credits"), ("debits", "Debits"),
        ("atm_withdrawals", "ATM Withdrawals"), ("cash_deposits", "Cash Deposits"),
        ("failed_transactions", "Failed / Reversed"),
        ("digital_upi", "Digital (UPI/apps)"), ("cheque", "Cheque"),
        ("card_pos", "Card / POS"),
    ]
    r = 3
    for key, lbl in label_map:
        ws.cell(row=r, column=1, value=lbl)
        ws.cell(row=r, column=2, value=cats.get(key, 0))
        r += 1

    # class-wise channel table (anchored so charts can reference it)
    ch_hdr = r + 1
    ws.cell(row=ch_hdr, column=1, value="Class-wise Transaction Counts").font = _TITLE_FONT
    ch_hdr += 1
    _header_row(ws, ["Channel / Class", "Transactions", "Total Value"], row=ch_hdr)
    first = ch_hdr + 1
    row = first
    for c in channels:
        ws.cell(row=row, column=1, value=c.get("channel"))
        ws.cell(row=row, column=2, value=c.get("count"))
        ws.cell(row=row, column=3, value=c.get("value"))
        row += 1
    last = row - 1
    _autosize(ws)

    if channels and last >= first:
        cats_ref = Reference(ws, min_col=1, min_row=first, max_row=last)
        cnt_ref = Reference(ws, min_col=2, min_row=ch_hdr, max_row=last)  # incl header

        pie = PieChart()
        pie.title = "Transaction Share by Channel"
        pie.add_data(cnt_ref, titles_from_data=True)
        pie.set_categories(cats_ref)
        pie.height, pie.width = 8, 13
        ws.add_chart(pie, "E2")

        bar = BarChart()
        bar.type = "bar"
        bar.title = "Transactions per Channel/Class"
        bar.add_data(cnt_ref, titles_from_data=True)
        bar.set_categories(cats_ref)
        bar.legend = None
        bar.height, bar.width = 8, 13
        ws.add_chart(bar, "E19")

    # fund-velocity timeline on its own sheet (dates can be many)
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

        line = LineChart()
        line.title = "Fund Movement Over Time (Credit vs Debit)"
        line.add_data(Reference(tw, min_col=3, max_col=4, min_row=1, max_row=n),
                      titles_from_data=True)
        line.set_categories(dates_ref)
        line.height, line.width = 9, 18
        tw.add_chart(line, "F2")

        vol = BarChart()
        vol.title = "Transaction Count Over Time"
        vol.add_data(Reference(tw, min_col=2, min_row=1, max_row=n),
                     titles_from_data=True)
        vol.set_categories(dates_ref)
        vol.legend = None
        vol.height, vol.width = 9, 18
        tw.add_chart(vol, "F21")


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
