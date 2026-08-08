import { I18nError } from "./errors.js";
import type {
  Dictionary,
  I18nConfig,
  I18nInstance,
  Loader,
  TranslateParams,
} from "./types.js";

function isDictionary(value: unknown): value is Dictionary {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function interpolate(template: string, params: TranslateParams): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      return String(params[name]);
    }
    return match;
  });
}

export function createI18n(config: I18nConfig): I18nInstance {
  if (!config || typeof config !== "object") {
    throw new I18nError("CONFIG_INVALID", "config is required");
  }
  if (!config.defaultLocale || typeof config.defaultLocale !== "string") {
    throw new I18nError("CONFIG_INVALID", "defaultLocale is required");
  }
  if (!Array.isArray(config.locales) || config.locales.length === 0) {
    throw new I18nError("CONFIG_INVALID", "locales must be a non-empty array");
  }
  if (!config.locales.includes(config.defaultLocale)) {
    throw new I18nError(
      "CONFIG_INVALID",
      `defaultLocale "${config.defaultLocale}" is not in locales [${config.locales.join(", ")}]`,
    );
  }
  if (typeof config.loadDictionary !== "function") {
    throw new I18nError("CONFIG_INVALID", "loadDictionary must be a function");
  }

  const fallbackLocale = config.fallbackLocale ?? config.locales[0];
  const loader: Loader = config.loadDictionary;

  const cache = new Map<string, Dictionary>();
  const inFlight = new Map<string, Promise<Dictionary>>();

  let activeLocale = config.defaultLocale;

  async function loadLocale(locale: string): Promise<Dictionary> {
    const cached = cache.get(locale);
    if (cached) return cached;

    const existing = inFlight.get(locale);
    if (existing) return existing;

    const promise = Promise.resolve(loader(locale))
      .then((dict) => {
        if (!isDictionary(dict)) {
          throw new I18nError(
            "LOAD_FAILED",
            `loader for "${locale}" did not return a dictionary object`,
          );
        }
        cache.set(locale, dict);
        return dict;
      })
      .catch((err: unknown) => {
        if (err instanceof I18nError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        throw new I18nError(
          "LOAD_FAILED",
          `loader for "${locale}" rejected: ${msg}`,
        );
      })
      .finally(() => {
        inFlight.delete(locale);
      });

    inFlight.set(locale, promise);
    return promise;
  }

  function lookup(key: string, locale: string): string | undefined {
    const dict = cache.get(locale);
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
      return dict[key];
    }
    return undefined;
  }

  function t(key: string, params?: TranslateParams): string {
    let raw = lookup(key, activeLocale);
    if (raw === undefined && fallbackLocale !== activeLocale) {
      raw = lookup(key, fallbackLocale);
    }
    if (raw === undefined) {
      raw = key;
    }
    if (params) {
      return interpolate(raw, params);
    }
    return raw;
  }

  function formatNumber(value: number, locale?: string): string {
    try {
      return new Intl.NumberFormat(locale ?? activeLocale).format(value);
    } catch {
      return String(value);
    }
  }

  function formatCurrency(
    value: number,
    currency: string,
    locale?: string,
  ): string {
    try {
      return new Intl.NumberFormat(locale ?? activeLocale, {
        style: "currency",
        currency,
      }).format(value);
    } catch {
      return String(value);
    }
  }

  function formatDate(value: Date | string, locale?: string): string {
    try {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(locale ?? activeLocale).format(date);
    } catch {
      return String(value);
    }
  }

  async function setLocale(locale: string): Promise<void> {
    if (!cache.has(locale)) {
      await loadLocale(locale);
    }
    activeLocale = locale;
  }

  function getLocale(): string {
    return activeLocale;
  }

  function isLocaleLoaded(locale: string): boolean {
    return cache.has(locale);
  }

  return {
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    setLocale,
    getLocale,
    loadLocale,
    isLocaleLoaded,
  };
}
