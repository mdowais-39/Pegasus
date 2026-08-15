"""Render the report data model to a .docx document."""

import io
from docx import Document
from docx.shared import Pt, Inches

from services import chart_images


def _heading(doc, text, level=1):
    doc.add_heading(text, level=level)


def _kv_table(doc, data: dict):
    table = doc.add_table(rows=0, cols=2)
    table.style = "Light Grid Accent 1"
    for k, v in data.items():
        row = table.add_row().cells
        row[0].text = str(k).replace("_", " ").title()
        row[1].text = str(v)


def _table(doc, headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Light Grid Accent 1"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = str(h)
    for r in rows:
        cells = table.add_row().cells
        for i, val in enumerate(r):
            cells[i].text = "" if val is None else str(val)


def _add_png(doc, png: bytes, width_in=5.6):
    if not png:
        return
    doc.add_picture(io.BytesIO(png), width=Inches(width_in))


def _channel_section(doc, report):
    """Payment-channel & category analytics with pie / bar / velocity charts.
    Charts embed when matplotlib is available; the data tables always render."""
    cats = report.get("category_counts") or {}
    channels = report.get("channel_breakdown") or []
    timeline = report.get("activity_timeline") or []
    if not channels and not cats:
        return

    _heading(doc, "Transaction Channels & Categories")

    # headline category tiles as a compact table
    if cats:
        label_map = [
            ("total_transactions", "Total Transactions"),
            ("credits", "Credits"), ("debits", "Debits"),
            ("atm_withdrawals", "ATM Withdrawals"),
            ("cash_deposits", "Cash Deposits"),
            ("failed_transactions", "Failed / Reversed"),
            ("digital_upi", "Digital (UPI/apps)"),
            ("cheque", "Cheque"), ("card_pos", "Card / POS"),
        ]
        _table(doc, ["Category", "Count"],
               [[lbl, cats.get(key, 0)] for key, lbl in label_map])

    # class-wise counts (BLKRTGS / NEFT / Paytm / ...) + share
    if channels:
        _heading(doc, "Class-wise Transaction Counts", level=2)
        _table(
            doc, ["Channel / Class", "Transactions", "Total Value (₹)", "Share"],
            [[c.get("channel"), c.get("count"), f"{c.get('value', 0):,.0f}",
              f"{round((c.get('share') or 0) * 100)}%"] for c in channels],
        )
        labels = [c["channel"] for c in channels]
        counts = [c["count"] for c in channels]
        _add_png(doc, chart_images.pie_png(labels, counts,
                                           "Transaction Share by Channel"))
        _add_png(doc, chart_images.bar_png(labels, counts,
                                           "Transactions per Channel/Class",
                                           xlabel="Transactions"))

    # fund velocity over time
    if timeline:
        _heading(doc, "Fund Velocity Over Time", level=2)
        _add_png(doc, chart_images.timeline_png(
            [t["date"] for t in timeline],
            [t["count"] for t in timeline],
            [t["credit"] for t in timeline],
            [t["debit"] for t in timeline],
            "Transaction Volume & Fund Movement",
        ))


def build_docx(report: dict) -> bytes:
    doc = Document()
    doc.add_heading(report.get("title", "Investigation Report"), level=0)
    doc.add_paragraph(report.get("scope") or f"Case: {report.get('case_id', 'all')}")
    if report.get("generated_at"):
        doc.add_paragraph(f"Generated: {report.get('generated_at')}")

    _heading(doc, "Executive Summary")
    _kv_table(doc, report.get("executive_summary", {}))

    _heading(doc, "Malicious Activity — Flagged Findings")
    doc.add_paragraph(report.get("flags_summary", ""))
    flagged = report.get("flagged_findings", [])
    if flagged:
        _table(
            doc,
            ["Account", "Severity", "Flags", "Evidence"],
            [[f.get("account"), f.get("severity"),
              ", ".join(f.get("tags", []) or []),
              "; ".join(f.get("reasons", []) or [])]
             for f in flagged[:20]],
        )

    dist = report.get("risk_distribution")
    if dist:
        _heading(doc, "Risk Distribution", level=2)
        _table(
            doc,
            ["Critical", "High", "Medium", "Low"],
            [[dist.get("CRITICAL", 0), dist.get("HIGH", 0),
              dist.get("MEDIUM", 0), dist.get("LOW", 0)]],
        )

    _channel_section(doc, report)

    val = report.get("validation")
    if val:
        _heading(doc, "Data Quality & Validation", level=2)
        avg = val.get("average_confidence")
        avg_str = f"{round(avg * 100, 1)}%" if isinstance(avg, (int, float)) else "N/A"
        _table(
            doc,
            ["Total", "Duplicates", "Failed/Reversed", "Invalid", "Avg Confidence"],
            [[val.get("total", 0), val.get("duplicates", 0), val.get("failed", 0),
              val.get("invalid", 0), avg_str]],
        )

    _heading(doc, "Top Suspicious Accounts")
    _table(
        doc,
        ["Account", "Risk", "Level", "Flags", "Patterns"],
        [
            [r.get("node") or r.get("account"), r.get("risk_score"),
             r.get("risk_level"),
             ", ".join(t.get("label", "") for t in (r.get("tags") or [])),
             "; ".join(r.get("patterns", []) or r.get("top_reasons", []) or [])]
            for r in report.get("top_risks", [])[:15]
        ],
    )

    _heading(doc, "Round-Trip / Circular Flows")
    _table(
        doc,
        ["Chain", "Path", "Bottleneck", "Total"],
        [
            [c.get("id"), " -> ".join(c.get("nodes", [])),
             c.get("min_amount"), c.get("total_amount")]
            for c in report.get("round_trips", [])[:15]
        ],
    )

    _heading(doc, "Money Flow")
    mf = report.get("money_flow", {})
    doc.add_paragraph(f"Destination account: {mf.get('destination_account')}")
    _table(
        doc,
        ["Accumulation Account", "Total Received", "Senders"],
        [[a.get("node"), a.get("total_received"), a.get("sender_count")]
         for a in mf.get("accumulation_accounts", [])[:10]],
    )

    lay = mf.get("layering", [])[:10]
    if lay:
        _heading(doc, "Layering / Pass-Through Accounts", level=2)
        _table(
            doc,
            ["Account", "Total In", "Total Out", "Pass-Through"],
            [[a.get("node"), a.get("total_in"), a.get("total_out"),
              f"{round((a.get('passthrough_ratio') or 0) * 100)}%"]
             for a in lay],
        )

    cash = report.get("cash_locations", [])[:40]
    if cash:
        _heading(doc, "Cash Withdrawal / Deposit Locations")
        _table(
            doc,
            ["City", "State", "Direction", "Amount", "Date", "Time"],
            [[c.get("city"), c.get("state"), c.get("direction"),
              c.get("amount"), c.get("date"), c.get("time")]
             for c in cash],
        )

    entities = report.get("top_entities", [])[:20]
    if entities:
        _heading(doc, "Resolved Entities")
        _table(
            doc,
            ["Type", "Identifier", "Display Name"],
            [[e.get("entity_type"), e.get("identifier"), e.get("display_name")]
             for e in entities],
        )

    _heading(doc, "Recommendations")
    for rec in report.get("recommendations", []):
        p = doc.add_paragraph(style="List Bullet")
        run = p.add_run(rec)
        run.font.size = Pt(11)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
