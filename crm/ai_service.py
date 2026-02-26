"""
CleanDerect CRM — AI Service
==============================
OpenAI integration with function calling.

The assistant NEVER modifies the database directly.
When the user asks for a CRM action, the model calls `prepare_crm_action`
and returns a structured JSON so the frontend can confirm and execute it.
"""

import json
import logging
from datetime import datetime

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

# ── OpenAI client ──────────────────────────────
client = OpenAI(api_key=settings.OPENAI_API_KEY)

MODEL = "gpt-4o-mini"

# ── System prompt ──────────────────────────────
SYSTEM_PROMPT = """Ты — ИИ-ассистент CRM-системы CleanDerect.

Ты помогаешь менеджерам по продажам: отвечаешь на вопросы, подсказываешь
действия и предлагаешь создать/обновить записи в CRM.

Правила:
1. Отвечай на русском языке, кратко и по существу.
2. Если пользователь просит что-то сделать в CRM (создать задачу, поменять
   стадию сделки, добавить клиента и т.д.), ОБЯЗАТЕЛЬНО вызови функцию
   `prepare_crm_action` с нужными параметрами.
3. НЕ выдумывай данные — если информации недостаточно, уточни у пользователя.
4. Можешь предлагать action_type: create_task, update_deal, create_client.
5. Для create_task payload может содержать: title, deadline (YYYY-MM-DD),
   task_type (call / meeting / email), description.
6. Для update_deal payload может содержать: deal_id, stage
   (new / in_progress / proposal / negotiation / payment / closed_won / closed_lost),
   amount, expected_close_date.
7. Для create_client payload может содержать: first_name, last_name,
   phone, email, company.
"""

# ── Tool definition (function calling) ─────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "prepare_crm_action",
            "description": (
                "Подготавливает CRM-действие для подтверждения пользователем. "
                "Вызывай, когда пользователь просит создать, обновить или удалить "
                "запись в CRM. ОБЯЗАТЕЛЬНО заполняй payload конкретными данными!"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "action_type": {
                        "type": "string",
                        "enum": ["create_task", "update_deal", "create_client"],
                        "description": "Тип CRM-действия",
                    },
                    "payload": {
                        "type": "object",
                        "description": (
                            "Словарь с данными для API. НИКОГДА не оставляй пустым! "
                            "Если action_type='create_task', ОБЯЗАТЕЛЬНО укажи: "
                            "'title' (строка — название задачи), "
                            "'deadline' (строка YYYY-MM-DD — дата дедлайна), "
                            "'task_type' (строка: 'call', 'meeting' или 'email'). "
                            "Если action_type='update_deal', ОБЯЗАТЕЛЬНО укажи: "
                            "'deal_id' (число — ID сделки), и одно или несколько из: "
                            "'stage', 'amount', 'expected_close_date'. "
                            "Если action_type='create_client', ОБЯЗАТЕЛЬНО укажи: "
                            "'first_name' (строка), 'last_name' (строка), "
                            "а также 'phone', 'email', 'company' если известны."
                        ),
                        "properties": {
                            "title": {"type": "string", "description": "Название задачи (для create_task)"},
                            "deadline": {"type": "string", "description": "Дедлайн в формате YYYY-MM-DD (для create_task)"},
                            "task_type": {
                                "type": "string",
                                "enum": ["call", "meeting", "email"],
                                "description": "Тип задачи (для create_task)",
                            },
                            "description": {"type": "string", "description": "Описание задачи (опционально)"},
                            "deal_id": {"type": "integer", "description": "ID сделки (для update_deal)"},
                            "stage": {"type": "string", "description": "Новая стадия сделки (для update_deal)"},
                            "amount": {"type": "string", "description": "Сумма сделки (для update_deal)"},
                            "expected_close_date": {"type": "string", "description": "Ожидаемая дата закрытия YYYY-MM-DD"},
                            "first_name": {"type": "string", "description": "Имя клиента (для create_client)"},
                            "last_name": {"type": "string", "description": "Фамилия клиента (для create_client)"},
                            "phone": {"type": "string", "description": "Телефон клиента"},
                            "email": {"type": "string", "description": "Email клиента"},
                            "company": {"type": "string", "description": "Компания клиента"},
                        },
                    },
                    "human_description": {
                        "type": "string",
                        "description": (
                            "Понятное описание действия для пользователя "
                            "на русском языке. Должно включать ключевые данные "
                            "из payload (название, дата, тип)."
                        ),
                    },
                },
                "required": ["action_type", "payload", "human_description"],
            },
        },
    }
]


def chat_with_ai(
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Send a message to OpenAI and return a structured response.

    Returns
    -------
    dict
        {
            "reply": str,             # AI text (or confirmation prompt)
            "proposed_action": dict | None   # CRM action if function was called
        }
    """

    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    messages = [{
        "role": "system",
        "content": (
            f"{SYSTEM_PROMPT}\n\n"
            f"Текущая дата и время сервера: {now}. "
            "Используй это для вычисления относительных дат "
            "(завтра, послезавтра, через неделю и т.д.)."
        ),
    }]

    # Append prior conversation context (optional)
    if conversation_history:
        messages.extend(conversation_history)

    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.4,
            max_tokens=1024,
        )

        choice = response.choices[0]
        message = choice.message

        # ── Case 1: The model called prepare_crm_action ──
        if message.tool_calls:
            tool_call = message.tool_calls[0]
            if tool_call.function.name == "prepare_crm_action":
                print(f"RAW LLM ARGUMENTS: {tool_call.function.arguments}")
                arguments = json.loads(tool_call.function.arguments)

                action_type = arguments.get("action_type", "unknown")
                human_description = arguments.get(
                    "human_description", "Подтвердите действие"
                )

                # ── Bulletproof payload extraction ──
                raw_payload = arguments.get("payload")
                payload = {}

                # 1. Normal dict
                if isinstance(raw_payload, dict):
                    payload = raw_payload
                # 2. Stringified JSON
                elif isinstance(raw_payload, str):
                    try:
                        parsed = json.loads(raw_payload)
                        if isinstance(parsed, dict):
                            payload = parsed
                    except json.JSONDecodeError:
                        pass

                # 3. Fallback: fields at root level
                if not payload:
                    skip_keys = {"action_type", "human_description", "payload"}
                    payload = {
                        k: v for k, v in arguments.items() if k not in skip_keys
                    }

                return {
                    "reply": human_description,
                    "proposed_action": {
                        "action_type": action_type,
                        "payload": payload,
                        "human_description": human_description,
                    },
                }

        # ── Case 2: Plain text reply ─────────────────────
        return {
            "reply": message.content or "Не могу сформулировать ответ.",
            "proposed_action": None,
        }

    except Exception as exc:
        logger.exception("OpenAI API error")
        return {
            "reply": f"Ошибка при обращении к ИИ: {exc}",
            "proposed_action": None,
        }
