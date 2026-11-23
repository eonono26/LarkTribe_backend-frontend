"""Smart search: typo-correction + relevance ranking, and an image-search stub.

Typo correction uses Python's stdlib difflib (SequenceMatcher) against the
catalog's product names, brands, and category names — no extra dependency,
easy to swap for an Elasticsearch/OpenSearch "did you mean" or a learned
spell-correction model later (see README note on Elasticsearch/OpenSearch).
"""
import difflib
from django.db.models import Q
from catalog.models import Product, Brand, Category


def _vocabulary():
    words = set()
    for name in Product.objects.filter(status=Product.Status.ACTIVE).values_list("name", flat=True)[:2000]:
        words.update(w.lower() for w in name.split())
    words.update(b.lower() for b in Brand.objects.values_list("name", flat=True))
    words.update(c.lower() for c in Category.objects.values_list("name", flat=True))
    from catalog.models import ProductVariant
    words.update(c.lower() for c in ProductVariant.objects.exclude(color="").values_list("color", flat=True).distinct()[:300])
    words.update(SYNONYMS.keys())
    words = {w for w in words if len(w) > 2}
    return words


def correct_query(query):
    """Return (corrected_query, was_corrected)."""
    if not query:
        return query, False
    vocab = _vocabulary()
    tokens = query.lower().split()
    corrected_tokens = []
    changed = False
    for tok in tokens:
        if tok in vocab or len(tok) <= 2:
            corrected_tokens.append(tok)
            continue
        matches = difflib.get_close_matches(tok, vocab, n=1, cutoff=0.75)
        if matches:
            corrected_tokens.append(matches[0])
            changed = True
        else:
            corrected_tokens.append(tok)
    return " ".join(corrected_tokens), changed


STOPWORDS = {"a", "an", "the", "for", "with", "and", "in", "of", "to", "on", "me", "my", "some", "any", "show", "find", "i", "want", "need"}
# Light synonym map so shoppers' words match how the catalogue is written.
SYNONYMS = {
    "tee": "t-shirt", "tshirt": "t-shirt", "t-shirts": "t-shirt", "tees": "t-shirt", "trousers": "pants", "joggers": "pants",
    "sneakers": "shoes", "trainers": "shoes", "kicks": "shoes", "frock": "dress", "dresses": "dress", "gown": "dress",
    "hoody": "hoodie", "jumper": "sweater", "sweatshirt": "sweater", "baby": "baby", "toddler": "kids", "grey": "gray",
    "shorts": "shorts", "swimsuit": "swimwear", "bikini": "swimwear", "leggings": "leggings", "tights": "leggings",
}


def _tokens(query):
    toks = []
    for raw in (query or "").lower().replace(",", " ").split():
        raw = raw.strip(".!?\"'")
        if not raw or raw in STOPWORDS:
            continue
        toks.append(raw)
    return toks


def _token_q(tok):
    """Everything a single search word may match: name, description, brand, category, colour, material."""
    alts = {tok, SYNONYMS.get(tok, tok)}
    if tok.endswith("s") and len(tok) > 3:
        alts.add(tok[:-1])
    q = Q()
    for a in alts:
        q |= (Q(name__icontains=a) | Q(description__icontains=a) | Q(brand__name__icontains=a)
              | Q(category__name__icontains=a) | Q(variants__color__icontains=a) | Q(materials__icontains=a))
    return q, alts


def _rank(products, tokens):
    """Name matches outrank description matches; more matched words outrank fewer."""
    def score(p):
        name = (p.name or "").lower()
        cat = (getattr(p.category, "name", "") or "").lower()
        sc = 0
        for t in tokens:
            alts = {t, SYNONYMS.get(t, t)}
            if any(a in name for a in alts):
                sc += 3
            elif any(a in cat for a in alts):
                sc += 2
            else:
                sc += 1
        return (-sc, -(p.rating_avg or 0))
    return sorted(products, key=score)


def _search_tokens(tokens, limit):
    base = Product.objects.filter(status=Product.Status.ACTIVE).select_related("category", "brand")
    qs = base
    for t in tokens:  # every word must match (AND) -> "red summer dress" finds red summer dresses
        q, _ = _token_q(t)
        qs = qs.filter(q)
    found = list(qs.distinct()[:limit * 3])
    if found or len(tokens) < 2:
        return _rank(found, tokens)[:limit]
    # Nothing matched every word: fall back to products matching most words.
    scored = {}
    for t in tokens:
        q, _ = _token_q(t)
        for p in base.filter(q).distinct()[:limit * 3]:
            scored[p.pk] = scored.get(p.pk, [p, 0])
            scored[p.pk][1] += 1
    best = sorted(scored.values(), key=lambda x: -x[1])
    top = [p for p, n in best if n >= max(1, len(tokens) // 2)]
    return _rank(top, tokens)[:limit]


def smart_search(query, limit=40):
    """Multi-word, typo-tolerant search. Understands things like "red summer dres":
    each word is matched against name, description, brand, category, colour and
    material; misspelt words are corrected against the catalogue vocabulary."""
    tokens = _tokens(query)
    if not tokens:
        return [], query, False
    results = _search_tokens(tokens, limit)
    if results:
        return results, query, False

    corrected, changed = correct_query(" ".join(tokens))
    if changed:
        results = _search_tokens(_tokens(corrected), limit)
        return results, corrected, True
    return [], query, False


def image_search(image_file, limit=12):
    """Stub for 'upload a photo to find similar items'.

    A production build would run the image through a vision embedding model
    (e.g. CLIP) and do a nearest-neighbour lookup against pre-computed product
    embeddings. Without that model available here, this endpoint validates the
    upload and returns visually-broad candidates (highly rated, in-stock,
    featured items) so the API contract the frontend/mobile need is real and
    ready to be pointed at a trained model.
    """
    from catalog.models import Product
    candidates = Product.objects.filter(status=Product.Status.ACTIVE, stock__gt=0).order_by("-rating_avg", "-is_featured")[:limit]
    return list(candidates)
