import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n";
import {
  Zap,
  ArrowRight,
  TrendingDown,
  Users,
  Clock,
  FileWarning,
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  Target,
  Eye,
  CheckCircle2,
  X,
  Building2,
  Briefcase,
  Cpu,
  Handshake,
  PlayCircle,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Pricing data — per founder-confirmed launch pricing (D-012)       */
/* ------------------------------------------------------------------ */

interface PlanFeature {
  labelKey: string;
  value: string | boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  cadenceKey: string;
  badgeKey?: string;
  emphasized?: boolean;
  features: PlanFeature[];
}

const ALL_DETECTORS = [
  "features.dataAnalysis.label",
  "features.overdueInvoices.label",
  "features.inactiveClients.label",
  "features.stagnantOpportunities.label",
  "features.expiringContracts.label",
  "features.priorityRecommendations.label",
];

const PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "ARQON Starter",
    price: "R$ 297",
    cadenceKey: "pricing.cadence",
    features: [
      { labelKey: "features.dataAnalysis.label", value: true },
      { labelKey: "features.overdueInvoices.label", value: true },
      { labelKey: "features.inactiveClients.label", value: true },
      { labelKey: "features.stagnantOpportunities.label", value: true },
      { labelKey: "features.expiringContracts.label", value: false },
      { labelKey: "features.priorityRecommendations.label", value: true },
      { labelKey: "features.history.label", value: "features.history.30days" },
      { labelKey: "features.dataSources.label", value: "1" },
      { labelKey: "features.users.label", value: "1" },
      { labelKey: "features.reports.label", value: false },
      { labelKey: "features.export.label", value: false },
      { labelKey: "features.api.label", value: false },
      { labelKey: "features.integrations.label", value: false },
      { labelKey: "features.support.label", value: "features.support.basic" },
      { labelKey: "features.strategicReview.label", value: false },
    ],
  },
  {
    id: "core",
    name: "ARQON Core",
    price: "R$ 597",
    cadenceKey: "pricing.cadence",
    features: [
      { labelKey: "features.dataAnalysis.label", value: true },
      { labelKey: "features.overdueInvoices.label", value: true },
      { labelKey: "features.inactiveClients.label", value: true },
      { labelKey: "features.stagnantOpportunities.label", value: true },
      { labelKey: "features.expiringContracts.label", value: true },
      { labelKey: "features.priorityRecommendations.label", value: true },
      { labelKey: "features.history.label", value: "features.history.3months" },
      { labelKey: "features.dataSources.label", value: "3" },
      { labelKey: "features.users.label", value: "3" },
      { labelKey: "features.reports.label", value: true },
      { labelKey: "features.export.label", value: true },
      { labelKey: "features.api.label", value: false },
      { labelKey: "features.integrations.label", value: false },
      { labelKey: "features.support.label", value: "features.support.standard" },
      { labelKey: "features.strategicReview.label", value: false },
    ],
  },
  {
    id: "growth",
    name: "ARQON Growth",
    price: "R$ 997",
    cadenceKey: "pricing.cadence",
    badgeKey: "pricing.badge.mostChosen",
    emphasized: true,
    features: [
      { labelKey: "features.dataAnalysis.label", value: true },
      { labelKey: "features.overdueInvoices.label", value: true },
      { labelKey: "features.inactiveClients.label", value: true },
      { labelKey: "features.stagnantOpportunities.label", value: true },
      { labelKey: "features.expiringContracts.label", value: true },
      { labelKey: "features.priorityRecommendations.label", value: true },
      { labelKey: "features.history.label", value: "features.history.12months" },
      { labelKey: "features.dataSources.label", value: "10" },
      { labelKey: "features.users.label", value: "10" },
      { labelKey: "features.reports.label", value: true },
      { labelKey: "features.export.label", value: true },
      { labelKey: "features.api.label", value: true },
      { labelKey: "features.integrations.label", value: true },
      { labelKey: "features.support.label", value: "features.support.advanced" },
      { labelKey: "features.strategicReview.label", value: "1/ano" },
    ],
  },
  {
    id: "intelligence",
    name: "ARQON Intelligence",
    price: "R$ 1.997",
    cadenceKey: "pricing.cadence",
    features: [
      { labelKey: "features.dataAnalysis.label", value: true },
      { labelKey: "features.overdueInvoices.label", value: true },
      { labelKey: "features.inactiveClients.label", value: true },
      { labelKey: "features.stagnantOpportunities.label", value: true },
      { labelKey: "features.expiringContracts.label", value: true },
      { labelKey: "features.priorityRecommendations.label", value: true },
      { labelKey: "features.history.label", value: "features.history.unlimited" },
      { labelKey: "features.dataSources.label", value: "features.dataSources.unlimited" },
      { labelKey: "features.users.label", value: "features.history.unlimited" },
      { labelKey: "features.reports.label", value: true },
      { labelKey: "features.export.label", value: true },
      { labelKey: "features.api.label", value: true },
      { labelKey: "features.integrations.label", value: true },
      { labelKey: "features.support.label", value: "features.support.premium" },
      { labelKey: "features.strategicReview.label", value: "2/ano" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function FeatureMark({ value, t }: { value: string | boolean; t: (k: string) => string }) {
  if (value === true) {
    return <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />;
  }
  if (value === false) {
    return <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
  const isKey = value.includes(".");
  return <span className="text-sm font-mono text-foreground">{isKey ? t(value) : value}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Header / Nav                                                       */
/* ------------------------------------------------------------------ */

function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
            <div className="h-3 w-3 rounded-sm bg-background" />
          </div>
          <span className="text-lg font-bold tracking-tight uppercase">ARQON</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#problema" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.product")}
          </Link>
          <Link href="/#como-funciona" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.forCompanies")}
          </Link>
          <Link href="/#precos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.pricing")}
          </Link>
          <Link href="/#seguranca" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.security")}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("nav.login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t("nav.register")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-16 text-center">
        <SectionLabel>{t("hero.label")}</SectionLabel>

        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {t("hero.headline")}
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-balance text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          {t("hero.subheadline")}
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("hero.description")}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">
              {t("hero.ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              <PlayCircle className="h-4 w-4" />
              {t("hero.ctaSecondary")}
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("hero.badgeNoCard")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("hero.badgeFastSetup")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("hero.badgeIsolated")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("hero.badgeSecureByDesign")}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Product visual (ARQON mockup)                                      */
/* ------------------------------------------------------------------ */

function ProductVisual() {
  const { t } = useI18n();
  const leaks = [
    { label: t("features.overdueInvoices.label"), value: "R$ 84.200", count: 12 },
    { label: t("features.inactiveClients.label"), value: "R$ 31.800", count: 8 },
    { label: t("features.stagnantOpportunities.label"), value: "R$ 52.400", count: 11 },
    { label: t("features.expiringContracts.label"), value: "R$ 46.400", count: 6 },
  ];
  return (
    <section className="relative border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="ml-3 flex items-center gap-2">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-primary">
                <div className="h-2 w-2 rounded-sm bg-card" />
              </div>
              <span className="text-xs font-bold uppercase tracking-tight">ARQON</span>
              <Separator orientation="vertical" className="mx-1 h-3" />
              <span className="text-xs text-muted-foreground">{t("productVisual.brand")}</span>
            </div>
          </div>

          {/* dashboard body */}
          <div className="space-y-6 p-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("productVisual.kpiAtRisk")}
                  </p>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-primary">R$ 842.350</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("productVisual.kpiRecoverable")}
                </p>
                <p className="mt-2 font-mono text-2xl font-bold">R$ 214.800</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("productVisual.kpiFindings")}
                </p>
                <p className="mt-2 font-mono text-2xl font-bold">37</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("productVisual.kpiRecommendations")}
                </p>
                <p className="mt-2 font-mono text-2xl font-bold">18</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* principais vazamentos */}
              <div className="rounded-lg border border-border p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {t("productVisual.mainLeaks")}
                </p>
                <div className="space-y-3">
                  {leaks.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold">{row.value}</p>
                        <p className="text-[11px] text-muted-foreground/70">{row.count} {t("productVisual.occurrences")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* priority item */}
              <div className="rounded-lg border border-border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {t("productVisual.priorityAction")}
                  </p>
                  <Badge variant="destructive" className="text-[10px]">{t("productVisual.priorityHigh")}</Badge>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">{t("productVisual.clientX")}</p>
                    <p className="text-xs text-muted-foreground">{t("productVisual.contractExpiring")}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("productVisual.estimatedImpact")}
                    </p>
                    <p className="font-mono text-xl font-bold text-primary">R$ 28.000</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("productVisual.recommendedAction")}
                    </p>
                    <p className="text-sm">{t("productVisual.recommendedActionValue")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("productVisual.disclaimer")}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Problem section                                                    */
/* ------------------------------------------------------------------ */

const PROBLEM_CARDS = [
  {
    icon: TrendingDown,
    titleKey: "problem.cards.money.title",
    textKey: "problem.cards.money.text",
  },
  {
    icon: Users,
    titleKey: "problem.cards.clients.title",
    textKey: "problem.cards.clients.text",
  },
  {
    icon: Target,
    titleKey: "problem.cards.opportunities.title",
    textKey: "problem.cards.opportunities.text",
  },
  {
    icon: FileWarning,
    titleKey: "problem.cards.contracts.title",
    textKey: "problem.cards.contracts.text",
  },
];

function ProblemSection() {
  const { t } = useI18n();
  return (
    <section id="problema" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("problem.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("problem.headline")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("problem.description")}
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_CARDS.map((card) => (
            <Card key={card.titleKey} className="bg-card transition-colors hover:border-primary/40">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/40">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{t(card.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(card.textKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works                                                       */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "01",
    icon: Database,
    titleKey: "howItWorks.steps.01.title",
    textKey: "howItWorks.steps.01.text",
  },
  {
    n: "02",
    icon: Cpu,
    titleKey: "howItWorks.steps.02.title",
    textKey: "howItWorks.steps.02.text",
  },
  {
    n: "03",
    icon: Zap,
    titleKey: "howItWorks.steps.03.title",
    textKey: "howItWorks.steps.03.text",
  },
];

function HowItWorks() {
  const { t } = useI18n();
  return (
    <section id="como-funciona" className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("howItWorks.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("howItWorks.headline")}
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/40 bg-primary/5">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-mono text-3xl font-bold text-muted-foreground/30">{step.n}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t(step.titleKey)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(step.textKey)}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-4 top-6 hidden h-5 w-5 text-muted-foreground/30 md:block" />
              )}
            </div>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {t("howItWorks.flow")}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  What the customer gets                                             */
/* ------------------------------------------------------------------ */

const BENEFITS = [
  {
    icon: Eye,
    titleKey: "whatYouGet.benefits.visibility.title",
    textKey: "whatYouGet.benefits.visibility.text",
  },
  {
    icon: Target,
    titleKey: "whatYouGet.benefits.prioritization.title",
    textKey: "whatYouGet.benefits.prioritization.text",
  },
  {
    icon: Zap,
    titleKey: "whatYouGet.benefits.action.title",
    textKey: "whatYouGet.benefits.action.text",
  },
];

function WhatYouGet() {
  const { t } = useI18n();
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("whatYouGet.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("whatYouGet.headline")}
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.titleKey} className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-secondary/40">
                <b.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold uppercase tracking-wide">{t(b.titleKey)}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{t(b.textKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Differentiator                                                     */
/* ------------------------------------------------------------------ */

function Differentiator() {
  const { t } = useI18n();
  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <SectionLabel>{t("differentiator.label")}</SectionLabel>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {t("differentiator.headline")}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("differentiator.description")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Badge variant="outline" className="border-border text-muted-foreground">{t("differentiator.badge.notErp")}</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">{t("differentiator.badge.notCrm")}</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">{t("differentiator.badge.notBi")}</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">{t("differentiator.badge.notCopilot")}</Badge>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Who it's for                                                        */
/* ------------------------------------------------------------------ */

const AUDIENCES = [
  {
    icon: Building2,
    titleKey: "whoItsFor.audiences.b2b.title",
    textKey: "whoItsFor.audiences.b2b.text",
  },
  {
    icon: Briefcase,
    titleKey: "whoItsFor.audiences.agencies.title",
    textKey: "whoItsFor.audiences.agencies.text",
  },
  {
    icon: Cpu,
    titleKey: "whoItsFor.audiences.tech.title",
    textKey: "whoItsFor.audiences.tech.text",
  },
  {
    icon: Handshake,
    titleKey: "whoItsFor.audiences.commercial.title",
    textKey: "whoItsFor.audiences.commercial.text",
  },
];

function WhoItsFor() {
  const { t } = useI18n();
  return (
    <section id="para-quem" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("whoItsFor.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("whoItsFor.headline")}
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <Card key={a.titleKey} className="bg-card">
              <CardContent className="p-6">
                <a.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-semibold">{t(a.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(a.textKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Financial impact                                                   */
/* ------------------------------------------------------------------ */

function FinancialImpact() {
  const { t } = useI18n();
  const stats = [
    { value: "R$ 842.350", labelKey: "financialImpact.stat1.label" },
    { value: "R$ 214.800", labelKey: "financialImpact.stat2.label" },
    { value: "37", labelKey: "financialImpact.stat3.label" },
    { value: "18", labelKey: "financialImpact.stat4.label" },
  ];
  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("financialImpact.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("financialImpact.headline")}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.labelKey} className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="font-mono text-3xl font-bold text-primary sm:text-4xl">{s.value}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t(s.labelKey)}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("financialImpact.disclaimer")}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

function PricingSection() {
  const { t } = useI18n();
  return (
    <section id="precos" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("pricing.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("pricing.headline")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("pricing.description")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col rounded-xl border bg-card p-6",
                plan.emphasized
                  ? "border-primary/60 shadow-[0_0_30px_rgba(0,0,0,0.3)] ring-1 ring-primary/20"
                  : "border-border",
              ].join(" ")}
            >
              {plan.badgeKey && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-lg">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {t(plan.badgeKey)}
                  </Badge>
                </div>
              )}

              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{t(plan.cadenceKey)}</span>
              </div>

              <Separator className="my-5" />

              <ul className="flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f.labelKey} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{t(f.labelKey)}</span>
                    <FeatureMark value={f.value} t={t} />
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.emphasized ? "default" : "outline"}
                className="mt-6 w-full"
              >
                <Link href="/register">{t("pricing.cta")}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("pricing.disclaimer")}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Security / Trust                                                   */
/* ------------------------------------------------------------------ */

function SecuritySection() {
  const { t } = useI18n();
  const items = [
    { icon: Building2, titleKey: "security.items.isolated.title", textKey: "security.items.isolated.text" },
    { icon: ShieldCheck, titleKey: "security.items.architecture.title", textKey: "security.items.architecture.text" },
    { icon: KeyRound, titleKey: "security.items.auth.title", textKey: "security.items.auth.text" },
    { icon: Lock, titleKey: "security.items.secrets.title", textKey: "security.items.secrets.text" },
    { icon: Database, titleKey: "security.items.access.title", textKey: "security.items.access.text" },
    { icon: Cpu, titleKey: "security.items.scale.title", textKey: "security.items.scale.text" },
  ];
  return (
    <section id="seguranca" className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("security.label")}</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("security.headline")}
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.titleKey} className="flex gap-4 rounded-lg border border-border bg-card p-5">
              <item.icon className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{t(item.titleKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(item.textKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {t("finalCta.headline")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {t("finalCta.description")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">
              {t("finalCta.ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">{t("finalCta.ctaSecondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
          <div className="text-center md:text-left">
            <Link href="/" className="flex items-center justify-center gap-2 md:justify-start">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <div className="h-2.5 w-2.5 rounded-sm bg-background" />
              </div>
              <span className="font-bold tracking-tight uppercase">ARQON</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link href="/#problema" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t("nav.product")}</Link>
            <Link href="/#para-quem" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t("nav.forCompanies")}</Link>
            <Link href="/#precos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t("nav.pricing")}</Link>
            <Link href="/#seguranca" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t("nav.security")}</Link>
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t("nav.login")}</Link>
            <Link href="/register" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t("nav.register")}</Link>
          </nav>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ARQON. {t("footer.rights")}</p>
          <p className="font-mono uppercase tracking-wider">{t("footer.brand")}</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <ProductVisual />
        <ProblemSection />
        <HowItWorks />
        <WhatYouGet />
        <Differentiator />
        <WhoItsFor />
        <FinancialImpact />
        <PricingSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
