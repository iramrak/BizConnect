/**
 * CleanDerect CRM — i18n Routing Configuration
 *
 * Defines supported locales and prefix strategy.
 * 'as-needed' = no prefix for default locale (ru),
 * /kk/... prefix for Kazakh.
 */

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    locales: ["ru", "kk"],
    defaultLocale: "ru",
    localePrefix: "as-needed",
});
