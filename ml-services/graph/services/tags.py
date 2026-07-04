"""
Investigator-facing tags — the translation layer from numeric risk signals to
plain-language flags an officer can act on.

These are derived entirely from the risk-fusion output already computed (its
`factors[]` + `risk_level`); this module adds NO new detection. The vocabulary
is deliberately small and fixed so it stays learnable, and the loudest flag
(MALICIOUS, reserved for CRITICAL) never becomes background noise.

The frontend maps each tag `key` to a colour + icon; the `label` here is the
single source of truth for wording (also used verbatim in the reports).
"""

# tag key -> investigator-facing label
LABELS = {
    "MALICIOUS": "Malicious Activity",
    "CIRCULAR": "Circular Money Flow",
    "RAPID_PASSTHROUGH": "Rapid Pass-Through",
    "ACCUMULATION": "Fund Accumulation",
    "LAYERING": "Layering / Pass-Through",
    "STRUCTURING": "Structuring",
    "COLLECTOR": "Collector (Fan-In)",
    "DISTRIBUTOR": "Distributor (Fan-Out)",
    "ANOMALY": "Statistical Anomaly",
    "SUSPICIOUS_TIMING": "Suspicious Timing",
}

# risk-fusion factor signal -> tag key
_SIGNAL_TAG = {
    "round_trip": "CIRCULAR",
    "rapid_passthrough": "RAPID_PASSTHROUGH",
    "accumulation": "ACCUMULATION",
    "layering": "LAYERING",
    "structuring": "STRUCTURING",
    "fan_in": "COLLECTOR",
    "fan_out": "DISTRIBUTOR",
    "anomaly": "ANOMALY",
    "temporal": "SUSPICIOUS_TIMING",
}

# display priority (most investigator-relevant first)
_PRIORITY = [
    "MALICIOUS", "CIRCULAR", "RAPID_PASSTHROUGH", "ACCUMULATION",
    "LAYERING", "STRUCTURING", "COLLECTOR", "DISTRIBUTOR",
    "SUSPICIOUS_TIMING", "ANOMALY",
]


def derive_tags(scored, max_tags=4):
    """`scored`: a risk-fusion result dict (has `factors[]` and `risk_level`).

    Returns {"tags": [{"key","label"}, ...], "severity": <risk_level>}.
    `severity` mirrors the account's risk level so a single field drives the
    badge intensity on the frontend.
    """
    level = scored.get("risk_level", "LOW")
    keys = []

    # Umbrella flag — reserved for CRITICAL so it stays meaningful.
    if level == "CRITICAL":
        keys.append("MALICIOUS")

    for factor in scored.get("factors", []) or []:
        tag = _SIGNAL_TAG.get(factor.get("signal"))
        if tag and tag not in keys:
            keys.append(tag)

    keys.sort(key=lambda k: _PRIORITY.index(k) if k in _PRIORITY else 99)
    keys = keys[:max_tags]

    return {
        "tags": [{"key": k, "label": LABELS.get(k, k)} for k in keys],
        "severity": level,
    }
