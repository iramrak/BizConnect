"""
CleanDerect CRM — Root URL Configuration
==========================================
- /admin/                → Django admin
- /api/                  → CRM REST API (users, clients, deals, tasks, action-logs)
- /api/token/            → JWT obtain pair
- /api/token/refresh/    → JWT refresh
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # JWT Authentication
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # CRM API
    path("api/", include("crm.urls")),
]
