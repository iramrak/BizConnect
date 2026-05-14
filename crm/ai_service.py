"""
CleanDerect CRM — AI Service
==============================
OpenAI integration with function calling and i18n-aware prompts.

The assistant NEVER modifies the database directly.
When the user asks for a CRM action, the model calls `prepare_crm_action`
and returns a structured JSON so the frontend can confirm and execute it.

i18n: The system prompt dynamically adapts to the current UI language
(determined by Django's LocaleMiddleware from the Accept-Language header).
"""

import json
import logging
from datetime import datetime

from django.conf import settings
from django.utils.translation import get_language
from openai import OpenAI

logger = logging.getLogger(__name__)

# ── OpenAI client ──────────────────────────────
client = OpenAI(api_key=settings.OPENAI_API_KEY)

MODEL = "gpt-4o-mini"


# ── Dynamic System Prompt ──────────────────────

def _build_system_prompt() -> str:
    """
    Build the system prompt for the AI assistant.

    Uses Django's get_language() to determine the current UI language
    (set by LocaleMiddleware from the Accept-Language header) and
    instructs the model to respond strictly in that language.
    """
    current_lang = get_language() or "ru"
    lang_name = "Kazakh" if current_lang == "kk" else "Russian"
    lang_native = "қазақ тілінде" if current_lang == "kk" else "на русском языке"

    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    return f"""You are an AI assistant built into the CleanDerect CRM system.
You help sales managers: answer questions, suggest actions, and propose
creating/updating records in the CRM.

CRITICAL LANGUAGE RULE:
The user interface is currently set to {lang_name}.
You MUST formulate ALL your conversational responses (the messages shown
to the user, including the `human_description` in function calls)
STRICTLY in {lang_name} ({lang_native}).
Do NOT switch to any other language under any circumstances.

Rules:
1. Respond concisely and to the point.
2. If the user asks to perform a CRM action (create a task, deal,
   change a deal stage, add a client, etc.), you MUST call the
   `prepare_crm_action` function with the correct parameters.
3. Do NOT invent data — if information is insufficient, ask the user.
4. RULES FOR CHOOSING action_type:
   - create_deal: user asks to create a DEAL, sale, project, or order.
     Even if they mention a client name — it's create_deal, NOT create_client!
   - create_task: user asks to create a TASK (call, meeting, email).
   - update_deal: user asks to MODIFY an existing deal.
   - create_client: ONLY when the user explicitly asks to add a person/company
     to the client database.
5. For create_task payload: title, deadline (YYYY-MM-DD),
   task_type (call / meeting / email), description.
6. For create_deal payload: title, amount, currency (KZT/RUB/USD/EUR),
   client_name (if mentioned), stage (default 'new'), expected_close_date.
7. For update_deal payload: deal_id, stage
   (new / in_progress / proposal / negotiation / payment / closed_won / closed_lost),
   amount, expected_close_date.
8. For create_client payload: first_name, last_name,
   phone, email, company.

When using Function Calling to create entities (Deals, Tasks, Clients),
strictly follow the JSON schema. The JSON keys MUST remain in English,
but all user-facing string values (titles, descriptions, names, notes,
human_description) MUST be written in {lang_name}.

Current server date/time: {now}.
Use this for computing relative dates (tomorrow, next week, etc.).
"""


