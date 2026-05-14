/**
 * CleanDerect CRM — Middleware (next-auth + next-intl)
 *
 * Combines two concerns:
 * 1. next-intl  — locale detection, redirects, URL rewrites
 * 2. next-auth  — JWT route protection (redirect to /login)
 *
 * Flow:
 *   request → skip static/api-auth → auth check → next-intl locale handling
 */

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/* ── next-intl middleware instance ────────── */

const intlMiddleware = createMiddleware(routing);

/* ── Paths that bypass ALL middleware ─────── */

function isIgnoredPath(pathname: string): boolean {
    return (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth") ||
        pathname === "/favicon.ico" ||
        // Static files (files with extensions like .css, .js, .png, etc.)
        /\.(.*)$/.test(pathname)
    );
}

/* ── Paths that bypass auth (but still need intl) ── */

function isPublicPath(pathname: string): boolean {
    // Check for /login with or without locale prefix
    // e.g. /login, /ru/login, /kk/login
    const localePrefix = routing.locales.join("|");
    const loginPattern = new RegExp(`^/(${localePrefix})?/?login`);
    return loginPattern.test(pathname);
}

/* ── Main middleware ─────────────────────── */

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Skip entirely for static assets & auth API
    if (isIgnoredPath(pathname)) {
        return NextResponse.next();
    }

    // 2. Public paths (login) — only apply intl, no auth check
    if (isPublicPath(pathname)) {
        return intlMiddleware(request);
    }

    // 3. Auth check — verify JWT token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
        // Redirect unauthenticated users to login,
        // preserving the original path as callbackUrl
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. Authenticated — apply intl middleware for locale handling
    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
