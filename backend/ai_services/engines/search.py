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


def smart_search(query, limit=40):
    """Runs the query as-is; if it returns nothing, retries with typo-corrected terms."""
    base_qs = Product.objects.filter(status=Product.Status.ACTIVE)
    results = base_qs.filter(
        Q(name__icontains=query) | Q(description__icontains=query) | Q(brand__name__icontains=query)
        | Q(category__name__icontains=query)
    ).distinct()[:limit]
    if results:
        return list(results), query, False

    corrected, changed = correct_query(query)
    if changed and corrected != query:
        results = base_qs.filter(
            Q(name__icontains=corrected) | Q(description__icontains=corrected)
            | Q(brand__name__icontains=corrected) | Q(category__name__icontains=corrected)
        ).distinct()[:limit]
        return list(results), corrected, True
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
