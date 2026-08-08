import { useCallback, useMemo, useState, type ReactNode } from "react";

import type { I18nInstance } from "../../types.js";
import {
  I18nContext,
  I18nInstanceContext,
  type I18nContextValue,
} from "./context.js";
import { useI18n, useLocale } from "./hooks.js";

export interface I18nProviderProps {
  instance: I18nInstance;
  children: ReactNode;
}

export function I18nProvider({ instance, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState(instance.getLocale());

  const setLocale = useCallback(
    async (next: string) => {
      await instance.setLocale(next);
      setLocaleState(instance.getLocale());
    },
    [instance],
  );

  const value: I18nContextValue = useMemo(
    () => ({
      t: instance.t.bind(instance),
      formatNumber: instance.formatNumber.bind(instance),
      formatCurrency: instance.formatCurrency.bind(instance),
      formatDate: instance.formatDate.bind(instance),
      locale,
      setLocale,
    }),
    [instance, locale, setLocale],
  );

  return (
    <I18nInstanceContext.Provider value={instance}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </I18nInstanceContext.Provider>
  );
}

export { useI18n, useLocale };
