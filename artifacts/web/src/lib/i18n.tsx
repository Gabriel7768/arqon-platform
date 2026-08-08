import { useEffect, useState } from "react";
import {
  createI18n,
  type I18nInstance,
} from "@workspace/i18n";
import { I18nProvider, useI18n } from "@workspace/i18n/adapters/react";

import enUS from "@/locales/en-US.json";
import ptBR from "@/locales/pt-BR.json";

const SUPPORTED_LOCALES = ["en-US", "pt-BR"] as const;
const DEFAULT_LOCALE = "pt-BR" as const;
const STORAGE_KEY = "arqon_locale";

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const dictionaries: Record<SupportedLocale, Record<string, string>> = {
  "en-US": enUS,
  "pt-BR": ptBR,
};

function detectInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as SupportedLocale;
  }

  const navLang = window.navigator.language.toLowerCase();
  if (navLang.startsWith("pt")) return "pt-BR";
  if (navLang.startsWith("en")) return "en-US";

  return DEFAULT_LOCALE;
}

const initialLocale = detectInitialLocale();

export const i18nInstance: I18nInstance = createI18n({
  defaultLocale: initialLocale,
  locales: [...SUPPORTED_LOCALES],
  fallbackLocale: "pt-BR",
  async loadDictionary(locale) {
    const dict = dictionaries[locale as SupportedLocale];
    if (!dict) {
      throw new Error(`No dictionary for locale "${locale}"`);
    }
    return { ...dict };
  },
});

// Kick off the initial locale load immediately at module eval so it resolves
// as early as possible (often before React commits the first render).
const initialLoadPromise = i18nInstance.loadLocale(initialLocale);

export function ArqonI18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(() => i18nInstance.isLocaleLoaded(initialLocale));

  useEffect(() => {
    let active = true;
    initialLoadPromise
      .then(() => {
        if (active) {
          setReady(true);
          window.localStorage.setItem(STORAGE_KEY, i18nInstance.getLocale());
        }
      })
      .catch(() => {
        // Fail-safe: render anyway so the app isn't blank; t() returns keys.
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <I18nProvider instance={i18nInstance}>{children}</I18nProvider>;
}

export { useI18n };
export type { SupportedLocale };
export { SUPPORTED_LOCALES };

