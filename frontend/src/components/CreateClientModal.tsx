/**
 * CreateClientModal — modal for creating a new client
 *
 * Fields: first_name (required), last_name, phone, email, company
 * Sends POST /clients/ then calls onCreated() callback.
 * i18n via useTranslations('CreateClient')
 */

"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateClientModal({ onClose, onCreated }: Props) {
    const t = useTranslations("CreateClient");
    const tCommon = useTranslations("Common");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [company, setCompany] = useState("");

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim()) {
            setError(t("firstNameRequired"));
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.post("/clients/", {
                first_name: firstName.trim(),
                last_name: lastName.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                company: company.trim() || undefined,
            });
            onCreated();
            onClose();
        } catch (err: unknown) {
            console.error("Failed to create client:", err);
            setError(t("createError"));
        } finally {
            setLoading(false);
        }
    };

    const inputCls =
        "w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm";
    const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10">
                                <Users className="w-5 h-5 text-blue-400" />
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

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        {/* First Name + Last Name */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>
                                    {t("firstName")} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder={t("firstNamePlaceholder")}
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className={inputCls}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t("lastName")}</label>
                                <input
                                    type="text"
                                    placeholder={t("lastNamePlaceholder")}
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className={labelCls}>{t("phone")}</label>
                            <input
                                type="tel"
                                placeholder={t("phonePlaceholder")}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={inputCls}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className={labelCls}>{t("email")}</label>
                            <input
                                type="email"
                                placeholder={t("emailPlaceholder")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputCls}
                            />
                        </div>

                        {/* Company */}
                        <div>
                            <label className={labelCls}>{t("company")}</label>
                            <input
                                type="text"
                                placeholder={t("companyPlaceholder")}
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className={inputCls}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        {/* Actions */}
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
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
