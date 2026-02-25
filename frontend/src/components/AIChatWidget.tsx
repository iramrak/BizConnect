/**
 * CleanDerect CRM — AI Chat Widget
 *
 * Floating chat with OpenAI-powered assistant.
 * - Sends messages to POST /api/ai/chat/
 * - Renders proposed CRM actions as interactive cards
 * - "Apply" executes the action via the relevant API endpoint
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Bot,
    X,
    Send,
    Loader2,
    CheckCircle2,
    XCircle,
    Sparkles,
    ChevronDown,
} from "lucide-react";
import api from "@/lib/api";

/* ── Types ─────────────────────────────────── */

interface ProposedAction {
    action_type: "create_task" | "update_deal" | "create_client";
    payload: Record<string, unknown>;
    human_description: string;
}

interface ChatMessage {
    id: number;
    role: "user" | "ai" | "system";
    text: string;
    proposedAction?: ProposedAction;
    actionStatus?: "pending" | "applied" | "cancelled" | "error";
}

/* ── Action labels ─────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
    create_task: "Создать задачу",
    update_deal: "Обновить сделку",
    create_client: "Добавить клиента",
};

/* ── Component ─────────────────────────────── */

export default function AIChatWidget() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 0,
            role: "ai",
            text: "Привет! Я ИИ-ассистент CleanDerect. Чем могу помочь?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const nextId = useRef(1);

    // Don't render for unauthenticated users
    if (!session) return null;

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    };

    const addMessage = (msg: Omit<ChatMessage, "id">): number => {
        const id = nextId.current++;
        setMessages((prev) => [...prev, { ...msg, id }]);
        scrollToBottom();
        return id;
    };

    const updateMessage = (id: number, updates: Partial<ChatMessage>) => {
        setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
        );
    };

    /* ── Send message ────────────────────────── */

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput("");
        addMessage({ role: "user", text });
        setLoading(true);
        scrollToBottom();

        try {
            const res = await api.post<{
                reply: string;
                proposed_action: ProposedAction | null;
            }>("/ai/chat/", { message: text });

            const { reply, proposed_action } = res.data;

            addMessage({
                role: "ai",
                text: reply,
                proposedAction: proposed_action ?? undefined,
                actionStatus: proposed_action ? "pending" : undefined,
            });
        } catch (err) {
            console.error("AI chat error:", err);
            addMessage({
                role: "system",
                text: "⚠️ Не удалось связаться с ИИ. Попробуйте позже.",
            });
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    /* ── Apply CRM action ───────────────────── */

    const handleApplyAction = async (msgId: number, action: ProposedAction) => {
        updateMessage(msgId, { actionStatus: "applied" });

        try {
            let endpoint = "";
            let method: "post" | "patch" = "post";

            switch (action.action_type) {
                case "create_task":
                    endpoint = "/tasks/";
                    break;
                case "create_client":
                    endpoint = "/clients/";
                    break;
                case "update_deal": {
                    const dealId = action.payload.deal_id;
                    endpoint = `/deals/${dealId}/`;
                    method = "patch";
                    break;
                }
            }

            // Remove deal_id from payload for PATCH (it's in the URL)
            const payload = { ...action.payload };
            if (action.action_type === "update_deal") {
                delete payload.deal_id;
            }

            await api[method](endpoint, payload);

            addMessage({
                role: "system",
                text: `✅ ${ACTION_LABELS[action.action_type] ?? "Действие"} выполнено успешно.`,
            });
        } catch (err) {
            console.error("Action apply error:", err);
            updateMessage(msgId, { actionStatus: "error" });
            addMessage({
                role: "system",
                text: "❌ Ошибка при выполнении действия. Проверьте данные и попробуйте снова.",
            });
        }
    };

    const handleCancelAction = (msgId: number) => {
        updateMessage(msgId, { actionStatus: "cancelled" });
        addMessage({ role: "system", text: "Действие отменено." });
    };

    /* ── Render ──────────────────────────────── */

    return (
        <>
            {/* ── FAB Button ───────────────────── */}
            <button
                onClick={() => {
                    setOpen(!open);
                    if (!open) setTimeout(() => inputRef.current?.focus(), 200);
                }}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${open
                        ? "bg-slate-700 hover:bg-slate-600 rotate-0"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/30"
                    }`}
                title={open ? "Закрыть чат" : "ИИ-ассистент"}
            >
                {open ? (
                    <ChevronDown className="w-6 h-6 text-white" />
                ) : (
                    <Bot className="w-6 h-6 text-white" />
                )}
            </button>

            {/* ── Chat Window ──────────────────── */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 w-96 h-[520px] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">
                                    ИИ-ассистент
                                </h3>
                                <p className="text-[11px] text-slate-500">gpt-4o-mini</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                onApply={handleApplyAction}
                                onCancel={handleCancelAction}
                            />
                        ))}

                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 px-1">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                ИИ думает…
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex items-center gap-2"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Напишите сообщение…"
                                disabled={loading}
                                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
                                title="Отправить"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Message Bubble ────────────────────────── */

function MessageBubble({
    message,
    onApply,
    onCancel,
}: {
    message: ChatMessage;
    onApply: (msgId: number, action: ProposedAction) => void;
    onCancel: (msgId: number) => void;
}) {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser
                        ? "bg-blue-500 text-white rounded-br-md"
                        : isSystem
                            ? "bg-slate-800/60 text-slate-400 border border-slate-700/30 rounded-bl-md text-xs"
                            : "bg-slate-800/80 text-slate-200 border border-slate-700/40 rounded-bl-md"
                    }`}
            >
                <p className="whitespace-pre-wrap">{message.text}</p>

                {/* Action Card */}
                {message.proposedAction && (
                    <ActionCard
                        msgId={message.id}
                        action={message.proposedAction}
                        status={message.actionStatus ?? "pending"}
                        onApply={onApply}
                        onCancel={onCancel}
                    />
                )}
            </div>
        </div>
    );
}

/* ── Action Card (Human-in-the-loop) ───────── */

function ActionCard({
    msgId,
    action,
    status,
    onApply,
    onCancel,
}: {
    msgId: number;
    action: ProposedAction;
    status: "pending" | "applied" | "cancelled" | "error";
    onApply: (msgId: number, action: ProposedAction) => void;
    onCancel: (msgId: number) => void;
}) {
    return (
        <div className="mt-3 bg-slate-900/60 border border-slate-600/40 rounded-xl p-3">
            {/* Label */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    {ACTION_LABELS[action.action_type] ?? "Действие"}
                </span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 mb-3">{action.human_description}</p>

            {/* Status / Buttons */}
            {status === "pending" ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onApply(msgId, action)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-colors"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Применить
                    </button>
                    <button
                        onClick={() => onCancel(msgId)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700/40 border border-slate-600/30 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-700/60 transition-colors"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Отмена
                    </button>
                </div>
            ) : status === "applied" ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Выполнено
                </div>
            ) : status === "error" ? (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    Ошибка
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <XCircle className="w-3.5 h-3.5" />
                    Отменено
                </div>
            )}
        </div>
    );
}
