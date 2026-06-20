"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ListTodo } from "lucide-react";
import { useTranslations } from "next-intl";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "@/lib/api";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateTaskModal({ onClose, onCreated }: Props) {
    const t = useTranslations("CreateTask");
    const tCommon = useTranslations("Common");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [taskType, setTaskType] = useState("call");
    const [deadline, setDeadline] = useState<Date | null>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError(t("titleRequired"));
            return;
        }
        if (!deadline) {
            setError(t("deadlineRequired"));
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.post("/tasks/", {
                title: title.trim(),
                description: description.trim(),
                task_type: taskType,
                deadline: deadline.toISOString(),
            });
            onCreated();
            onClose();
        } catch (err: unknown) {
            console.error("Failed to create task:", err);
            setError(t("createError"));
        } finally {
            setLoading(false);
        }
    };

    const inputCls =
        "w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all text-sm";
    const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

    return (
        <>
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10">
                                <ListTodo className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">
                                {t("title")}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                            title={tCommon("close")}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        <div>
                            <label className={labelCls}>
                                {t("taskTitle")} <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder={t("taskTitlePlaceholder")}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={inputCls}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className={labelCls}>{t("description")}</label>
                            <textarea
                                placeholder={t("descriptionPlaceholder")}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className={inputCls + " resize-none"}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>{t("taskType")}</label>
                                <select
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value)}
                                    className={inputCls}
                                    title={t("taskType")}
                                >
                                    <option value="call">📞 {t("types.call")}</option>
                                    <option value="meeting">📅 {t("types.meeting")}</option>
                                    <option value="email">📧 {t("types.email")}</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>
                                    {t("deadline")} <span className="text-red-400">*</span>
                                </label>
                                <DatePicker
                                    selected={deadline}
                                    onChange={(date: Date | null) => setDeadline(date)}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="Pp"
                                    placeholderText={t("deadlinePlaceholder")}
                                    className={inputCls}
                                    wrapperClassName="w-full"
                                    calendarClassName="crm-datepicker"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/50 rounded-xl transition-all"
                            >
                                {tCommon("cancel")}
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t("submit")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style jsx global>{`
                .react-datepicker {
                    background-color: #1e293b !important;
                    border: 1px solid rgba(51, 65, 85, 0.5) !important;
                    border-radius: 1rem !important;
                    color: #fff !important;
                    font-family: inherit !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                }
                .react-datepicker__header {
                    background-color: #0f172a !important;
                    border-bottom: 1px solid rgba(51, 65, 85, 0.5) !important;
                    border-radius: 1rem 1rem 0 0 !important;
                }
                .react-datepicker__current-month,
                .react-datepicker__day-name,
                .react-datepicker-time__header {
                    color: #e2e8f0 !important;
                }
                .react-datepicker__day {
                    color: #cbd5e1 !important;
                    border-radius: 0.5rem !important;
                }
                .react-datepicker__day:hover {
                    background-color: #334155 !important;
                    color: #fff !important;
                }
                .react-datepicker__day--selected,
                .react-datepicker__day--keyboard-selected {
                    background-color: #10b981 !important;
                    color: #fff !important;
                }
                .react-datepicker__day--today {
                    font-weight: bold;
                    color: #34d399 !important;
                }
                .react-datepicker__day--disabled {
                    color: #475569 !important;
                }
                .react-datepicker__time-container {
                    border-left: 1px solid rgba(51, 65, 85, 0.5) !important;
                }
                .react-datepicker__time-list-item {
                    color: #cbd5e1 !important;
                }
                .react-datepicker__time-list-item:hover {
                    background-color: #334155 !important;
                    color: #fff !important;
                }
                .react-datepicker__time-list-item--selected {
                    background-color: #10b981 !important;
                    color: #fff !important;
                }
                .react-datepicker__navigation-icon::before {
                    border-color: #94a3b8 !important;
                }
                .react-datepicker__navigation:hover *::before {
                    border-color: #fff !important;
                }
                .react-datepicker__triangle {
                    display: none !important;
                }
                .react-datepicker-popper {
                    z-index: 60 !important;
                }
            `}</style>
        </>
    );
}
