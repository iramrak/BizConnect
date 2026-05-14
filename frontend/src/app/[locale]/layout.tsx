/**
 * CleanDerect CRM — Locale Layout
 *
 * This is the main layout for all localized pages.
 * Wraps children with:
 * - NextIntlClientProvider (for client-side translations)
 * - AuthProvider (next-auth session)
 * - Sidebar + AIChatWidget
 *
 * The root app/layout.tsx is now a minimal pass-through.
 */

import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { routing } from "@/i18n/routing";
import AuthProvider from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import AIChatWidget from "@/components/AIChatWidget";
import "../globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin", "cyrillic"],
});

export async function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    // Validate locale
    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    // Load messages for NextIntlClientProvider
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body className={`${inter.variable} font-sans antialiased`}>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <AuthProvider>
                        <div className="flex h-screen bg-slate-950 text-slate-100">
                            <Sidebar />
                            <main className="flex-1 overflow-y-auto">
                                {children}
                            </main>
                        </div>
                        <AIChatWidget />
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
