from django.urls import path
from . import views

urlpatterns = [
    path("config/", views.TryOnConfigView.as_view()),
    path("", views.TryOnCreateView.as_view()),
    path("looks/", views.MyLooksView.as_view()),
    path("shared/<uuid:token>/", views.SharedLookView.as_view()),
    path("<int:pk>/", views.TryOnDetailView.as_view()),
    path("<int:pk>/save/", views.TryOnSaveView.as_view()),
    path("<int:pk>/share/", views.TryOnShareView.as_view()),
]