# ── Tool definition (function calling) ─────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "prepare_crm_action",
            "description": (
                "Prepares a CRM action for user confirmation. "
                "Call this when the user asks to create, update, or delete "
                "a record in the CRM. ALWAYS fill the payload with specific data!"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "action_type": {
                        "type": "string",
                        "enum": ["create_task", "create_deal", "update_deal", "create_client"],
                        "description": (
                            "The type of CRM action. SELECTION RULES: "
                            "• 'create_deal' — user asks to create a DEAL, sale, "
                            "project, order, or contract. Even if they mention a "
                            "client name — it's create_deal, NOT create_client! "
                            "• 'create_task' — user asks to create a TASK: call, "
                            "meeting, reminder, email. "
                            "• 'update_deal' — user asks to CHANGE an existing deal "
                            "(change stage, amount, date). "
                            "• 'create_client' — ONLY when explicitly asked to add "
                            "a new PERSON or COMPANY to the client database."
                        ),
                    },
                    "payload": {
                        "type": "object",
                        "description": (
                            "Data dictionary for the API. NEVER leave empty! "
                            "If action_type='create_task', MUST include: "
                            "'title' (string — task name), "
                            "'deadline' (string YYYY-MM-DD — deadline date), "
                            "'task_type' (string: 'call', 'meeting', or 'email'). "
                            "If action_type='create_deal', MUST include: "
                            "'title' (string — deal name), "
                            "'amount' (string — amount, e.g. '500000'), "
                            "'currency' (string: 'KZT', 'RUB', 'USD', or 'EUR'). "
                            "Optional: 'client_name' (client name), "
                            "'stage' (default 'new'), 'expected_close_date' (YYYY-MM-DD). "
                            "If action_type='update_deal', MUST include: "
                            "'deal_id' (integer — deal ID), and one or more of: "
                            "'stage', 'amount', 'expected_close_date'. "
                            "If action_type='create_client', MUST include: "
                            "'first_name' (string), 'last_name' (string), "
                            "plus 'phone', 'email', 'company' if available."
                        ),
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": (
                                    "Name of the task or deal (for create_task / create_deal). "
                                    "Write this in the current UI language."
                                ),
                            },
                            "deadline": {
                                "type": "string",
                                "description": "Deadline in YYYY-MM-DD format (for create_task)",
                            },
                            "task_type": {
                                "type": "string",
                                "enum": ["call", "meeting", "email"],
                                "description": "Task type (for create_task)",
                            },
                            "description": {
                                "type": "string",
                                "description": (
                                    "Detailed notes about the task or deal (optional). "
                                    "Write this in the current UI language."
                                ),
                            },
                            "client_name": {
                                "type": "string",
                                "description": "Client name to link to the deal (for create_deal)",
                            },
                            "amount": {
                                "type": "string",
                                "description": "Deal amount, numbers only (for create_deal / update_deal)",
                            },
                            "currency": {
                                "type": "string",
                                "enum": ["KZT", "RUB", "USD", "EUR"],
                                "description": "Deal currency (for create_deal)",
                            },
                            "stage": {
                                "type": "string",
                                "enum": ["new", "in_progress", "proposal", "negotiation", "payment", "closed_won", "closed_lost"],
                                "description": "Deal stage (for create_deal / update_deal, default 'new')",
                            },
                            "deal_id": {
                                "type": "integer",
                                "description": "Deal ID (for update_deal)",
                            },
                            "expected_close_date": {
                                "type": "string",
                                "description": "Expected close date YYYY-MM-DD",
                            },
                            "first_name": {
                                "type": "string",
                                "description": "Client first name (for create_client)",
                            },
                            "last_name": {
                                "type": "string",
                                "description": "Client last name (for create_client)",
                            },
                            "phone": {
                                "type": "string",
                                "description": "Client phone number",
                            },
                            "email": {
                                "type": "string",
                                "description": "Client email address",
                            },
                            "company": {
                                "type": "string",
                                "description": "Client company name",
                            },
                        },
                    },
                    "human_description": {
                        "type": "string",
                        "description": (
                            "A clear, human-readable description of the action "
                            "for the user. MUST be written in the current UI language. "
                            "Should include key data from payload (name, date, type)."
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

    The system prompt is built dynamically based on the current locale
    (from Django's LocaleMiddleware / Accept-Language header).

    Returns
    -------
    dict
        {
            "reply": str,             # AI text (or confirmation prompt)
            "proposed_action": dict | None   # CRM action if function was called
        }
    """

    # Build system prompt with current locale
    system_prompt = _build_system_prompt()

    messages = [{
        "role": "system",
        "content": system_prompt,
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
                logger.debug("RAW LLM ARGUMENTS: %s", tool_call.function.arguments)
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
