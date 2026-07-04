"""
Rapid Pass-Through detector.

Flags accounts that receive money and move it out again very quickly — the
classic mule / gaming-fraud pattern ("money in, immediately distributed"). This
is DISTINCT from the temporal velocity/burst detectors (which measure volume /
frequency); here we measure the *latency* between a credit and the debit(s) that
consume it.

Method: per holder account, FIFO-pair each credit to the debits that spend it
(oldest credit first) and measure the time gap. Uses transaction time when
present (minute precision); when only the date is available it falls back to a
"same-day in-and-out" test, so it works on date-only statements without raising
false alarms.
"""

from collections import defaultdict
from datetime import datetime

_DT_FORMATS = ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M")


def _has_time(time):
    return bool(time and str(time).strip())


def _to_dt(date, time):
    if not date:
        return None, False
    d = str(date).strip()[:10]
    has_t = _has_time(time)
    if has_t:
        stamp = f"{d} {str(time).strip()}"
        for fmt in _DT_FORMATS:
            try:
                return datetime.strptime(stamp, fmt), True
            except Exception:
                continue
    try:
        return datetime.strptime(d, "%Y-%m-%d"), False
    except Exception:
        return None, False


def compute_passthrough(rows, fast_minutes=60, min_ratio=0.5):
    """Return {account: {"score", "avg_latency_min", "fast_ratio"}} for accounts
    whose money predominantly passes through quickly (fast_ratio >= min_ratio).

    score == fast_ratio (0..1): the share of consumed money that left within
    `fast_minutes` (time-precise) or same-day (date-only).
    """
    by_acct = defaultdict(list)
    for r in rows:
        acct = r.get("account")
        if acct:
            by_acct[acct].append(r)

    out = {}
    for acct, txns in by_acct.items():
        lots = []                 # FIFO: [remaining, credit_dt, credit_has_time]
        total_consumed = 0.0
        fast_consumed = 0.0
        latencies = []            # (weight, minutes) where both sides have time

        for r in txns:
            direction = (r.get("debit_credit") or "").upper()
            amt = float(r.get("amount") or 0)
            if amt <= 0:
                continue
            dt, has_t = _to_dt(r.get("date"), r.get("time"))

            if direction == "CREDIT":
                lots.append([amt, dt, has_t])
            elif direction == "DEBIT":
                remaining = amt
                while remaining > 1e-9 and lots:
                    lot = lots[0]
                    take = min(remaining, lot[0])
                    c_dt, c_has_t = lot[1], lot[2]
                    if dt and c_dt:
                        total_consumed += take
                        if c_has_t and has_t:
                            gap_min = max(0.0, (dt - c_dt).total_seconds() / 60.0)
                            latencies.append((take, gap_min))
                            if gap_min <= fast_minutes:
                                fast_consumed += take
                        elif dt.date() == c_dt.date():
                            # date-only: same-day in-and-out counts as fast
                            fast_consumed += take
                    lot[0] -= take
                    remaining -= take
                    if lot[0] <= 1e-9:
                        lots.pop(0)

        if total_consumed <= 0:
            continue
        fast_ratio = fast_consumed / total_consumed
        if fast_ratio < min_ratio:
            continue

        if latencies:
            wsum = sum(w for w, _ in latencies)
            avg_latency = round(sum(w * g for w, g in latencies) / wsum, 1) if wsum else None
        else:
            avg_latency = None

        out[acct] = {
            "score": round(fast_ratio, 3),
            "avg_latency_min": avg_latency,
            "fast_ratio": round(fast_ratio, 3),
        }
    return out
