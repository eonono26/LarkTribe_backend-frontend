"""
Size guidance from a product's admin-managed SizeGuide table.

This is guidance, never a guarantee of physical fit: it picks the first chart
row whose height / weight / age ranges contain the shopper's measurements, and
falls back to the nearest row by height.
"""
import re

_NUM = re.compile(r"\d+(?:\.\d+)?")

_KEYS = {
    "height_cm": ("height", "length"),
    "weight_kg": ("weight",),
    "age_years": ("age",),
}


def _range(cell):
    nums = [float(n) for n in _NUM.findall(str(cell))]
    if not nums:
        return None
    return (min(nums), max(nums))


def _column_index(columns, words):
    for i, col in enumerate(columns):
        if any(w in str(col).lower() for w in words):
            return i
    return None


def recommend(columns, rows, height_cm=None, weight_kg=None, age_years=None):
    inputs = {"height_cm": height_cm, "weight_kg": weight_kg, "age_years": age_years}
    cols = {k: _column_index(columns, w) for k, w in _KEYS.items()}
    usable = {k: v for k, v in inputs.items() if v is not None and cols[k] is not None}
    note = "Size guidance only — check the size chart, as fit can vary by style."
    if not usable:
        return {"size": None, "detail": "Enter height, weight or age that matches this chart.", "note": note}

    best, best_gap = None, None
    for row in rows:
        gap, ok = 0.0, True
        for key, value in usable.items():
            idx = cols[key]
            if idx >= len(row):
                ok = False
                break
            rng = _range(row[idx])
            if not rng:
                ok = False
                break
            lo, hi = rng
            if lo <= value <= hi:
                continue
            gap += min(abs(value - lo), abs(value - hi))
        if not ok:
            continue
        if gap == 0:
            return {"size": str(row[0]), "exact": True, "note": note}
        if best_gap is None or gap < best_gap:
            best, best_gap = row, gap
    if best is not None:
        return {"size": str(best[0]), "exact": False, "note": note + " Closest match shown."}
    return {"size": None, "detail": "No matching row in the size chart.", "note": note}
