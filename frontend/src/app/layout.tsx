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
