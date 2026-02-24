/**
 * CleanDerect CRM — NextAuth Session Provider (client)
 *
 * Wraps the app so useSession() works in all client components.
 */

"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
