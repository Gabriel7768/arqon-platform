export type Dictionary = Record<string, string>;

export type Loader = (locale: string) => Promise<Dictionary>;

export interface I18nConfig {
  defaultLocale: string;
  locales: string[];
  loadDictionary: Loader;
  fallbackLocale?: string;
}

export type TranslateParams = Record<string, string | number>;

export interface I18nInstance {
  t: (key: string, params?: TranslateParams) => string;
  formatNumber: (value: number, locale?: string) => string;
  formatCurrency: (value: number, currency: string, locale?: string) => string;
  formatDate: (value: Date | string, locale?: string) => string;
  setLocale: (locale: string) => Promise<void>;
  getLocale: () => string;
  loadLocale: (locale: string) => Promise<Dictionary>;
  isLocaleLoaded: (locale: string) => boolean;
}
