from rest_framework.pagination import PageNumberPagination


class AdminPagination(PageNumberPagination):
    """Page-numbered like the rest of the API, but the admin tables can pick a page size."""
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
