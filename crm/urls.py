"""
CleanDerect CRM — App URL Configuration
=========================================
DefaultRouter auto-generates URL patterns for all ViewSets.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AIChatView,
    ActionLogViewSet,
    ClientViewSet,
    DealViewSet,
    TaskViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"deals", DealViewSet, basename="deal")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"action-logs", ActionLogViewSet, basename="actionlog")

urlpatterns = [
    path("", include(router.urls)),
    path("ai/chat/", AIChatView.as_view(), name="ai-chat"),
]
