"""Small helpers shared by the catalog, cart and orders apps."""

from .models import Category


def category_subtree_ids(slug):
    """
    Return the id of the category with this slug PLUS the ids of all of its
    descendants (any depth).

    This is what makes a menu like  Men -> Clothing  list every product filed
    under Clothing's children (Shorts, Jeans, T-Shirts ...), while  Men ->
    Shorts  still lists only shorts. Returns [] for an unknown slug so the
    caller gets an empty result set rather than "everything".
    """
    if not slug:
        return []

    root_id = (
        Category.objects
        .filter(slug=slug)
        .values_list("id", flat=True)
        .first()
    )

    if root_id is None:
        return []

    seen = {root_id}
    frontier = [root_id]

    while frontier:
        children = set(
            Category.objects
            .filter(parent_id__in=frontier)
            .values_list("id", flat=True)
        ) - seen

        seen |= children
        frontier = list(children)

    return list(seen)


def _absolute(request, image_field):
    url = image_field.url
    return request.build_absolute_uri(url) if request else url


def image_for_color(product, color, request=None):
    """
    Absolute URL of the photo that best represents `color` for `product`:

      1. that color's primary photo (else its first photo, case-insensitive), else
      2. the product's first photo, else
      3. None.

    Used by the cart and order serializers so a shopper who picked "White"
    keeps seeing the White photo in the bag, at checkout and on the order.
    """
    images = [img for img in product.images.all() if img.image]

    if not images:
        return None

    # Primary photo first, then display order - so a color's lead shot wins.
    images.sort(key=lambda i: (not i.is_primary, i.order, i.id))

    if color:
        wanted = color.strip().lower()

        for img in images:
            if (img.color or "").strip().lower() == wanted:
                return _absolute(request, img.image)

    return _absolute(request, images[0].image)
