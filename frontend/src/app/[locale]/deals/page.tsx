/**
 * BizConnect CRM — Deals Kanban Board
 *
 * Features:
 * - Drag & Drop with @hello-pangea/dnd
 * - Optimistic stage change via PATCH
 * - Deal detail slide-over modal
 * - Zustand auto-refresh integration
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Handshake,
    Plus,
    DollarSign,
    CalendarDays,
    User,
    ChevronDown,
    Loader2,
    X,
    Building2,
    Clock,
    TrendingUp,
    Mail,
    Phone,
    Trash2,
} from "lucide-react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";
import { useTranslations, useLocale } from "next-intl";
import api from "@/lib/api";
import { useCRMStore } from "@/lib/store";
import type { Deal, DealStage, PaginatedResponse } from "@/types";
import CreateDealModal from "@/components/CreateDealModal";

/* ── Stage config ─────────────────────────── */

interface StageConfig {
    key: DealStage;
    labelKey: string;
    color: string;
    colorTo: string;
    bg: string;
    dot: string;
}

const STAGES: StageConfig[] = [
    { key: "new", labelKey: "stages.new", color: "from-sky-500", colorTo: "to-sky-600", bg: "bg-sky-500/5", dot: "bg-sky-400" },
    { key: "in_progress", labelKey: "stages.in_progress", color: "from-amber-500", colorTo: "to-amber-600", bg: "bg-amber-500/5", dot: "bg-amber-400" },
    { key: "proposal", labelKey: "stages.proposal", color: "from-violet-500", colorTo: "to-violet-600", bg: "bg-violet-500/5", dot: "bg-violet-400" },
    { key: "negotiation", labelKey: "stages.negotiation", color: "from-orange-500", colorTo: "to-orange-600", bg: "bg-orange-500/5", dot: "bg-orange-400" },
    { key: "payment", labelKey: "stages.payment", color: "from-blue-500", colorTo: "to-blue-600", bg: "bg-blue-500/5", dot: "bg-blue-400" },
    { key: "closed_won", labelKey: "stages.closed_won", color: "from-emerald-500", colorTo: "to-emerald-600", bg: "bg-emerald-500/5", dot: "bg-emerald-400" },
    { key: "closed_lost", labelKey: "stages.closed_lost", color: "from-red-500", colorTo: "to-red-600", bg: "bg-red-500/5", dot: "bg-red-400" },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

type GroupedDeals = Record<DealStage, Deal[]>;

function groupByStage(deals: Deal[]): GroupedDeals {
    const grouped: GroupedDeals = {
        new: [], in_progress: [], proposal: [], negotiation: [],
        payment: [], closed_won: [], closed_lost: [],
    };
    for (const deal of deals) {
        if (grouped[deal.stage]) grouped[deal.stage].push(deal);
    }
    return grouped;
}

/* ── Page ──────────────────────────────────── */

export default function DealsPage() {
    const t = useTranslations("Deals");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const invalidateDeals = useCRMStore((s) => s.invalidateDeals);

    const fetchDeals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<PaginatedResponse<Deal>>("/deals/", {
                params: { page_size: 200 },
            });
            setDeals(res.data.results);
        } catch (err) {
            console.error("Failed to fetch deals:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDeals(); }, [fetchDeals]);

    // Auto-refresh when AI creates/updates a deal
    const dealsVersion = useCRMStore((s) => s.dealsVersion);
    useEffect(() => {
        if (dealsVersion > 0) fetchDeals();
    }, [dealsVersion, fetchDeals]);

    const handleStageChange = async (dealId: number, newStage: DealStage) => {
        setDeals((prev) =>
            prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
        );
        try {
            await api.patch(`/deals/${dealId}/`, { stage: newStage });
        } catch (err) {
            console.error("Failed to update stage:", err);
            fetchDeals();
        }
    };

    const handleDelete = async (dealId: number, title: string) => {
        if (!window.confirm(t("deleteDeal", { title }))) return;
        try {
            await api.delete(`/deals/${dealId}/`);
            setDeals((prev) => prev.filter((d) => d.id !== dealId));
            invalidateDeals();
        } catch (err) {
            console.error("Failed to delete deal:", err);
        }
    };

    /* ── Drag & Drop handler ────────────── */
    const onDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result;
        if (!destination) return;

        const newStage = destination.droppableId as DealStage;
        const dealId = parseInt(draggableId, 10);
        const deal = deals.find((d) => d.id === dealId);

        if (!deal || deal.stage === newStage) return;

        handleStageChange(dealId, newStage);
    };

    const grouped = groupByStage(deals);
    const totalAmount = deals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
    const stageLabel = (s: StageConfig) => t(s.labelKey);

    return (
        <div className="h-full flex flex-col">
            {/* ── Header ─────────────────────────── */}
            <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10">
                                <Handshake className="w-6 h-6 text-indigo-400" />
                            </div>
                            {t("title")}
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">
                            {loading
                                ? tCommon("loading")
                                : t("dealsInPipeline", { count: deals.length, amount: formatMoney(totalAmount, locale) })}
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-200"
                    >
                        <Plus className="w-4 h-4" />
                        {t("newDeal")}
                    </button>
                </div>
            </div>

            {/* ── Kanban Board with DnD ────────────── */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 lg:px-8 pb-6">
                    <div className="flex gap-4 h-full min-w-max">
                        {STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.key}
                                stage={stage}
                                deals={grouped[stage.key]}
                                loading={loading}
                                onStageChange={handleStageChange}
                                onCardClick={setSelectedDeal}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            </DragDropContext>

            {/* ── Deal Detail Modal ──────────────── */}
            {selectedDeal && (
                <DealDetailModal
                    deal={selectedDeal}
                    onClose={() => setSelectedDeal(null)}
                />
            )}

            {showCreateModal && (
                <CreateDealModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        fetchDeals();
                        invalidateDeals();
                    }}
                />
            )}
        </div>
    );
}

