"""
CleanDerect CRM — Core Models
==============================
User, Client, Deal, Task, ActionLog

All models live in one file for simplicity at the early stage.
Split into separate modules when app grows beyond ~500 lines.
"""

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


# ─────────────────────────────────────────────
# User  (custom: email-based auth, no username)
# ─────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя.
    Аутентификация по email, без поля username.
    """

    class Role(models.TextChoices):
        ADMIN = "admin", _("Администратор")
        MANAGER = "manager", _("Менеджер")
        HEAD = "head", _("Руководитель")

    email = models.EmailField(
        _("Email"),
        unique=True,
        db_index=True,
    )
    first_name = models.CharField(_("Имя"), max_length=150, blank=True)
    last_name = models.CharField(_("Фамилия"), max_length=150, blank=True)
    role = models.CharField(
        _("Роль"),
        max_length=20,
        choices=Role.choices,
        default=Role.MANAGER,
        db_index=True,
    )

    is_active = models.BooleanField(_("Активен"), default=True)
    is_staff = models.BooleanField(_("Доступ к админке"), default=False)
    date_joined = models.DateTimeField(_("Дата регистрации"), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = _("Пользователь")
        verbose_name_plural = _("Пользователи")
        ordering = ["email"]

    def __str__(self):
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


# ─────────────────────────────────────────────
# Client  (справочник клиентов)
# ─────────────────────────────────────────────

class Client(models.Model):
    """
    Клиент / контакт.
    UniqueConstraint по (email, phone) — первый шаг к дедупликации.
    """

    first_name = models.CharField(_("Имя"), max_length=150)
    last_name = models.CharField(_("Фамилия"), max_length=150, blank=True)
    phone = models.CharField(
        _("Телефон"), max_length=30, blank=True, null=True, db_index=True
    )
    email = models.EmailField(_("Email"), blank=True, null=True, db_index=True)
    company = models.CharField(_("Компания"), max_length=255, blank=True, db_index=True)
    created_at = models.DateTimeField(_("Создан"), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_("Обновлён"), auto_now=True)

    class Meta:
        verbose_name = _("Клиент")
        verbose_name_plural = _("Клиенты")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["email", "phone"],
                name="unique_client_email_phone",
                condition=models.Q(email__isnull=False) & models.Q(phone__isnull=False),
                violation_error_message=_(
                    "Клиент с таким email и телефоном уже существует."
                ),
            ),
        ]

    def __str__(self):
        full = f"{self.first_name} {self.last_name}".strip()
        if self.company:
            return f"{full} ({self.company})"
        return full


# ─────────────────────────────────────────────
# Deal  (сделка / лид)
# ─────────────────────────────────────────────

class Deal(models.Model):
    """
    Сделка (лид) с клиентом.
    Проходит по воронке от «Новый» до «Закрыто (успех/провал)».
    """

    class Stage(models.TextChoices):
        NEW = "new", _("Новый")
        IN_PROGRESS = "in_progress", _("В работе")
        PROPOSAL = "proposal", _("Коммерческое предложение")
        NEGOTIATION = "negotiation", _("Согласование")
        PAYMENT = "payment", _("Оплата")
        CLOSED_WON = "closed_won", _("Закрыто (успех)")
        CLOSED_LOST = "closed_lost", _("Закрыто (провал)")

    class Currency(models.TextChoices):
        KZT = "KZT", _("₸ Тенге")
        RUB = "RUB", _("₽ Рубль")
        USD = "USD", _("$ Доллар")
        EUR = "EUR", _("€ Евро")

    title = models.CharField(_("Название сделки"), max_length=255)
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name=_("Клиент"),
    )
    amount = models.DecimalField(
        _("Сумма"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    currency = models.CharField(
        _("Валюта"),
        max_length=3,
        choices=Currency.choices,
        default=Currency.KZT,
    )
    stage = models.CharField(
        _("Стадия"),
        max_length=20,
        choices=Stage.choices,
        default=Stage.NEW,
        db_index=True,
    )
    probability = models.PositiveSmallIntegerField(
        _("Вероятность (%)"),
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    expected_close_date = models.DateField(
        _("Ожидаемая дата закрытия"),
        null=True,
        blank=True,
        db_index=True,
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="deals",
        verbose_name=_("Ответственный менеджер"),
    )

    created_at = models.DateTimeField(_("Создана"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Обновлена"), auto_now=True)

    class Meta:
        verbose_name = _("Сделка")
        verbose_name_plural = _("Сделки")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["manager", "stage"], name="idx_deal_manager_stage"),
        ]

    def __str__(self):
        return f"{self.title} — {self.get_stage_display()} ({self.amount} {self.currency})"


# ─────────────────────────────────────────────
# Task  (задача: звонок, встреча, письмо)
# ─────────────────────────────────────────────

class Task(models.Model):
    """
    Задача, привязанная к сделке и/или клиенту.
    Оба FK nullable — задача может быть «свободной».
    """

    class TaskType(models.TextChoices):
        CALL = "call", _("Звонок")
        MEETING = "meeting", _("Встреча")
        EMAIL = "email", _("Письмо")

    class Status(models.TextChoices):
        OPEN = "open", _("Открыта")
        COMPLETED = "completed", _("Выполнена")

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name=_("Сделка"),
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name=_("Клиент"),
    )
    task_type = models.CharField(
        _("Тип задачи"),
        max_length=20,
        choices=TaskType.choices,
        default=TaskType.CALL,
        db_index=True,
    )
    title = models.CharField(_("Заголовок"), max_length=255)
    description = models.TextField(_("Описание"), blank=True)
    deadline = models.DateTimeField(_("Дедлайн"), db_index=True)
    status = models.CharField(
        _("Статус"),
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_tasks",
        verbose_name=_("Создатель"),
    )

    created_at = models.DateTimeField(_("Создана"), auto_now_add=True)

    class Meta:
        verbose_name = _("Задача")
        verbose_name_plural = _("Задачи")
        ordering = ["deadline"]
        indexes = [
            models.Index(fields=["status", "deadline"], name="idx_task_status_deadline"),
        ]

    def __str__(self):
        return f"[{self.get_task_type_display()}] {self.title} — {self.get_status_display()}"


# ─────────────────────────────────────────────
# ActionLog  (журнал действий)
# ─────────────────────────────────────────────

class ActionLog(models.Model):
    """
    Запись в журнале действий.
    user = SET_NULL — лог сохраняется даже после удаления пользователя.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="action_logs",
        verbose_name=_("Пользователь"),
    )
    action = models.CharField(_("Действие"), max_length=500)
    created_at = models.DateTimeField(_("Дата"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("Запись журнала")
        verbose_name_plural = _("Журнал действий")
        ordering = ["-created_at"]

    def __str__(self):
        user_label = self.user.email if self.user else "Система"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {user_label}: {self.action}"
