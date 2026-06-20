/**
 * BizConnect CRM — Locale-aware Navigation
 *
 * Re-exports Link, redirect, usePathname, useRouter
 * that automatically handle locale prefixes.
 *
 * Usage: import { Link, useRouter } from '@/i18n/navigation';
 */

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
