/**
 * BizConnect CRM — Sidebar Navigation
 *
 * Features:
 * - Locale-aware links via next-intl navigation
 * - LanguageSwitcher integrated
 * - Collapsible sidebar
 */

"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
    LayoutDashboard,
    Users,
    Handshake,
    ListChecks,
    LogOut,
    ChevronLeft,
    Menu,
} from "lucide-react";
import { useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";

const navItems = [
    { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/clients", labelKey: "clients", icon: Users },
    { href: "/deals", labelKey: "deals", icon: Handshake },
    { href: "/tasks", labelKey: "tasks", icon: ListChecks },
] as const;

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);
    const t = useTranslations("Sidebar");

    if (!session) return null;

    const roleLabel =
        session.user?.role === "admin"
            ? t("admin")
            : session.user?.role === "head"
                ? t("head")
                : t("manager");

    return (
        <aside
            className={`${collapsed ? "w-20" : "w-64"
                } h-screen bg-slate-900 border-r border-slate-700/50 flex flex-col transition-all duration-300 shrink-0`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-700/50">
                {!collapsed && (
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-sm">BC</span>
                        </div>
                        <span className="text-white font-semibold text-lg tracking-tight">
                            BizConnect
                        </span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-blue-500/10 text-blue-400 shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                }`}
                            title={collapsed ? t(item.labelKey) : undefined}
                        >
                            <item.icon
                                className={`w-5 h-5 shrink-0 ${isActive ? "text-blue-400" : ""
                                    }`}
                            />
                            {!collapsed && <span>{t(item.labelKey)}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Language Switcher */}
            <div className={`px-3 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
                <LanguageSwitcher collapsed={collapsed} />
            </div>

            {/* User / Sign-out */}
            <div className="p-3 border-t border-slate-700/50">
                <div
                    className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"
                        } py-2`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                                {session.user?.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {roleLabel}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                        title={t("logout")}
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
