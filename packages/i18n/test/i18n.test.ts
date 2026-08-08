import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createI18n } from "../src/index.js";
import { I18nError, isI18nError } from "../src/errors.js";
import type { Dictionary, I18nConfig, Loader } from "../src/types.js";

const enUS: Dictionary = {
  "app.title": "ARQON",
  "app.welcome": "Welcome, {name}!",
  "common.save": "Save",
  "billing.amount": "Amount: {value}",
};

const ptBR: Dictionary = {
  "app.title": "ARQON",
  "app.welcome": "Bem-vindo, {name}!",
  "common.save": "Salvar",
};

function makeLoader(dictionaries: Record<string, Dictionary>): Loader {
  return (locale: string) => {
    const dict = dictionaries[locale];
    if (!dict) {
      return Promise.reject(new Error(`unknown locale ${locale}`));
    }
    return Promise.resolve(dict);
  };
}

function makeConfig(overrides: Partial<I18nConfig> = {}): I18nConfig {
  return {
    defaultLocale: "en-US",
    locales: ["en-US", "pt-BR"],
    loadDictionary: makeLoader({ "en-US": enUS, "pt-BR": ptBR }),
    ...overrides,
  };
}

describe("createI18n", () => {
  it("returns an instance for valid config", async () => {
    const i18n = createI18n(makeConfig());
    assert.equal(typeof i18n.t, "function");
    assert.equal(typeof i18n.setLocale, "function");
    assert.equal(i18n.getLocale(), "en-US");
  });

  it("throws CONFIG_INVALID when defaultLocale not in locales", () => {
    assert.throws(
      () => createI18n(makeConfig({ defaultLocale: "fr-FR" })),
      (e: unknown) => isI18nError(e) && e.code === "CONFIG_INVALID",
    );
  });

  it("throws CONFIG_INVALID when locales is empty", () => {
    assert.throws(
      () => createI18n(makeConfig({ locales: [] })),
      (e: unknown) => isI18nError(e) && e.code === "CONFIG_INVALID",
    );
  });

  it("throws CONFIG_INVALID when loadDictionary missing", () => {
    assert.throws(
      () =>
        createI18n({
          defaultLocale: "en-US",
          locales: ["en-US"],
          // @ts-expect-error testing missing loader
          loadDictionary: undefined,
        }),
      (e: unknown) => isI18nError(e) && e.code === "CONFIG_INVALID",
    );
  });
});

describe("t (translate)", () => {
  it("returns translated string for key in active locale", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    assert.equal(i18n.t("common.save"), "Save");
  });

  it("interpolates {param} with stringified values", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    assert.equal(i18n.t("app.welcome", { name: "Maria" }), "Welcome, Maria!");
  });

  it("interpolates numeric values via String()", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    assert.equal(i18n.t("billing.amount", { value: 42 }), "Amount: 42");
  });

  it("leaves placeholder as-is when param missing (fail-safe)", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    assert.equal(i18n.t("app.welcome"), "Welcome, {name}!");
  });

  it("falls back to fallback locale when key missing in active locale", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    await i18n.loadLocale("pt-BR");
    await i18n.setLocale("pt-BR");
    // "billing.amount" only exists in en-US fallback
    assert.equal(i18n.t("billing.amount", { value: 10 }), "Amount: 10");
  });

  it("returns key string when key missing everywhere (fail-safe)", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    assert.equal(i18n.t("nonexistent.key"), "nonexistent.key");
  });

  it("returns key string when locale not loaded (fail-safe, no throw)", () => {
    const i18n = createI18n(makeConfig());
    // en-US default but never loaded
    assert.equal(i18n.t("common.save"), "common.save");
  });

  it("does not evaluate interpolation params as code/HTML (INV-3)", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    const result = i18n.t("app.welcome", { name: "<script>alert(1)</script>" });
    assert.equal(result, "Welcome, <script>alert(1)</script>!");
    // it's a plain string, not executed
    assert.equal(typeof result, "string");
  });
});

describe("formatNumber", () => {
  it("formats number in active locale", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    const result = i18n.formatNumber(1234.5);
    assert.equal(typeof result, "string");
    assert.ok(result.includes("1,234.5"));
  });

  it("formats in locale override", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    const result = i18n.formatNumber(1234.5, "pt-BR");
    assert.ok(result.includes("1.234,5"));
  });

  it("falls back to String(value) on invalid locale (fail-safe)", async () => {
    const i18n = createI18n(makeConfig());
    const result = i18n.formatNumber(42, "not-a-real-locale");
    assert.equal(result, String(42));
  });
});

describe("formatCurrency", () => {
  it("formats currency with symbol", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("pt-BR");
    const result = i18n.formatCurrency(99.9, "BRL", "pt-BR");
    assert.equal(typeof result, "string");
    assert.ok(result.includes("R$"));
  });

  it("falls back to String(value) on invalid currency (fail-safe)", async () => {
    const i18n = createI18n(makeConfig());
    const result = i18n.formatCurrency(42, "FAKE");
    assert.equal(typeof result, "string");
  });
});

