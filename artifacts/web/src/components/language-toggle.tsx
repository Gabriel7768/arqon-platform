import { useState } from "react";
import { useI18n, type SupportedLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "arqon_locale";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const [pending, setPending] = useState(false);

  const next: SupportedLocale = locale === "pt-BR" ? "en-US" : "pt-BR";

  async function handleToggle() {
    setPending(true);
    try {
      await setLocale(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    } finally {
      setPending(false);
    }
  }

  const label = next === "en-US" ? "EN" : "PT";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={pending}
      className="font-mono text-xs uppercase tracking-wider min-w-[2.5rem]"
      aria-label={`Switch to ${next}`}
    >
      {label}
    </Button>
  );
}

