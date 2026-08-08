import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  label: string;
  value: string | boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  emphasized?: boolean;
  features: PlanFeature[];
}

const ALL_DETECTORS = [
  "Análise de dados",
  "Faturas em atraso",
  "Clientes inativos",
  "Oportunidades estagnadas",
  "Contratos próximos do vencimento",
  "Recomendações priorizadas",
];

const PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "ARQON Starter",
    price: "R$ 297",
    cadence: "/mês",
    features: [
      { label: "Análise de dados", value: true },
      { label: "Faturas em atraso", value: true },
      { label: "Clientes inativos", value: true },
      { label: "Oportunidades estagnadas", value: true },
      { label: "Contratos próximos do vencimento", value: false },
      { label: "Recomendações priorizadas", value: true },
      { label: "Histórico", value: "30 dias" },
      { label: "Fontes de dados", value: "1" },
      { label: "Usuários", value: "1" },
      { label: "Relatórios", value: false },
      { label: "Exportação", value: false },
      { label: "API", value: false },
      { label: "Integrações", value: false },
      { label: "Suporte", value: "Básico" },
      { label: "Revisão estratégica", value: false },
    ],
  },
  {
    id: "core",
    name: "ARQON Core",
    price: "R$ 597",
    cadence: "/mês",
    features: [
      { label: "Análise de dados", value: true },
      { label: "Faturas em atraso", value: true },
      { label: "Clientes inativos", value: true },
      { label: "Oportunidades estagnadas", value: true },
      { label: "Contratos próximos do vencimento", value: true },
      { label: "Recomendações priorizadas", value: true },
      { label: "Histórico", value: "3 meses" },
      { label: "Fontes de dados", value: "3" },
      { label: "Usuários", value: "3" },
      { label: "Relatórios", value: true },
      { label: "Exportação", value: true },
      { label: "API", value: false },
      { label: "Integrações", value: false },
      { label: "Suporte", value: "Padrão" },
      { label: "Revisão estratégica", value: false },
    ],
  },
  {
    id: "growth",
    name: "ARQON Growth",
    price: "R$ 997",
    cadence: "/mês",
    badge: "Mais escolhido",
    emphasized: true,
    features: [
      { label: "Análise de dados", value: true },
      { label: "Faturas em atraso", value: true },
      { label: "Clientes inativos", value: true },
      { label: "Oportunidades estagnadas", value: true },
      { label: "Contratos próximos do vencimento", value: true },
      { label: "Recomendações priorizadas", value: true },
      { label: "Histórico", value: "12 meses" },
      { label: "Fontes de dados", value: "10" },
      { label: "Usuários", value: "10" },
      { label: "Relatórios", value: true },
      { label: "Exportação", value: true },
      { label: "API", value: true },
      { label: "Integrações", value: true },
      { label: "Suporte", value: "Avançado" },
      { label: "Revisão estratégica", value: "1/ano" },
    ],
  },
  {
    id: "intelligence",
    name: "ARQON Intelligence",
    price: "R$ 1.997",
    cadence: "/mês",
    features: [
      { label: "Análise de dados", value: true },
      { label: "Faturas em atraso", value: true },
      { label: "Clientes inativos", value: true },
      { label: "Oportunidades estagnadas", value: true },
      { label: "Contratos próximos do vencimento", value: true },
      { label: "Recomendações priorizadas", value: true },
      { label: "Histórico", value: "Ilimitado" },
      { label: "Fontes de dados", value: "Ilimitadas" },
      { label: "Usuários", value: "Ilimitados" },
      { label: "Relatórios", value: true },
      { label: "Exportação", value: true },
      { label: "API", value: true },
      { label: "Integrações", value: true },
      { label: "Suporte", value: "Premium" },
      { label: "Revisão estratégica", value: "2/ano" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function FeatureMark({ value }: { value: string | boolean }) {
  if (value === true) {
    return <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />;
  }
  if (value === false) {
    return <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
  return <span className="text-sm font-mono text-foreground">{value}</span>;
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
            O problema
          </Link>
          <Link href="/#como-funciona" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Como funciona
          </Link>
          <Link href="/#precos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Preços
          </Link>
          <Link href="/#seguranca" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Segurança
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Criar conta</Link>
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
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-16 text-center">
        <SectionLabel>Inteligência de Receita · Descoberta · Ação</SectionLabel>

        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Descubra onde sua empresa está perdendo receita.
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-balance text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          Antes que vire prejuízo.
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          ARQON analisa seus dados operacionais e financeiros para identificar vazamentos de
          receita, priorizar os maiores impactos e mostrar onde sua empresa deve agir primeiro.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">
              Começar gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              <PlayCircle className="h-4 w-4" />
              Ver demonstração
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Sem cartão de crédito
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Configuração rápida
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Dados isolados por empresa
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Segurança desde a arquitetura
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
              <span className="text-xs text-muted-foreground">Revenue Intelligence</span>
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
                    Receita em risco
                  </p>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-primary">R$ 842.350</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recuperável
                </p>
                <p className="mt-2 font-mono text-2xl font-bold">R$ 214.800</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Descobertas prioritárias
                </p>
                <p className="mt-2 font-mono text-2xl font-bold">37</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recomendações
                </p>
                <p className="mt-2 font-mono text-2xl font-bold">18</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* principais vazamentos */}
              <div className="rounded-lg border border-border p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Principais vazamentos
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Faturas em atraso", value: "R$ 84.200", count: "12 ocorrências" },
                    { label: "Clientes inativos", value: "R$ 31.800", count: "8 ocorrências" },
                    { label: "Oportunidades estagnadas", value: "R$ 52.400", count: "11 ocorrências" },
                    { label: "Contratos próximos do vencimento", value: "R$ 46.400", count: "6 ocorrências" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold">{row.value}</p>
                        <p className="text-[11px] text-muted-foreground/70">{row.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* priority item */}
              <div className="rounded-lg border border-border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Ação prioritária
                  </p>
                  <Badge variant="destructive" className="text-[10px]">Prioridade alta</Badge>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Cliente X</p>
                    <p className="text-xs text-muted-foreground">Contrato próximo do vencimento</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Impacto estimado
                    </p>
                    <p className="font-mono text-xl font-bold text-primary">R$ 28.000</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ação recomendada
                    </p>
                    <p className="text-sm">Iniciar renovação comercial</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Visualização ilustrativa do produto.
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
    title: "Dinheiro parado",
    text: "Faturas vencidas e recebimentos que deixam de entrar no prazo.",
  },
  {
    icon: Users,
    title: "Clientes esquecidos",
    text: "Clientes que deixam de comprar ou desaparecem do radar comercial.",
  },
  {
    icon: Target,
    title: "Oportunidades perdidas",
    text: "Negócios que permanecem estagnados até perderem relevância.",
  },
  {
    icon: FileWarning,
    title: "Contratos em risco",
    text: "Renovações que se aproximam sem uma ação comercial adequada.",
  },
];

function ProblemSection() {
  return (
    <section id="problema" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>O problema</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Receita não desaparece de uma vez.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ela fica escondida em pequenos sinais espalhados pelos sistemas da empresa.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_CARDS.map((card) => (
            <Card key={card.title} className="bg-card transition-colors hover:border-primary/40">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/40">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{card.text}</p>
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
    title: "Conecte seus dados",
    text: "Importe os dados operacionais da sua empresa.",
  },
  {
    n: "02",
    icon: Cpu,
    title: "Encontre os vazamentos",
    text: "ARQON identifica sinais de perda e oportunidades ocultas.",
  },
  {
    n: "03",
    icon: Zap,
    title: "Saiba onde agir",
    text: "Receba descobertas priorizadas e recomendações práticas.",
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Como funciona</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Dos dados à ação.
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
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-4 top-6 hidden h-5 w-5 text-muted-foreground/30 md:block" />
              )}
            </div>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Dados → Inteligência → Ação
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
    title: "Visibilidade",
    text: "Saiba exatamente onde existem sinais de perda de receita.",
  },
  {
    icon: Target,
    title: "Priorização",
    text: "Descubra quais problemas merecem atenção primeiro pelo impacto potencial.",
  },
  {
    icon: Zap,
    title: "Ação",
    text: "Transforme cada descoberta em uma recomendação prática.",
  },
];

function WhatYouGet() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>O que você obtém</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Não entregue apenas dados. Entregue decisões.
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-secondary/40">
                <b.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold uppercase tracking-wide">{b.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{b.text}</p>
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
  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <SectionLabel>Diferencial ARQON</SectionLabel>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Seu negócio já possui os dados. A ARQON encontra o que está escondido neles.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          A ARQON não é um ERP, não é um CRM, não é um BI genérico. É uma camada de inteligência
          operacional de receita que percorre seus dados existentes para encontrar oportunidades
          financeiras e vazamentos que passam despercebidos nos dashboards tradicionais.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Badge variant="outline" className="border-border text-muted-foreground">Não é ERP</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">Não é CRM</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">Não é BI genérico</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">Não é copilot</Badge>
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
    title: "Empresas B2B",
    text: "Operações com contratos, clientes recorrentes e recebimentos.",
  },
  {
    icon: Briefcase,
    title: "Agências e consultorias",
    text: "Projetos, contratos e oportunidades comerciais.",
  },
  {
    icon: Cpu,
    title: "Empresas de tecnologia",
    text: "Receita recorrente, clientes e contratos.",
  },
  {
    icon: Handshake,
    title: "Operações comerciais",
    text: "Pipeline, oportunidades e ciclos de venda.",
  },
];

function WhoItsFor() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Para quem é</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Feita para empresas que não podem ignorar receita perdida.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <Card key={a.title} className="bg-card">
              <CardContent className="p-6">
                <a.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.text}</p>
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
  const stats = [
    { value: "R$ 842.350", label: "Impacto identificado" },
    { value: "R$ 214.800", label: "Receita potencialmente recuperável" },
    { value: "37", label: "Descobertas prioritárias" },
    { value: "18", label: "Ações recomendadas" },
  ];
  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Impacto financeiro</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Quanto dinheiro sua empresa não está enxergando?
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="font-mono text-3xl font-bold text-primary sm:text-4xl">{s.value}</p>
              <p className="mt-3 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Números ilustrativos. O impacto real depende dos dados de cada empresa.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

