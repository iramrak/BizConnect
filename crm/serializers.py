"""
CleanDerect CRM — Serializers
==============================
ModelSerializers for User, Client, Deal, Task, ActionLog.

Strategy for nested data:
- Short serializers (UserShortSerializer, ClientShortSerializer) used in
  `to_representation()` to embed related objects on READ (GET).
- On WRITE (POST/PUT/PATCH) — standard PrimaryKeyRelatedField is used.
"""

from rest_framework import serializers

from .models import ActionLog, Client, Deal, Task, User


# ──────────────────────────────
# Short / nested serializers
# ──────────────────────────────

class UserShortSerializer(serializers.ModelSerializer):
    """Compact user representation for embedding in Deal / Task responses."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name"]
        read_only_fields = fields


class ClientShortSerializer(serializers.ModelSerializer):
    """Compact client representation for embedding in Deal / Task responses."""

    class Meta:
        model = Client
        fields = ["id", "first_name", "last_name", "phone"]
        read_only_fields = fields


# ──────────────────────────────
# Full serializers
# ──────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """Full user representation.  Password is write-only."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "date_joined"]


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone",
            "email",
            "company",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DealSerializer(serializers.ModelSerializer):
    """
    Deal serializer.
    - WRITE: accepts optional client_name (string) for AI-driven creation.
    - READ:  to_representation() replaces PKs with nested objects.
    """

    stage_display = serializers.CharField(
        source="get_stage_display", read_only=True
    )
    currency_display = serializers.CharField(
        source="get_currency_display", read_only=True
    )
    # Virtual field: AI sends client name as text, ViewSet resolves to FK
    client_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    # Virtual field: optional phone for the client
    client_phone = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    class Meta:
        model = Deal
        fields = [
            "id",
            "title",
            "client",
            "client_name",
            "client_phone",
            "amount",
            "currency",
            "currency_display",
            "stage",
            "stage_display",
            "probability",
            "expected_close_date",
            "manager",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "manager", "client"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["client"] = ClientShortSerializer(instance.client).data
        data["manager"] = UserShortSerializer(instance.manager).data
        return data


class TaskSerializer(serializers.ModelSerializer):
    """
    Task serializer.
    - WRITE: deal / client / creator as PK.
    - READ:  nested objects via to_representation().
    """

    task_type_display = serializers.CharField(
        source="get_task_type_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "deal",
            "client",
            "task_type",
            "task_type_display",
            "title",
            "description",
            "deadline",
            "status",
            "status_display",
            "creator",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "creator"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["creator"] = UserShortSerializer(instance.creator).data
        if instance.client:
            data["client"] = ClientShortSerializer(instance.client).data
        if instance.deal:
            data["deal"] = {
                "id": instance.deal.id,
                "title": instance.deal.title,
            }
        return data


class ActionLogSerializer(serializers.ModelSerializer):
    """Read-only log serializer.  User is embedded."""

    user = UserShortSerializer(read_only=True)

    class Meta:
        model = ActionLog
        fields = ["id", "user", "action", "created_at"]
        read_only_fields = fields
