/**
 * BizConnect CRM — Clients Page
 * i18n via useTranslations('Clients')
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Users, Phone, Mail, Building2, Loader2, Trash2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import api from "@/lib/api";
import { useCRMStore } from "@/lib/store";
import type { Client, PaginatedResponse } from "@/types";
import CreateClientModal from "@/components/CreateClientModal";

export default function ClientsPage() {
    const t = useTranslations("Clients");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [totalCount, setTotalCount] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const invalidateClients = useCRMStore((s) => s.invalidateClients);

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(t("deleteClient", { name }))) return;
        try {
            await api.delete(`/clients/${id}/`);
            setClients((prev) => prev.filter((c) => c.id !== id));
            setTotalCount((prev) => prev - 1);
            invalidateClients();
        } catch (err) {
            console.error("Failed to delete client:", err);
        }
    };

    const fetchClients = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (query.trim()) params.search = query.trim();
            const res = await api.get<PaginatedResponse<Client>>("/clients/", { params });
            setClients(res.data.results);
            setTotalCount(res.data.count);
        } catch (err) {
            console.error("Failed to fetch clients:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchClients(""); }, [fetchClients]);

    // Auto-refresh when AI (or modal) creates a client
    const clientsVersion = useCRMStore((s) => s.clientsVersion);
    useEffect(() => {
        if (clientsVersion > 0) fetchClients(search);
    }, [clientsVersion, fetchClients, search]);

    useEffect(() => {
        const timeout = setTimeout(() => fetchClients(search), 400);
        return () => clearTimeout(timeout);
    }, [search, fetchClients]);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });

    const pluralize = (count: number): string => {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return t("plurals.one");
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t("plurals.few");
        return t("plurals.many");
    };

    return (
        <>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        {t("title")}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {loading ? tCommon("loading") : `${totalCount} ${pluralize(totalCount)}`}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-200"
                >
                    <Plus className="w-4 h-4" />
                    {t("addClient")}
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm"
                />
                {loading && search && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
                )}
            </div>

            <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("table.name")}</th>
                                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {t("table.company")}</span>
                                </th>
                                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t("table.phone")}</span>
                                </th>
                                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {t("table.email")}</span>
                                </th>
                                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("table.added")}</th>
                                <th className="w-12" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-500">
                                        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        {search ? t("notFound") : t("empty")}
                                    </td>
                                </tr>
                            ) : clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-700/20 transition-colors cursor-pointer group">
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {client.first_name.charAt(0).toUpperCase()}{client.last_name?.charAt(0)?.toUpperCase() || ""}
                                            </div>
                                            <p className="text-white font-medium">{client.first_name} {client.last_name}</p>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-300">{client.company || <span className="text-slate-600">—</span>}</td>
                                    <td className="py-3.5 px-5">{client.phone ? <span className="text-slate-300 font-mono text-xs">{client.phone}</span> : <span className="text-slate-600">—</span>}</td>
                                    <td className="py-3.5 px-5">{client.email ? <span className="text-blue-400 hover:underline text-xs">{client.email}</span> : <span className="text-slate-600">—</span>}</td>
                                    <td className="py-3.5 px-5 text-slate-500 text-xs">{formatDate(client.created_at)}</td>
                                    <td className="py-3.5 px-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id, `${client.first_name} ${client.last_name}`.trim()); }}
                                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100" title={tCommon("delete")}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

            {showCreateModal && (
                <CreateClientModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        fetchClients(search);
                        invalidateClients();
                    }}
                />
            )}
        </>
    );
}

function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            <td className="py-3.5 px-5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-slate-700" /><div className="h-4 w-28 bg-slate-700 rounded" /></div></td>
            <td className="py-3.5 px-5"><div className="h-4 w-24 bg-slate-700 rounded" /></td>
            <td className="py-3.5 px-5"><div className="h-4 w-28 bg-slate-700 rounded" /></td>
            <td className="py-3.5 px-5"><div className="h-4 w-32 bg-slate-700 rounded" /></td>
            <td className="py-3.5 px-5"><div className="h-4 w-20 bg-slate-700 rounded" /></td>
        </tr>
    );
}
