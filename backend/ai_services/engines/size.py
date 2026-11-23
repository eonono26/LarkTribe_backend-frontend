"""AI size guidance (Proposal items 1 & 8).

Guidance only - never a guarantee of physical fit. Works in two steps:
  1. If the product has a SizeGuide table, match the shopper's measurements to
     its rows (ranges like "86-92", "2-3 yrs", "S").
  2. Otherwise fall back to a generic Kenyan/UK-style baby, kids and adult chart.
Then it maps the result onto the sizes the product is actually sold in.
"""
import re

NUM = re.compile(r"(\d+(?:\.\d+)?)")

# (label, height_lo, height_hi) in cm
KIDS_CHART = [
    ("0-3 Months", 50, 62), ("3-6 Months", 62, 68), ("6-9 Months", 68, 74), ("9-12 Months", 74, 80),
    ("12-18 Months", 80, 86), ("18-24 Months", 86, 92), ("2-3 Yrs", 92, 104), ("4-5 Yrs", 104, 116),
    ("6-8 Yrs", 116, 134), ("9-11 Yrs", 134, 146), ("12-14 Yrs", 146, 158),
]
# (label, chest_lo, chest_hi, height_lo, height_hi)
ADULT_CHART = [
    ("XS", 78, 86, 145, 160), ("S", 86, 94, 155, 168), ("M", 94, 102, 163, 176),
    ("L", 102, 110, 170, 182), ("XL", 110, 118, 176, 188), ("XXL", 118, 130, 180, 200),
]

KEYS = {
    "height": ("height", "length", "stature"), "chest": ("chest", "bust"), "waist": ("waist",),
    "hips": ("hip",), "weight": ("weight",), "age": ("age",), "foot": ("foot",),
}


def _range(cell):
    """'86-92' -> (86, 92); '92' -> (92, 92); '2-3 yrs' -> months for age cells handled by caller."""
    nums = [float(n) for n in NUM.findall(str(cell))]
    if not nums:
        return None
    return (min(nums), max(nums))


def _age_months(cell):
    text = str(cell).lower()
    nums = [float(n) for n in NUM.findall(text)]
    if not nums:
        return None
    mult = 12 if re.search(r"y(ea)?r|\by\b", text) else 1
    return (min(nums) * mult, max(nums) * mult)


def _distance(value, rng, slack):
    lo, hi = rng
    if lo <= value <= hi:
        return 0.0
    return (lo - value if value < lo else value - hi) / max(slack, 1)


def _from_guide(guide, m):
    cols = [str(c).lower() for c in (guide.columns or [])]
    rows = guide.rows or []
    if not cols or not rows:
        return None
    size_idx = next((i for i, c in enumerate(cols) if c.strip() in ("size", "sizes", "label")), 0)
    usable = {}
    for key, words in KEYS.items():
        if m.get(key) is None:
            continue
        idx = next((i for i, c in enumerate(cols) if any(w in c for w in words)), None)
        if idx is not None and idx != size_idx:
            usable[key] = idx
    if not usable:
        return None
    scored = []
    for row in rows:
        if len(row) <= max(usable.values()):
            continue
        total, n = 0.0, 0
        for key, idx in usable.items():
            rng = _age_months(row[idx]) if key == "age" else _range(row[idx])
            if rng is None:
                continue
            total += _distance(m[key], rng, {"height": 6, "chest": 4, "waist": 4, "hips": 4, "weight": 3, "age": 3, "foot": 1}[key])
            n += 1
        if n:
            scored.append((total / n, str(row[size_idx])))
    if not scored:
        return None
    scored.sort()
    return [s for _, s in scored], scored[0][0], sorted(usable)


def _from_generic(m):
    height, chest, age = m.get("height"), m.get("chest"), m.get("age")
    kid = (age is not None and age <= 15 * 12) or (height is not None and height < 150)
    if kid:
        if age is not None and height is None:
            for label, lo, hi in KIDS_CHART:
                a = _age_months(label)
                if a and a[0] <= age <= a[1] + 0.001:
                    height = (lo + hi) / 2
                    break
        if height is None:
            return None
        ranked = sorted(KIDS_CHART, key=lambda r: _distance(height, (r[1], r[2]), 6))
        return [r[0] for r in ranked], _distance(height, (ranked[0][1], ranked[0][2]), 6), ["height"]
    if chest is None and height is None:
        return None
    def d(r):
        parts = []
        if chest is not None:
            parts.append(_distance(chest, (r[1], r[2]), 4))
        if height is not None:
            parts.append(_distance(height, (r[3], r[4]), 8))
        return sum(parts) / len(parts)
    ranked = sorted(ADULT_CHART, key=d)
    used = [k for k in ("chest", "height") if m.get(k) is not None]
    return [r[0] for r in ranked], d(ranked[0]), used


def _norm(label):
    return re.sub(r"[^a-z0-9]", "", str(label).lower().replace("months", "m").replace("month", "m").replace("years", "y").replace("yrs", "y").replace("yr", "y"))


def recommend(product, measurements):
    """measurements: dict of optional floats (height, chest, waist, hips, weight, age in MONTHS, foot)."""
    m = {k: v for k, v in measurements.items() if v is not None}
    if not m:
        return {"size": None, "reason": "Add at least your height (or your child's age) to get a size suggestion.",
                "disclaimer": DISCLAIMER}
    result = None
    source = "generic"
    if getattr(product, "size_guide_id", None):
        result = _from_guide(product.size_guide, m)
        source = "size_guide"
    if result is None:
        result = _from_generic(m)
        source = "generic"
    if result is None:
        return {"size": None, "reason": "We couldn't work out a size from those measurements.", "disclaimer": DISCLAIMER}

    ranked, gap, used = result
    available = list(
        product.variants.filter(stock__gt=0).exclude(size="").values_list("size", flat=True).distinct()
    ) if product.pk else []
    by_norm = {_norm(a): a for a in available}

    pick, alternatives = None, []
    for label in ranked:
        hit = by_norm.get(_norm(label))
        if hit:
            if pick is None:
                pick = hit
            elif len(alternatives) < 1:
                alternatives.append(hit)
        if pick and alternatives:
            break
    if pick is None and available:
        # Guide labels don't line up with the stock labels: show the guide's size, flag it.
        pick = ranked[0]
        note = f"Our chart suggests {pick}, but check the size labels on this product."
    else:
        note = None
    if pick is None:
        pick = ranked[0]
    if not alternatives and len(ranked) > 1:
        alt = ranked[1]
        if alt != pick:
            alternatives.append(by_norm.get(_norm(alt), alt))

    confidence = "high" if gap == 0 and len(used) >= 2 else "medium" if gap <= 0.6 else "low"
    return {
        "size": pick, "alternatives": alternatives, "confidence": confidence, "based_on": used, "source": source,
        "in_stock": _norm(pick) in by_norm, "reason": note or f"Based on your {' and '.join(used)}, {pick} should be the closest fit.",
        "tip": "Between sizes? Size up for growing kids or a relaxed fit." if len(alternatives) else "",
        "disclaimer": DISCLAIMER,
    }


DISCLAIMER = "Size guidance is an estimate based on the measurements you entered, not a guarantee of fit. Check the size guide for this product."