describe("formatDate", () => {
  it("formats a Date object", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    const date = new Date("2026-01-15T00:00:00Z");
    const result = i18n.formatDate(date);
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });

  it("formats an ISO date string", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    const result = i18n.formatDate("2026-01-15T00:00:00Z");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });

  it("falls back to String(value) on invalid date (fail-safe)", async () => {
    const i18n = createI18n(makeConfig());
    const result = i18n.formatDate("not-a-date");
    assert.equal(typeof result, "string");
  });
});

describe("loadLocale", () => {
  it("loads and caches a dictionary", async () => {
    const i18n = createI18n(makeConfig());
    assert.equal(i18n.isLocaleLoaded("en-US"), false);
    const dict = await i18n.loadLocale("en-US");
    assert.equal(dict["common.save"], "Save");
    assert.equal(i18n.isLocaleLoaded("en-US"), true);
  });

  it("returns cached dictionary on second call (no loader invocation)", async () => {
    let loadCount = 0;
    const loader: Loader = (locale) => {
      loadCount++;
      return Promise.resolve(locale === "en-US" ? enUS : ptBR);
    };
    const i18n = createI18n(makeConfig({ loadDictionary: loader }));
    await i18n.loadLocale("en-US");
    await i18n.loadLocale("en-US");
    assert.equal(loadCount, 1);
  });

  it("dedups in-flight concurrent calls (one loader invocation)", async () => {
    let loadCount = 0;
    const loader: Loader = (locale) => {
      loadCount++;
      return Promise.resolve(locale === "en-US" ? enUS : ptBR);
    };
    const i18n = createI18n(makeConfig({ loadDictionary: loader }));
    const [a, b] = await Promise.all([
      i18n.loadLocale("en-US"),
      i18n.loadLocale("en-US"),
    ]);
    assert.equal(loadCount, 1);
    assert.equal(a, b);
  });

  it("throws LOAD_FAILED when loader rejects; locale not cached", async () => {
    const i18n = createI18n(makeConfig());
    await assert.rejects(
      () => i18n.loadLocale("unknown-locale"),
      (e: unknown) => isI18nError(e) && e.code === "LOAD_FAILED",
    );
    assert.equal(i18n.isLocaleLoaded("unknown-locale"), false);
  });

  it("throws LOAD_FAILED when loader returns non-object", async () => {
    const loader: Loader = () =>
      // @ts-expect-error testing non-object return
      Promise.resolve("not-a-dictionary");
    const i18n = createI18n(makeConfig({ loadDictionary: loader }));
    await assert.rejects(
      () => i18n.loadLocale("en-US"),
      (e: unknown) => isI18nError(e) && e.code === "LOAD_FAILED",
    );
    assert.equal(i18n.isLocaleLoaded("en-US"), false);
  });

  it("allows retry after error (INV-S5: ERROR is not terminal)", async () => {
    let attempts = 0;
    const loader: Loader = (locale) => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(new Error("transient"));
      }
      return Promise.resolve(locale === "en-US" ? enUS : ptBR);
    };
    const i18n = createI18n(makeConfig({ loadDictionary: loader }));
    await assert.rejects(() => i18n.loadLocale("en-US"));
    const dict = await i18n.loadLocale("en-US");
    assert.equal(dict["common.save"], "Save");
    assert.equal(i18n.isLocaleLoaded("en-US"), true);
  });
});

describe("setLocale", () => {
  it("switches active locale when already cached", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("pt-BR");
    await i18n.setLocale("pt-BR");
    assert.equal(i18n.getLocale(), "pt-BR");
    assert.equal(i18n.t("common.save"), "Salvar");
  });

  it("loads then switches when locale not cached", async () => {
    const i18n = createI18n(makeConfig());
    assert.equal(i18n.isLocaleLoaded("pt-BR"), false);
    await i18n.setLocale("pt-BR");
    assert.equal(i18n.getLocale(), "pt-BR");
    assert.equal(i18n.isLocaleLoaded("pt-BR"), true);
  });

  it("leaves active locale unchanged when load fails", async () => {
    const i18n = createI18n(makeConfig());
    await i18n.loadLocale("en-US");
    await i18n.setLocale("en-US");
    await assert.rejects(
      () => i18n.setLocale("unknown-locale"),
      (e: unknown) => isI18nError(e) && e.code === "LOAD_FAILED",
    );
    assert.equal(i18n.getLocale(), "en-US");
  });
});

describe("getLocale / isLocaleLoaded", () => {
  it("getLocale returns active locale", () => {
    const i18n = createI18n(makeConfig());
    assert.equal(i18n.getLocale(), "en-US");
  });

  it("isLocaleLoaded true after load, false before", async () => {
    const i18n = createI18n(makeConfig());
    assert.equal(i18n.isLocaleLoaded("pt-BR"), false);
    await i18n.loadLocale("pt-BR");
    assert.equal(i18n.isLocaleLoaded("pt-BR"), true);
  });
});