function PricingSection() {
  return (
    <section id="precos" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Preços</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Planos que escalam com a sua operação.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comece pelo que faz sentido hoje. Evolua quando precisar de mais profundidade.
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
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-lg">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.cadence}</span>
              </div>

              <Separator className="my-5" />

              <ul className="flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{f.label}</span>
                    <FeatureMark value={f.value} />
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.emphasized ? "default" : "outline"}
                className="mt-6 w-full"
              >
                <Link href="/register">Começar</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Todos os planos incluem análise de dados, faturas em atraso, clientes inativos,
          oportunidades estagnadas e recomendações priorizadas.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Security / Trust                                                   */
/* ------------------------------------------------------------------ */

function SecuritySection() {
  const items = [
    { icon: Building2, title: "Dados isolados por empresa", text: "Cada empresa tem seu próprio contexto de dados." },
    { icon: ShieldCheck, title: "Arquitetura orientada à segurança", text: "Segurança definida desde a especificação." },
    { icon: KeyRound, title: "Autenticação segura", text: "Sessões baseadas em JWT com expiração." },
    { icon: Lock, title: "Segredos fora do código", text: "Nenhuma credencial no código-fonte ou versionamento." },
    { icon: Database, title: "Estrutura de acesso", text: "Acesso organizado por organização e usuário." },
    { icon: Cpu, title: "Infraestrutura preparada para escala", text: "Stack pensada para crescer com a operação." },
  ];
  return (
    <section id="seguranca" className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Segurança e confiança</SectionLabel>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Construído com segurança desde a arquitetura.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
              <item.icon className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
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
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Pare de descobrir perdas depois que elas aconteceram.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Comece a identificar os sinais de vazamento de receita que já existem em seus dados.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">
              Começar gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Ver demonstração</Link>
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
            <p className="mt-2 text-sm text-muted-foreground">Inteligência Operacional de Receita</p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link href="/#problema" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Produto</Link>
            <Link href="/#para-quem" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Para empresas</Link>
            <Link href="/#precos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Preços</Link>
            <Link href="/#seguranca" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Segurança</Link>
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Entrar</Link>
            <Link href="/register" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Criar conta</Link>
          </nav>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ARQON. Todos os direitos reservados.</p>
          <p className="font-mono uppercase tracking-wider">Revenue Intelligence Platform</p>
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
