/**
 * BizConnect CRM — Root Layout (pass-through)
 *
 * With next-intl [locale] routing, the root layout
 * must NOT render <html>/<body> — that's done by
 * app/[locale]/layout.tsx.
 *
 * This file only passes children through.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "BizConnect CRM",
    description: "CRM система для малого бизнеса",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
