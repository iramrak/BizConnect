"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ListTodo,
    Plus,
    Phone,
    CalendarDays,
    Mail,
    CheckCircle2,
    Circle,
    Clock,
    AlertTriangle,
    Handshake,
    User,
    Loader2,
    Trash2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import api from "@/lib/api";
import { useCRMStore } from "@/lib/store";
import type { Task, PaginatedResponse } from "@/types";
import CreateTaskModal from "@/components/CreateTaskModal";

type TabKey = "all" | "today" | "overdue" | "completed";

const TAB_KEYS: TabKey[] = ["all", "today", "overdue", "completed"];

const TAB_ICONS: Record<TabKey, React.ElementType> = {
    all: ListTodo,
    today: CalendarDays,
    overdue: AlertTriangle,
    completed: CheckCircle2,
};

const TAB_COLORS: Record<TabKey, string> = {
    all: "text-blue-400",
    today: "text-amber-400",
    overdue: "text-red-400",
    completed: "text-emerald-400",
};

const TASK_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    call: { icon: Phone, color: "text-sky-400", bg: "bg-sky-400/10" },
    meeting: { icon: CalendarDays, color: "text-violet-400", bg: "bg-violet-400/10" },
    email: { icon: Mail, color: "text-amber-400", bg: "bg-amber-400/10" },
};

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function isOverdue(task: Task): boolean {
    if (!task.deadline || task.status === "completed") return false;
    return task.deadline < todayStr();
}

function isToday(task: Task): boolean {
    if (!task.deadline) return false;
    return task.deadline.slice(0, 10) === todayStr();
}

function formatDate(iso: string, locale: string = "ru"): string {
    return new Date(iso).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function filterTasks(tasks: Task[], tab: TabKey): Task[] {
    switch (tab) {
        case "today":
            return tasks.filter((t) => t.status === "open" && isToday(t));
        case "overdue":
            return tasks.filter((t) => isOverdue(t));
        case "completed":
            return tasks.filter((t) => t.status === "completed");
        default:
            return tasks;
    }
}

export default function TasksPage() {
    const t = useTranslations("Tasks");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const invalidateTasks = useCRMStore((s) => s.invalidateTasks);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<PaginatedResponse<Task>>("/tasks/", {
                params: { page_size: 200 },
            });
            setTasks(res.data.results);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const tasksVersion = useCRMStore((s) => s.tasksVersion);
    useEffect(() => {
        if (tasksVersion > 0) fetchTasks();
    }, [tasksVersion, fetchTasks]);

    const toggleStatus = async (task: Task) => {
        const newStatus = task.status === "completed" ? "open" : "completed";
        setTogglingId(task.id);

        setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, status: newStatus as Task["status"] } : t))
        );

        try {
            await api.patch(`/tasks/${task.id}/`, { status: newStatus });
        } catch (err) {
            console.error("Failed to toggle task:", err);
            fetchTasks();
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (taskId: number, taskTitle: string) => {
        if (!window.confirm(t("deleteTask", { title: taskTitle }))) return;
        try {
            await api.delete(`/tasks/${taskId}/`);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            invalidateTasks();
        } catch (err) {
            console.error("Failed to delete task:", err);
        }
    };

    const filtered = filterTasks(tasks, activeTab);
    const overdueCount = tasks.filter(isOverdue).length;

    return (
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10">
                            <ListTodo className="w-6 h-6 text-emerald-400" />
                        </div>
                        {t("title")}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {loading
                            ? tCommon("loading")
                            : overdueCount > 0
                                ? t("taskCountOverdue", { count: tasks.length, overdue: overdueCount })
                                : t("taskCount", { count: tasks.length })}
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200"
                >
                    <Plus className="w-4 h-4" />
                    {t("newTask")}
                </button>
            </div>

            <div className="flex gap-1 bg-slate-800/40 border border-slate-700/40 p-1 rounded-xl mb-6 overflow-x-auto">
                {TAB_KEYS.map((tabKey) => {
                    const TabIcon = TAB_ICONS[tabKey];
                    const tabColor = TAB_COLORS[tabKey];
                    const count =
                        tabKey === "all"
                            ? tasks.length
                            : tabKey === "today"
                                ? tasks.filter((tt) => tt.status === "open" && isToday(tt)).length
                                : tabKey === "overdue"
                                    ? overdueCount
                                    : tasks.filter((tt) => tt.status === "completed").length;

                    const isActive = activeTab === tabKey;

                    return (
                        <button
                            key={tabKey}
                            onClick={() => setActiveTab(tabKey)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                                ? "bg-slate-700/70 text-white shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/30"
                                }`}
                        >
                            <TabIcon className={`w-4 h-4 ${isActive ? tabColor : ""}`} />
                            {t(`tabs.${tabKey}`)}
                            <span
                                className={`text-xs px-1.5 py-0.5 rounded-full ${isActive
                                    ? "bg-slate-600/60 text-slate-200"
                                    : "bg-slate-700/40 text-slate-500"
                                    }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden divide-y divide-slate-700/30">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        {activeTab === "all"
                            ? t("empty.all")
                            : activeTab === "today"
                                ? t("empty.today")
                                : activeTab === "overdue"
                                    ? t("empty.overdue")
                                    : t("empty.completed")}
                    </div>
                ) : (
                    filtered.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            toggling={togglingId === task.id}
                            onToggle={toggleStatus}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {showCreateModal && (
                <CreateTaskModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        fetchTasks();
                        invalidateTasks();
                    }}
                />
            )}
        </div>
    );
}

function TaskRow({
    task,
    toggling,
    onToggle,
    onDelete,
}: {
    task: Task;
    toggling: boolean;
    onToggle: (task: Task) => void;
    onDelete: (taskId: number, title: string) => void;
}) {
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const completed = task.status === "completed";
    const overdue = isOverdue(task);

    const typeConfig = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.call;
    const TypeIcon = typeConfig.icon;

    const clientName = task.client
        ? `${task.client.first_name} ${task.client.last_name}`.trim()
        : null;

    const dealTitle = task.deal?.title ?? null;

    return (
        <div
            className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-700/15 group ${completed ? "opacity-60" : ""
                }`}
        >
            <button
                onClick={() => onToggle(task)}
                disabled={toggling}
                className="shrink-0 transition-transform active:scale-90"
            >
                {toggling ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                    <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                )}
            </button>

            <div className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span
                        className={`text-sm font-medium truncate ${completed ? "line-through text-slate-500" : "text-white"
                            }`}
                    >
                        {task.title}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {dealTitle && (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md">
                            <Handshake className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{dealTitle}</span>
                        </span>
                    )}
                    {clientName && (
                        <span className="inline-flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-md">
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{clientName}</span>
                        </span>
                    )}
                </div>
            </div>

            {task.deadline && (
                <div
                    className={`flex items-center gap-1.5 text-xs shrink-0 ${overdue
                        ? "text-red-400 font-medium"
                        : completed
                            ? "text-slate-600"
                            : "text-slate-500"
                        }`}
                >
                    {overdue ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                        <Clock className="w-3.5 h-3.5" />
                    )}
                    {formatDate(task.deadline, locale)}
                </div>
            )}

            <button
                onClick={() => onDelete(task.id, task.title)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                title={tCommon("delete")}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
            <div className="w-5 h-5 rounded-full bg-slate-700 shrink-0" />
            <div className="w-8 h-8 rounded-lg bg-slate-700 shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-700 rounded" />
                <div className="h-3 w-32 bg-slate-700 rounded" />
            </div>
            <div className="h-3 w-20 bg-slate-700 rounded shrink-0" />
        </div>
    );
}
