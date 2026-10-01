from rest_framework.pagination import PageNumberPagination


class LargePageNumberPagination(PageNumberPagination):
    """Same as the project-wide default (PAGE_SIZE=20), but lets a caller
    request more per page via ?page_size=..., up to max_page_size.

    Categories, departments, age groups, and brands are all small,
    rarely-changing lookup tables (tens to a couple hundred rows) that
    frontend components often need *in full* in one request — e.g. the
    header's mega-menu needs every Kids category, not just the first 20,
    or it silently drops whichever categories don't fit on page 1.
    """
    page_size_query_param = "page_size"
    max_page_size = 300