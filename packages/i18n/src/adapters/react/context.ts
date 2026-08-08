import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { I18nError } from "../../errors.js";
import type { I18nInstance, TranslateParams } from "../../types.js";

export interface I18nContextValue {
  t: (key: string, params?: TranslateParams) => string;
  formatNumber: (value: number, locale?: string) => string;
  formatCurrency: (value: number, currency: string, locale?: string) => string;
  formatDate: (value: Date | string, locale?: string) => string;
  locale: string;
  setLocale: (locale: string) => Promise<void>;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
export const I18nInstanceContext = createContext<I18nInstance | null>(null);
