import { useContext } from "react";

import { I18nError } from "../../errors.js";
import { I18nContext, type I18nContextValue } from "./context.js";

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new I18nError(
      "CONTEXT_MISSING",
      "useI18n must be called within an I18nProvider",
    );
  }
  return ctx;
}

export function useLocale(): string {
  return useI18n().locale;
}
