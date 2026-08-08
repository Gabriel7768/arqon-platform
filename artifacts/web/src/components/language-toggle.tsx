import { useState } from "react";
import { useI18n, type SupportedLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

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

  // Show the CURRENT locale so users always know which language is active.
  const label = locale === "en-US" ? "EN" : "PT";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={pending}
      className="font-mono text-xs uppercase tracking-wider gap-1"
      title={`Switch to ${next}`}
      aria-label={`Switch to ${next}`}
    >
      <ArrowLeftRight className="h-3 w-3 opacity-50" />
      {label}
    </Button>
  );
}

