/**
 * BizConnect CRM — AI Chat Widget
 *
 * Floating chat with OpenAI-powered assistant.
 * - Sends messages to POST /api/ai/chat/
 * - Renders proposed CRM actions as interactive cards
 * - "Apply" executes the action via the relevant API endpoint
 * - Voice input via Whisper STT (POST /api/ai/transcribe/)
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
    Mic,
    Square,
} from "lucide-react";
import api from "@/lib/api";
import { useCRMStore } from "@/lib/store";
import { useTranslations } from "next-intl";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

/* ── Types ─────────────────────────────────── */

interface ProposedAction {
    action_type: "create_task" | "create_deal" | "update_deal" | "create_client";
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

/* ── Component ─────────────────────────────── */

export default function AIChatWidget() {
    const { data: session } = useSession();
    const t = useTranslations("AIChat");
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 0,
            role: "ai",
            text: t("greeting"),
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const nextId = useRef(1);

    // Voice recording
    const {
        isRecording,
        recordingTime,
        audioBlob,
        error: micError,
        startRecording,
        stopRecording,
    } = useAudioRecorder();

    // Format seconds → MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // Transcribe audio blob when recording stops
    const handleTranscribe = useCallback(async (blob: Blob) => {
        setTranscribing(true);
        try {
            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");
            const res = await api.post<{ text: string }>("/ai/transcribe/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data.text) {
                setInput((prev) => (prev ? prev + " " + res.data.text : res.data.text));
                inputRef.current?.focus();
            }
        } catch (err) {
            console.error("Transcription failed:", err);
            addMessage({ role: "system", text: t("transcribeError") });
        } finally {
            setTranscribing(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t]);

    // When audioBlob appears (after stopRecording), send to Whisper
    useEffect(() => {
        if (audioBlob) {
            handleTranscribe(audioBlob);
        }
    }, [audioBlob, handleTranscribe]);

    // Show mic error as system message
    useEffect(() => {
        if (micError) {
            addMessage({ role: "system", text: t("micUnavailable") });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [micError]);

    // Don't render for unauthenticated users
    if (!session) return null;

    const { invalidateTasks, invalidateDeals, invalidateClients } = useCRMStore.getState();

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
            // Build conversation history for context (OpenAI format)
            const history = messages
                .filter((m) => m.role === "user" || m.role === "ai")
                .map((m) => ({
                    role: m.role === "ai" ? "assistant" : "user",
                    content: m.text,
                }));

            const res = await api.post<{
                reply: string;
                proposed_action: ProposedAction | null;
            }>("/ai/chat/", { message: text, history });

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
                text: t("chatError"),
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
                case "create_deal":
                    endpoint = "/deals/";
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

            // Clean payload: remove non-API keys
            const payload = { ...action.payload };
            if (action.action_type === "update_deal") {
                delete payload.deal_id;
            }

            await api[method](endpoint, payload);

            // Invalidate store → trigger auto-refresh on relevant page
            if (action.action_type === "create_task") invalidateTasks();
            else if (action.action_type === "create_deal" || action.action_type === "update_deal") invalidateDeals();
            else if (action.action_type === "create_client") invalidateClients();

            addMessage({
                role: "system",
                text: t("actionSuccess", { action: t(`actions.${action.action_type}`) }),
            });
        } catch (err) {
            console.error("Action apply error:", err);
            updateMessage(msgId, { actionStatus: "error" });
            addMessage({
                role: "system",
                text: t("actionError"),
            });
        }
    };

    const handleCancelAction = (msgId: number) => {
        updateMessage(msgId, { actionStatus: "cancelled" });
        addMessage({ role: "system", text: t("actionCancelled") });
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
                title={open ? t("closeChat") : t("openChat")}
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
                                    {t("title")}
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
                                {t("thinking")}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
                        {isRecording ? (
                            /* ── Recording state ── */
                            <div className="flex items-center gap-3">
                                <div className="flex-1 flex items-center gap-3 bg-slate-800/60 border border-red-500/30 rounded-xl px-4 py-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-sm text-red-400 font-mono">
                                        {formatTime(recordingTime)}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {t("recording")}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                                    title={t("stopRecording")}
                                >
                                    <Square className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            /* ── Normal input state ── */
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
                                    placeholder={transcribing ? t("transcribing") : t("placeholder")}
                                    disabled={loading || transcribing}
                                    className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    disabled={loading || transcribing}
                                    className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/60 disabled:opacity-30 rounded-xl transition-colors"
                                    title={t("voiceInput")}
                                >
                                    {transcribing ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || transcribing || !input.trim()}
                                    className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
                                    title={t("send")}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        )}
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
    const t = useTranslations("AIChat");
    return (
        <div className="mt-3 bg-slate-900/60 border border-slate-600/40 rounded-xl p-3">
            {/* Label */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    {t(`actions.${action.action_type}`)}
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
                        {t("apply")}
                    </button>
                    <button
                        onClick={() => onCancel(msgId)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700/40 border border-slate-600/30 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-700/60 transition-colors"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        {t("cancelAction")}
                    </button>
                </div>
            ) : status === "applied" ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("applied")}
                </div>
            ) : status === "error" ? (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    {t("error")}
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <XCircle className="w-3.5 h-3.5" />
                    {t("cancelled")}
                </div>
            )}
        </div>
    );
}
