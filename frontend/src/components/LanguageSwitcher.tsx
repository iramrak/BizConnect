/**
 * CleanDerect CRM — Language Switcher
 *
 * Toggles between RU and KK locales.
 * - Uses next-intl navigation (useRouter + usePathname) for locale change
 * - Syncs locale into Zustand store for API consumers (e.g. AI chat)
 * - Glassmorphic pill design to match dark CRM theme
 */

"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useCRMStore } from "@/lib/store";
import { useEffect } from "react";
import { Globe } from "lucide-react";

interface LocaleOption {
    code: string;
    label: string;
    flag: string;
}

const LOCALES: LocaleOption[] = [
    { code: "ru", label: "RU", flag: "🇷🇺" },
    { code: "kk", label: "KK", flag: "🇰🇿" },
];

export default function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
    const currentLocale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const setLocale = useCRMStore((s) => s.setLocale);

    // Sync locale to Zustand on mount and when locale changes
    useEffect(() => {
        setLocale(currentLocale);
    }, [currentLocale, setLocale]);

    const handleSwitch = (newLocale: string) => {
        if (newLocale === currentLocale) return;

        // Navigate to the same path but with the new locale
        router.replace(pathname, { locale: newLocale });

        // Optimistically sync Zustand
        setLocale(newLocale);
    };

    // Collapsed sidebar — show only globe icon + current locale
    if (collapsed) {
        const next = LOCALES.find((l) => l.code !== currentLocale) ?? LOCALES[0];
        return (
            <button
                onClick={() => handleSwitch(next.code)}
                className="flex items-center justify-center w-10 h-10 rounded-xl
                           bg-slate-800/60 border border-slate-700/40
                           hover:bg-slate-700/60 hover:border-slate-600/50
                           transition-all duration-200 group"
                title={`Переключить на ${next.label}`}
            >
                <Globe className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>
        );
    }

    // Expanded sidebar — pill toggle
    return (
        <div className="flex items-center gap-2 px-1">
            <Globe className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="flex bg-slate-800/60 border border-slate-700/40 rounded-lg p-0.5 gap-0.5">
                {LOCALES.map((loc) => {
                    const isActive = loc.code === currentLocale;
                    return (
                        <button
                            key={loc.code}
                            onClick={() => handleSwitch(loc.code)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                                       transition-all duration-200
                                       ${isActive
                                    ? "bg-slate-700/80 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/30"
                                }`}
                        >
                            <span className="text-sm leading-none">{loc.flag}</span>
                            {loc.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
