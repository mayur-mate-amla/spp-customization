import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// The plugin's labels in the page's language (row 139). A package has one "messages" file, and the store merges it
// into its messages for every language (withRuntimeMessages is not told the locale): so the file holds English at
// Common.sppCommerce and each other language the plugin speaks under its own key (Common.sppCommerce.fr). The page's
// language comes from its URL: the store prefixes every language but the default (localePrefix "as-needed":
// /fr-FR/category/1674); usePathname gives the same path on the server render and in the browser, so both pick the
// same labels. A language without labels here gets English.

const LANGUAGES: Record<string, string> = { fr: "fr" };

export function pageLanguage(pathname: string) {
  const locale = pathname.match(/^\/([a-z]{2})-[A-Z]{2}(?=\/|$)/)?.[1] || "";
  return LANGUAGES[locale] || "";
}

export function useSppTranslations() {
  const language = pageLanguage(usePathname() || "");
  return useTranslations(language ? `Common.sppCommerce.${language}` : "Common.sppCommerce");
}
