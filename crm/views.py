"""
CleanDerect CRM — ViewSets
===========================
RBAC logic:
- Admin / Head  → full access to all objects.
- Manager       → only their own Deals (manager=user) and Tasks (creator=user).
"""

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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

    def perform_create(self, serializer):
        client_name = self.request.data.get("client_name", "").strip()
        client_phone = serializer.validated_data.pop("client_phone", None) or ""
        client_phone = client_phone.strip()
        client = None

        if client_name:
            # Try to find existing client by name (case-insensitive)
            parts = client_name.split(maxsplit=1)
            first = parts[0]
            last = parts[1] if len(parts) > 1 else ""

            client = Client.objects.filter(
                first_name__icontains=first
            ).first()

            # If not found — create a new client record
            if not client:
                client = Client.objects.create(
                    first_name=first,
                    last_name=last,
                    phone=client_phone,
                )
            elif client_phone and not client.phone:
                # Update phone if client exists but has no phone
                client.phone = client_phone
                client.save(update_fields=["phone"])

        # Fallback: if still no client, create a placeholder
        if not client:
            client = Client.objects.create(
                first_name="Не указан",
                last_name="",
                phone=client_phone,
            )

        serializer.validated_data.pop("client_name", None)
        serializer.save(manager=self.request.user, client=client)


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

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


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


# ───────────────────────────────────────
# AI Chat
# ───────────────────────────────────────

class AIChatView(APIView):
    """
    POST /api/ai/chat/
    Body: { "message": "..." }
    Response: { "reply": "...", "proposed_action": {...} | null }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"error": "Поле 'message' обязательно."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional: pass conversation history from the frontend
        history = request.data.get("history", None)

        from .ai_service import chat_with_ai

        result = chat_with_ai(
            user_message=message,
            conversation_history=history,
        )

        return Response(result, status=status.HTTP_200_OK)


# ───────────────────────────────────────
# Dashboard  (aggregated stats)
# ───────────────────────────────────────

STAGE_LABELS = {
    "new": "Новый",
    "in_progress": "В работе",
    "proposal": "КП",
    "negotiation": "Согласование",
    "payment": "Оплата",
    "closed_won": "Успех",
    "closed_lost": "Провал",
}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """
    GET /api/dashboard/
    Returns aggregated CRM statistics for the dashboard page.
    """

    # ── Deals ───────────────────────────
    total_deals = Deal.objects.count()
    total_revenue = (
        Deal.objects.aggregate(total=Sum("amount"))["total"] or 0
    )

    # Deals by stage
    stage_counts = (
        Deal.objects.values("stage")
        .annotate(count=Count("id"))
        .order_by("stage")
    )
    deals_by_stage = [
        {
            "name": STAGE_LABELS.get(row["stage"], row["stage"]),
            "key": row["stage"],
            "value": row["count"],
        }
        for row in stage_counts
    ]

    # ── Clients ─────────────────────────
    total_clients = Client.objects.count()

    # ── Tasks ───────────────────────────
    active_tasks = Task.objects.exclude(status="completed").count()
    completed_tasks = Task.objects.filter(status="completed").count()
    overdue_tasks = Task.objects.exclude(status="completed").filter(
        deadline__lt=timezone.now()
    ).count()

    return Response(
        {
            "total_deals": total_deals,
            "total_revenue": float(total_revenue),
            "deals_by_stage": deals_by_stage,
            "total_clients": total_clients,
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
        },
        status=status.HTTP_200_OK,
    )

