"""
CleanDerect CRM — ViewSets
===========================
RBAC logic:
- Admin / Head  → full access to all objects.
- Manager       → only their own Deals (manager=user) and Tasks (creator=user).
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ActionLog, Client, Deal, Task, User
from .serializers import (
    ActionLogSerializer,
    ClientSerializer,
    DealSerializer,
    TaskSerializer,
    UserSerializer,
)


# ───────────────────────────────────────
# User
# ───────────────────────────────────────

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Users list — read-only.
    All authenticated users can see the team.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["email", "first_name", "last_name"]


# ───────────────────────────────────────
# Client
# ───────────────────────────────────────

class ClientViewSet(viewsets.ModelViewSet):
    """
    CRUD for clients.  All roles have full access.
    """

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["first_name", "last_name", "phone", "email"]
    ordering_fields = ["created_at", "company", "first_name"]


# ───────────────────────────────────────
# Deal  (RBAC)
# ───────────────────────────────────────

class DealViewSet(viewsets.ModelViewSet):
    """
    CRUD for deals.
    RBAC: Manager sees only their deals; Admin/Head see everything.
    """

    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["stage", "manager"]
    search_fields = ["title"]
    ordering_fields = ["created_at", "amount", "expected_close_date"]

    def get_queryset(self):
        qs = Deal.objects.select_related("client", "manager").all()
        if self.request.user.role == "manager":
            qs = qs.filter(manager=self.request.user)
        return qs


# ───────────────────────────────────────
# Task  (RBAC)
# ───────────────────────────────────────

class TaskViewSet(viewsets.ModelViewSet):
    """
    CRUD for tasks.
    RBAC: Manager sees only tasks they created; Admin/Head see everything.
    """

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "task_type"]
    search_fields = ["title"]
    ordering_fields = ["deadline", "created_at"]

    def get_queryset(self):
        qs = Task.objects.select_related("deal", "client", "creator").all()
        if self.request.user.role == "manager":
            qs = qs.filter(creator=self.request.user)
        return qs


# ───────────────────────────────────────
# ActionLog  (read-only)
# ───────────────────────────────────────

class ActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Action history — read-only for all authenticated users.
    """

    queryset = ActionLog.objects.select_related("user").all()
    serializer_class = ActionLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["user"]
    ordering_fields = ["created_at"]
