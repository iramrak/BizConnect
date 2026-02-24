/**
 * CleanDerect CRM — Sidebar Navigation
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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

const navItems = [
    { href: "/", label: "Дашборд", icon: LayoutDashboard },
    { href: "/clients", label: "Клиенты", icon: Users },
    { href: "/deals", label: "Сделки", icon: Handshake },
    { href: "/tasks", label: "Задачи", icon: ListChecks },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);

    if (!session) return null;

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
                            <span className="text-white font-bold text-sm">CD</span>
                        </div>
                        <span className="text-white font-semibold text-lg tracking-tight">
                            CleanDerect
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
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon
                                className={`w-5 h-5 shrink-0 ${isActive ? "text-blue-400" : ""
                                    }`}
                            />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

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
                                {session.user?.role === "admin"
                                    ? "Администратор"
                                    : session.user?.role === "head"
                                        ? "Руководитель"
                                        : "Менеджер"}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                        title="Выйти"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
