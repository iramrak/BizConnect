"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Handshake } from "lucide-react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateDealModal({ onClose, onCreated }: Props) {
    const t = useTranslations("CreateDeal");
    const tCommon = useTranslations("Common");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("KZT");
    const [expectedCloseDate, setExpectedCloseDate] = useState("");

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

        setLoading(true);
        setError("");

        try {
            await api.post("/deals/", {
                title: title.trim(),
                client_name: clientName.trim() || undefined,
                client_phone: clientPhone.trim() || undefined,
                amount: amount ? parseFloat(amount) : 0,
                currency,
                expected_close_date: expectedCloseDate || null,
            });
            onCreated();
            onClose();
        } catch (err: unknown) {
            console.error("Failed to create deal:", err);
            setError(t("createError"));
        } finally {
            setLoading(false);
        }
    };

    const inputCls =
        "w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm";
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
                            <div className="p-2 rounded-xl bg-indigo-500/10">
                                <Handshake className="w-5 h-5 text-indigo-400" />
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
                                {t("dealTitle")} <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder={t("dealTitlePlaceholder")}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={inputCls}
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>{t("clientName")}</label>
                                <input
                                    type="text"
                                    placeholder={t("clientNamePlaceholder")}
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t("clientPhone")}</label>
                                <input
                                    type="tel"
                                    placeholder={t("clientPhonePlaceholder")}
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className={labelCls}>{t("amount")}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="100000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t("currency")}</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className={inputCls}
                                    title={t("currency")}
                                >
                                    <option value="KZT">{t("currencies.KZT")}</option>
                                    <option value="RUB">{t("currencies.RUB")}</option>
                                    <option value="USD">{t("currencies.USD")}</option>
                                    <option value="EUR">{t("currencies.EUR")}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>
                                {t("expectedCloseDate")}
                            </label>
                            <input
                                type="date"
                                value={expectedCloseDate}
                                onChange={(e) => setExpectedCloseDate(e.target.value)}
                                className={inputCls}
                                title={t("expectedCloseDate")}
                            />
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
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t("submit")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
