"""
Render the report data model to a PDF (Core Requirement 6, graded).

Uses reportlab (pip install reportlab). Kept dependency-isolated: the import is
inside build_pdf so the rest of the report service runs even if reportlab isn't
installed yet (the endpoint then returns a clear error).

Layout notes
------------
Every table is given explicit `colWidths` that sum to the frame width, and every
cell is a wrapped Paragraph. This is what prevents the previous bug where long
"Path"/"Patterns" strings expanded a column, pushed the whole table past the
right margin, and clipped the content. Amounts use an ASCII "Rs" prefix with
Indian digit grouping because the ₹ glyph (U+20B9) isn't in the base-14 PDF
fonts and would render as a blank box.
"""

import io


def _inr(value):
    """Format a number with Indian digit grouping and an ASCII 'Rs' prefix."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "-" if value in (None, "") else str(value)
    negative = n < 0
    n = int(round(abs(n)))
    s = str(n)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.insert(0, rest)
        s = ",".join(parts) + "," + last3
    return ("-" if negative else "") + "Rs " + s


_MONEY_KEYS = {"total_credit", "total_debit"}


def build_pdf(report: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    )

    styles = getSampleStyleSheet()
    body = styles["BodyText"]
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=18,
                                 spaceAfter=4)
    meta_style = ParagraphStyle("Meta", parent=styles["BodyText"], fontSize=9,
                                textColor=colors.HexColor("#52525B"))
    h2 = ParagraphStyle("H2c", parent=styles["Heading2"], fontSize=12,
                        textColor=colors.HexColor("#1F4E78"), spaceBefore=6,
                        spaceAfter=4)
    cell = ParagraphStyle("Cell", parent=body, fontSize=8, leading=10)
    cell_right = ParagraphStyle("CellR", parent=cell, alignment=2)  # right
    head_cell = ParagraphStyle("HeadCell", parent=cell, textColor=colors.white,
                               fontName="Helvetica-Bold")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=16 * mm, bottomMargin=16 * mm,
        leftMargin=14 * mm, rightMargin=14 * mm,
    )
    avail = doc.width  # usable frame width; colWidths always sum to this
    flow = []

    def P(text, style=cell):
        return Paragraph("" if text is None else str(text), style)

    def make_table(headers, rows, ratios, right_cols=()):
        """Build a wrapped, page-fitting table. `ratios` = relative col widths."""
        total = float(sum(ratios)) or 1.0
        col_widths = [avail * (r / total) for r in ratios]
        data = [[P(h, head_cell) for h in headers]]
        for row in rows:
            data.append([
                P(c, cell_right if i in right_cols else cell)
                for i, c in enumerate(row)
            ])
        t = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4E78")),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C4D4")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.white, colors.HexColor("#F2F6FB")]),
        ]))
        return t

    # ------------------------------------------------------------------ header
    flow.append(Paragraph(report.get("title", "Investigation Report"), title_style))
    scope = report.get("scope") or f"Case: {report.get('case_id', 'all')}"
    flow.append(Paragraph(scope, meta_style))
    if report.get("generated_at"):
        flow.append(Paragraph(f"Generated: {report.get('generated_at')}", meta_style))
    flow.append(Spacer(1, 8))

    # ---------------------------------------------------------- executive summary
    flow.append(Paragraph("Executive Summary", h2))
    es = report.get("executive_summary", {})
    es_rows = [
        [k.replace("_", " ").title(), _inr(v) if k in _MONEY_KEYS else v]
        for k, v in es.items()
    ]
    flow.append(make_table(["Metric", "Value"], es_rows, [3, 2], right_cols=(1,)))
    flow.append(Spacer(1, 8))

    # --------------------------------------------------- flagged findings (top)
    flagged = report.get("flagged_findings", [])
    flow.append(Paragraph("Malicious Activity — Flagged Findings", h2))
    flow.append(Paragraph(report.get("flags_summary", ""), body))
    flow.append(Spacer(1, 3))
    if flagged:
        flow.append(make_table(
            ["Account", "Severity", "Flags", "Evidence"],
            [[f.get("account"), f.get("severity"),
              ", ".join(f.get("tags", []) or []),
              "; ".join(f.get("reasons", []) or [])]
             for f in flagged[:20]],
            [2.4, 1.1, 2.5, 4.0],
        ))
    flow.append(Spacer(1, 8))

    # ------------------------------------------------------- risk distribution
    dist = report.get("risk_distribution") or _risk_distribution(report.get("top_risks", []))
    if dist:
        flow.append(Paragraph("Risk Distribution", h2))
        flow.append(make_table(
            ["Critical", "High", "Medium", "Low"],
            [[dist.get("CRITICAL", 0), dist.get("HIGH", 0),
              dist.get("MEDIUM", 0), dist.get("LOW", 0)]],
            [1, 1, 1, 1],
        ))
        flow.append(Spacer(1, 8))

    # ------------------------------------------------------ data quality / validation
    val = report.get("validation", {})
    if val:
        flow.append(Paragraph("Data Quality & Validation", h2))
        avg_conf = val.get("average_confidence")
        avg_conf_str = f"{round(avg_conf * 100, 1)}%" if isinstance(avg_conf, (int, float)) else "N/A"
        flow.append(make_table(
            ["Total", "Valid", "Duplicates", "Failed/Reversed", "Invalid", "Avg Confidence"],
            [[val.get("total", 0), val.get("valid", "-"), val.get("duplicates", 0),
              val.get("failed", 0), val.get("invalid", 0), avg_conf_str]],
            [1, 1, 1.2, 1.4, 1, 1.4],
        ))
        flow.append(Spacer(1, 8))

    # --------------------------------------------------------- top suspicious
    flow.append(Paragraph("Top Suspicious Accounts", h2))
    flow.append(make_table(
        ["Account", "Score", "Level", "Flags", "Patterns"],
        [[r.get("node") or r.get("account"), r.get("risk_score"), r.get("risk_level"),
          ", ".join(t.get("label", "") for t in (r.get("tags") or [])),
          "; ".join(r.get("patterns", []) or r.get("top_reasons", []) or [])]
         for r in report.get("top_risks", [])[:15]],
        [2.2, 0.8, 1.0, 2.6, 3.4], right_cols=(1,),
    ))
    flow.append(Spacer(1, 8))

    # ------------------------------------------------------------- round trips
    flow.append(Paragraph("Round-Trip / Circular Flows", h2))
    rt_rows = [
        [c.get("id"), " -> ".join(c.get("nodes", [])),
         _inr(c.get("min_amount")), _inr(c.get("total_amount"))]
        for c in report.get("round_trips", [])[:15]
    ]
    if rt_rows:
        flow.append(make_table(
            ["Chain", "Path", "Bottleneck", "Total"],
            rt_rows, [0.7, 5.0, 1.6, 1.6], right_cols=(2, 3),
        ))
    else:
        flow.append(Paragraph("No circular flows detected in this scope.", body))
    flow.append(Spacer(1, 8))

    # -------------------------------------------------------------- money flow
    flow.append(Paragraph("Money Flow", h2))
    mf = report.get("money_flow", {})
    flow.append(Paragraph(
        f"Primary destination (accumulation) account: "
        f"<b>{mf.get('destination_account') or 'None identified'}</b>", body))
    flow.append(Spacer(1, 3))
    acc = mf.get("accumulation_accounts", [])[:10]
    if acc:
        flow.append(make_table(
            ["Accumulation Account", "Total Received", "Senders"],
            [[a.get("node"), _inr(a.get("total_received")), a.get("sender_count")]
             for a in acc],
            [4, 2.5, 1.5], right_cols=(1, 2),
        ))
        flow.append(Spacer(1, 6))
    lay = mf.get("layering", [])[:10]
    if lay:
        flow.append(Paragraph("Layering / Pass-Through Accounts", h2))
        flow.append(make_table(
            ["Account", "In", "Out", "Pass-Through"],
            [[a.get("node"), _inr(a.get("total_in")), _inr(a.get("total_out")),
              f"{round((a.get('passthrough_ratio') or 0) * 100)}%"]
             for a in lay],
            [4, 2, 2, 1.6], right_cols=(1, 2, 3),
        ))
        flow.append(Spacer(1, 8))

    # -------------------------------------------- channels & categories + charts
    from reportlab.platypus import Image as RLImage
    from services import chart_images

    channels = report.get("channel_breakdown", []) or []
    cats = report.get("category_counts", {}) or {}
    timeline = report.get("activity_timeline", []) or []
    if channels or cats:
        flow.append(Paragraph("Transaction Channels & Categories", h2))
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
            flow.append(make_table(
                ["Category", "Count"],
                [[lbl, cats.get(key, 0)] for key, lbl in label_map],
                [3, 1], right_cols=(1,),
            ))
            flow.append(Spacer(1, 6))

        if channels:
            flow.append(Paragraph("Class-wise Transaction Counts", h2))
            flow.append(make_table(
                ["Channel / Class", "Transactions", "Total Value", "Share"],
                [[c.get("channel"), c.get("count"), _inr(c.get("value")),
                  f"{round((c.get('share') or 0) * 100)}%"] for c in channels],
                [2.5, 1.5, 2.0, 1.0], right_cols=(1, 2, 3),
            ))
            flow.append(Spacer(1, 6))

            labels = [c["channel"] for c in channels]
            counts = [c["count"] for c in channels]
            for png in (chart_images.pie_png(labels, counts, "Share by Channel"),
                        chart_images.bar_png(labels, counts, "Transactions per Channel")):
                if png:
                    flow.append(RLImage(io.BytesIO(png), width=avail * 0.72,
                                        height=avail * 0.72 * 0.62))
                    flow.append(Spacer(1, 4))

        if timeline:
            png = chart_images.timeline_png(
                [t["date"] for t in timeline], [t["count"] for t in timeline],
                [t["credit"] for t in timeline], [t["debit"] for t in timeline],
                "Fund Velocity Over Time")
            if png:
                flow.append(Paragraph("Fund Velocity Over Time", h2))
                flow.append(RLImage(io.BytesIO(png), width=avail,
                                    height=avail * 0.46))
        flow.append(Spacer(1, 8))

    # ------------------------------------------------------- cash locations
    cash = report.get("cash_locations", [])[:30]
    if cash:
        flow.append(Paragraph("Cash Withdrawal / Deposit Locations", h2))
        flow.append(make_table(
            ["City", "State", "Direction", "Amount", "Date / Time"],
            [[c.get("city"), c.get("state"), c.get("direction"),
              _inr(c.get("amount")),
              f"{c.get('date') or ''} {c.get('time') or ''}".strip()]
             for c in cash],
            [2.2, 2.4, 1.2, 1.6, 2.6], right_cols=(3,),
        ))
        flow.append(Spacer(1, 8))

    # ---------------------------------------------------------------- entities
    entities = report.get("top_entities", [])[:20]
    if entities:
        flow.append(Paragraph("Resolved Entities", h2))
        flow.append(make_table(
            ["Type", "Identifier", "Display Name"],
            [[e.get("entity_type"), e.get("identifier"), e.get("display_name")]
             for e in entities],
            [1.6, 3.2, 3.2],
        ))
        flow.append(Spacer(1, 8))

    # --------------------------------------------------------- recommendations
    flow.append(Paragraph("Recommendations", h2))
    for rec in report.get("recommendations", []):
        flow.append(Paragraph(f"&bull; {rec}", body))

    doc.build(flow)
    return buf.getvalue()


def _risk_distribution(top_risks):
    dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in top_risks or []:
        level = r.get("risk_level")
        if level in dist:
            dist[level] += 1
    return dist
