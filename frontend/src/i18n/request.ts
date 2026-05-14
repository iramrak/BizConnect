/**
 * CleanDerect CRM — i18n Request Configuration
 *
 * Server-side config: resolves the locale from the request
 * and dynamically imports the correct message dictionary.
 */

import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