/* ── Kanban Column (Droppable) ─────────────── */

function KanbanColumn({
    stage,
    deals,
    loading,
    onStageChange,
    onCardClick,
    onDelete,
}: {
    stage: StageConfig;
    deals: Deal[];
    loading: boolean;
    onStageChange: (dealId: number, newStage: DealStage) => void;
    onCardClick: (deal: Deal) => void;
    onDelete: (dealId: number, title: string) => void;
}) {
    const t = useTranslations("Deals");
    const locale = useLocale();
    const stageTotal = deals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);

    return (
        <div className="w-72 shrink-0 flex flex-col bg-slate-800/20 border border-slate-700/30 rounded-2xl">
            {/* Column Header */}
            <div className="px-4 py-3 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                        <span className="text-sm font-semibold text-white">{t(stage.labelKey)}</span>
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                            {deals.length}
                        </span>
                    </div>
                </div>
                {deals.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1 ml-5">
                        {formatMoney(stageTotal, locale)}
                    </p>
                )}
            </div>

            {/* Droppable Cards Area */}
            <Droppable droppableId={stage.key}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin transition-colors duration-200 ${snapshot.isDraggingOver ? "bg-slate-700/10" : ""
                            }`}
                    >
                        {loading
                            ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                            : deals.map((deal, index) => (
                                <Draggable
                                    key={deal.id}
                                    draggableId={String(deal.id)}
                                    index={index}
                                >
                                    {(dragProvided, dragSnapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                        >
                                            <DealCard
                                                deal={deal}
                                                stageColor={stage.color}
                                                onStageChange={onStageChange}
                                                onClick={() => onCardClick(deal)}
                                                onDelete={onDelete}
                                                isDragging={dragSnapshot.isDragging}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}

/* ── Deal Card ─────────────────────────────── */

function DealCard({
    deal,
    stageColor,
    onStageChange,
    onClick,
    onDelete,
    isDragging,
}: {
    deal: Deal;
    stageColor: string;
    onStageChange: (dealId: number, newStage: DealStage) => void;
    onClick: () => void;
    onDelete: (dealId: number, title: string) => void;
    isDragging: boolean;
}) {
    const t = useTranslations("Deals");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen]);

    const clientName = deal.client
        ? `${deal.client.first_name} ${deal.client.last_name}`.trim()
        : "—";

    return (
        <div
            onClick={onClick}
            className={`bg-slate-800/60 border border-slate-700/40 rounded-xl p-3.5 hover:border-slate-600/60 transition-all group cursor-pointer ${isDragging ? "shadow-2xl shadow-black/50 ring-2 ring-blue-500/40 rotate-2 scale-105" : ""
                }`}
        >
            {/* Title + Menu */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
                <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">
                    {deal.title}
                </h3>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(deal.id, deal.title); }}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 mr-0.5"
                        title={tCommon("delete")}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors opacity-0 group-hover:opacity-100"
                        title={t("changeStage")}
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700/50 mb-1">
                                <span className="text-xs text-slate-400 font-medium">{t("changeStage")}</span>
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} className="text-slate-500 hover:text-white" title={tCommon("close")}>
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            {STAGES.map((s) => (
                                <button
                                    key={s.key}
                                    disabled={s.key === deal.stage}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStageChange(deal.id, s.key);
                                        setMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${s.key === deal.stage
                                        ? "text-slate-600 cursor-default"
                                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                        }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                                    {t(s.labelKey)}
                                    {s.key === deal.stage && (
                                        <span className="ml-auto text-slate-600">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Client */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{clientName}</span>
            </div>

            {/* Amount + Date */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">
                        {formatMoney(parseFloat(deal.amount || "0"), locale)}
                    </span>
                    <span className="text-xs text-slate-500 ml-0.5">{deal.currency}</span>
                </div>

                {deal.expected_close_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <CalendarDays className="w-3 h-3" />
                        {formatShortDate(deal.expected_close_date, locale)}
                    </div>
                )}
            </div>

            {/* Probability bar */}
            {deal.probability > 0 && (
                <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500">{t("probability")}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{deal.probability}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-linear-to-r ${stageColor} to-blue-500 transition-all duration-500`}
                            style={{ width: `${deal.probability}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Deal Detail Modal (Slide-over) ──────── */

function DealDetailModal({
    deal,
    onClose,
}: {
    deal: Deal;
    onClose: () => void;
}) {
    const t = useTranslations("Deals");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const stageConfig = STAGE_MAP[deal.stage];
    const clientName = deal.client
        ? `${deal.client.first_name} ${deal.client.last_name}`.trim()
        : "—";

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-slate-900 border-l border-slate-700/50 shadow-2xl shadow-black/50 animate-in slide-in-from-right duration-300 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/40 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold text-white truncate pr-4">
                        {deal.title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors shrink-0"
                        title={tCommon("close")}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Stage badge */}
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stageConfig?.dot ?? "bg-slate-500"}`} />
                        <span className="text-sm font-medium text-white">
                            {stageConfig ? t(stageConfig.labelKey) : deal.stage}
                        </span>
                        {deal.probability > 0 && (
                            <span className="ml-auto text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                                <TrendingUp className="w-3 h-3 inline mr-1" />
                                {deal.probability}%
                            </span>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t("detail.budget")}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-400">
                                {formatMoney(parseFloat(deal.amount || "0"), locale)}
                            </span>
                            <span className="text-sm text-slate-400">{deal.currency_display || deal.currency}</span>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="space-y-3">
                        <DetailRow
                            icon={User}
                            label={t("detail.client")}
                            value={clientName}
                        />
                        {deal.client?.phone && (
                            <DetailRow
                                icon={Phone}
                                label={t("detail.phone")}
                                value={deal.client.phone}
                            />
                        )}
                        <DetailRow
                            icon={Building2}
                            label={t("detail.manager")}
                            value={deal.manager?.full_name ?? "—"}
                        />
                        {deal.expected_close_date && (
                            <DetailRow
                                icon={CalendarDays}
                                label={t("detail.expectedClose")}
                                value={formatDate(deal.expected_close_date, locale)}
                            />
                        )}
                        <DetailRow
                            icon={Clock}
                            label={t("detail.created")}
                            value={formatDate(deal.created_at, locale)}
                        />
                        {deal.updated_at && (
                            <DetailRow
                                icon={Clock}
                                label={t("detail.updated")}
                                value={formatDate(deal.updated_at, locale)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-slate-700/20">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Icon className="w-4 h-4 shrink-0" />
                {label}
            </div>
            <span className="text-sm text-white font-medium text-right max-w-[200px] truncate">
                {value}
            </span>
        </div>
    );
}

/* ── Skeleton Card ─────────────────────────── */

function SkeletonCard() {
    return (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3.5 animate-pulse">
            <div className="h-4 w-3/4 bg-slate-700 rounded mb-3" />
            <div className="h-3 w-1/2 bg-slate-700 rounded mb-3" />
            <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-700 rounded" />
                <div className="h-3 w-16 bg-slate-700 rounded" />
            </div>
        </div>
    );
}

/* ── Helpers ───────────────────────────────── */

function formatMoney(value: number, locale: string = "ru"): string {
    return new Intl.NumberFormat(locale, {
        style: "decimal",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatShortDate(iso: string, locale: string = "ru"): string {
    return new Date(iso).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
    });
}

function formatDate(iso: string, locale: string = "ru"): string {
    return new Date(iso).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
