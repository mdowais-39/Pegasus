"""
Reconstruct reading-order text lines from positioned OCR boxes.

PaddleOCR returns one box per detected text span as
``{"text": str, "bbox": [[x,y],...], "confidence": float}``. Downstream
statement reconstruction (TextStatementReconstructor) expects page *text* — the
same shape a text-based PDF produces — so this module clusters boxes into
horizontal lines by vertical position and orders each line left-to-right.

This is what makes images / scanned PDFs flow through the *exact same* pipeline
as text PDFs (OCR text -> page string -> reconstructor -> structured rows).
"""

from __future__ import annotations


def _box_geometry(bbox):
    """Return (min_x, center_y, height) for a 4-point polygon bbox."""
    xs = [float(p[0]) for p in bbox]
    ys = [float(p[1]) for p in bbox]
    return min(xs), sum(ys) / len(ys), (max(ys) - min(ys))


def boxes_to_lines(boxes):
    """Cluster OCR boxes into left-to-right ordered text lines."""
    items = []
    for b in boxes:
        if not isinstance(b, dict):
            continue
        text = (b.get("text") or "").strip()
        bbox = b.get("bbox")
        if not text or not bbox:
            continue
        try:
            x, y, h = _box_geometry(bbox)
        except Exception:
            continue
        items.append({"text": text, "x": x, "y": y, "h": h})

    if not items:
        return []

    # Sort top-to-bottom, then left-to-right.
    items.sort(key=lambda i: (i["y"], i["x"]))

    # Line-grouping tolerance scales with the median text height so it adapts to
    # any scan resolution instead of a fixed pixel cutoff.
    heights = sorted(i["h"] for i in items)
    median_h = heights[len(heights) // 2] or 10.0
    tol = max(6.0, median_h * 0.6)

    lines = []
    current = [items[0]]
    current_y = items[0]["y"]
    for it in items[1:]:
        if abs(it["y"] - current_y) <= tol:
            current.append(it)
        else:
            lines.append(current)
            current = [it]
            current_y = it["y"]
    lines.append(current)

    out = []
    for line in lines:
        line.sort(key=lambda i: i["x"])
        out.append("  ".join(w["text"] for w in line))
    return out


def boxes_to_page_text(boxes):
    """Flatten OCR boxes into a single newline-separated page-text string."""
    return "\n".join(boxes_to_lines(boxes))
