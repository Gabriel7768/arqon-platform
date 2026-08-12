# ARQON — Fase 0: Auditoria Completa (0.1–0.2)

> **Data:** 2026-08-10
> **Autor:** CTO (acting)
> **Estado:** Auditoria concluída. Correções NÃO iniciadas (per regra fundamental: ler tudo antes de mudar).

## Metodologia

Leitura exaustiva de: README, AGENTS.md, `docs/governance/` (INDEX + standards + specs),
`lib/api-spec/openapi.yaml`, todos os schemas Drizzle, módulos de auth/billing,
detector engine (revenue-engine.ts), todas as rotas da API, middlewares, frontend
(App.tsx, main.tsx, auth.tsx, i18n.tsx, dashboard, format), testes existentes.
Execução de `pnpm install`, `pnpm typecheck`, `pnpm build`, `pnpm -r test`.

---

## 0.2 — Resultado de execução do sistema

| Comando | Resultado | Notas |
|---|---|---|
| `pnpm install` | ✅ Clean | pnpm 11.21.0, 13 workspace projects, `minimumReleaseAge: 1440` (supply-chain defense) |
| `pnpm run typecheck` | ✅ Passa | libs + 4 artifacts + scripts, zero erros |
| `pnpm run build` | ✅ Passa | api-server (esbuild, 2.9MB bundle ⚠️ grande), web (Vite, 594kB ⚠️ >500kB warn), mockup-sandbox |
| `pnpm -r test` | ✅ 243/243 passam | billing 32, auth 22, i18n 31, column-detection-engine 107, api-server 51 — **COM `DATABASE_URL` setada** |
| `pnpm -r test` (sem DATABASE_URL) | ❌ 4 suites fail | api-server tests exigem DB real; vitest.config não define `DATABASE_URL` → quebra em CI/sem-DB |

**Total de testes:** 243 passando (quando `DATABASE_URL` está disponível).

---

## Matriz de Auditoria por Área (0.1)

| Área | Estado | Problemas | Severidade | Ação |
|---|---|---|---|---|
| **Auth** | 🟡 Funcional, com lacunas | (1) Backlog 2 JÁ FEITO — `lib/auth.ts` já delega a `@workspace/auth`, gap `?? "arqon-dev-secret"` fechado. (2) Sem rate limiting em login/register (brute force possível). (3) Race condition no register: check-then-insert sem lock/transaction — dois registros concorrentes do mesmo email podem passar pelo check. Mitigado parcialmente pela unique constraint no DB (segundo insert falha com 500, não 409). | ALTA (rate limit) / MÉDIA (race) | Adicionar rate limiting (Fase 0.14). Envolver register em transaction + tratar unique violation → 409. |
| **Database** | 🟡 Funcional, sem integridade referencial | (1) **NENHUMA foreign key** em nenhuma das 7 tabelas — `orgId`, `dataSourceId`, `findingId`, `userId`, `triggeredBy` são integers sem `references()`. Integridade referencial depende 100% de código de aplicação. (2) `drizzle-kit push` falha em ambiente não-TTY (problema operacional, não de correção). (3) Sem migrations versionadas — usa `push` (dev-only). | ALTA | Adicionar FKs (Fase 0.5). Avaliar migration versionada para prod. |
| **API** | 🟢 Sólida | OpenAPI-first, 18 paths, Zod validation em todos os endpoints, supertest no org-guard. Formatação consistente (ISO dates, parseFloat de numeric). Sem divergências spec↔impl detectadas nos paths lidos. | BAIXA | Manter. |
| **Frontend** | 🟡 Funcional, com dívida i18n | (1) `ArqonI18nProvider` JÁ conectado em `main.tsx` (Backlog 1 parcialmente feito). (2) `useI18n`/`t()` usados APENAS em landing/login/register — dashboard, findings, recommendations, data-sources, organizations, settings **ainda têm strings hardcoded em inglês**. (3) `format.ts` usa locale fixo `en-US` para moeda/número/data — ignora o locale do i18n ativo. (4) Bundle 594kB (warn >500kB). | MÉDIA | Completar tradução das páginas internas (Fase 0.12). Conectar format.ts ao locale ativo. Code-splitting (Fase 0.19). |
| **Billing** | 🟡 Arquitetura pronta, não testado E2E | (1) `@workspace/billing` tem subscriptions (createSubscription/listSubscriptions/cancelSubscription) — além do ONE_TIME. (2) Webhook tem verificação fail-closed (query secret OU HMAC). (3) **Sem persistência local de subscription** — Abacatepay é source of truth; plan-gating não existe. (4) **Não testado end-to-end** em produção (bloqueado por env vars do Render). (5) Sem idempotency key de cliente (confia no eventId do provider). | MÉDIA | Testar E2E após deploy (Fase 0.13/0.24). Avaliar persistência local p/ plan-gating. |
| **Detector Engine** | 🟢 Robusto, mas acoplado | (1) 4 detectores funcionais, com upsert idempotente (fingerprint), stale sweep, entity exposure dedup. (2) **NÃO há abstração `Detector` interface** — toda a lógica está inline em `analyzeDataSource()` (4 blocos if sequenciais). (3) `detectSeverity` e `getPriorityFromSeverity` são essencialmente a mesma função. (4) Sem `detectorVersion`/`rulesVersion` registrado por finding (apenas `confidenceScore=100`). (5) `priority = severity` (não `impact × urgency × confidence`); contract_expiration usa severidade temporal, não financeira (documentado como exceção). | MÉDIA | Extrair interface `Detector` (Fase 0.7). Adicionar `detectorVersion` (Fase 0.16). Documentar fórmula de priorização (Fase 0.10). |
| **Security** | 🔴 Lacunas críticas para produção | (1) **Sem helmet** (sem security headers: X-Content-Type-Options, X-Frame-Options, CSP, etc). (2) **Sem rate limiting** em nenhum endpoint. (3) CORS `cors()` sem allowlist — aceita qualquer origem (`origin: true` implícito). (4) **Sem CSRF protection** (aceitável p/ API JWT-only stateless, mas requer documentação). (5) JWT em localStorage (XSS → token theft; padrão da indústria mas com risco). (6) Demo account advertised no README mas **não existe no código** (doc-vs-impl divergence). | ALTA | Helmet + CORS allowlist + rate limiting (Fase 0.14/0.20). Resolver demo account (Fase 0.26). |
| **Testing** | 🟡 Cobertura boa em pacotes, lacuna em E2E | (1) 243 testes, mas api-server tests são integration (precisam DB real). (2) Sem testes E2E (register→login→upload→process→discoveries→dashboard→billing). (3) Sem security tests automatizados de isolamento tenant. (4) `vitest.config.ts` não seta `DATABASE_URL` → CI sem DB quebra. (5) Sem testes do CSV ingestion robusto (edge cases). | MÉDIA | Adicionar E2E + security tests (Fase 0.18). Fixar `DATABASE_URL` no vitest config OU separar unit de integration. |
| **Observability** | 🟢 Base sólida | (1) `pino` + `pino-http` com `req.id` (request_id). (2) Logs estruturados. (3) **Faltam campos de contexto**: orgId, dataSourceId, detectorId/version NÃO são logados nas queries/processing (só em error). (4) Sem error/processing/billing/security log separation formal. | BAIXA | Enriquecer logs com contexto (Fase 0.15). |
| **Deployment** | 🟡 Parcialmente validado | (1) Frontend Vercel ✅ (HTTP 200). (2) Backend Render healthz ✅. (3) DB Supabase ✅ (7 tabelas criadas nesta sessão). (4) **Auth quebra em produção** — falta `SESSION_SECRET` no Render Environment Group. (5) `ABACATEPAY_API_TOKEN` precisa renomear para `ABACATEPAY_API_KEY`. (6) Sem `render.yaml` (config IaC). (7) Sem `.env.example` no repo (README referencia `.env.example` que não existe). | ALTA | Configurar env vars no Render (Fase 0.24). Criar `.env.example`. |

---

## Divergências Documentação ↔ Implementação

| # | Documento diz | Implementação real | Severidade |
|---|---|---|---|
| DV-1 | README: "Demo account `demo@arqon.io` / `demo123456`, pre-seeded with 20-row CSV → 62 findings" | **Não existe código de seed**; nenhuma rota cria essa conta; `demo-seed.csv` existe mas não é carregado automaticamente | MÉDIA |
| DV-2 | README: "`cp .env.example .env`" | **`.env.example` não existe** no repositório | BAIXA |
| DV-3 | README: "Run the API server (port 5000)" | api-server lê `PORT` env var (sem default); não há porta 5000 hardcoded | BAIXA |
| DV-4 | AGENTS.md: "Backlog 2 — Migrar api-server para `@workspace/auth`" (pendente) | **JÁ FEITO** — `lib/auth.ts` já importa e delega para `@workspace/auth` | BAIXA (doc desatualizada) |
| DV-5 | AGENTS.md: "Backlog 1 — Integrar i18n no app web" (pendente) | **Parcialmente feito** — `ArqonI18nProvider` conectado em `main.tsx`, `LanguageToggle` existe, landing/login/register traduzidos; páginas internas NÃO | BAIXA (doc desatualizada) |
| DV-6 | README: tech stack lista "OpenAPI-first contract (Orval codegen)" | `lib/api-spec/orval.config.ts` existe — confirmado | — (consistente) |
| DV-7 | README governance: "9 standards frozen" + "SEC-001 Frozen v1.0" | `docs/governance/standards/SEC-001.md` existe — confirmado frozen | — (consistente) |

---

## Itens PREPARADOS para expansão (já presentes, conforme Fase 0 "preparar ≠ implementar")

| Abstração | Estado | Avaliação |
|---|---|---|
| `@workspace/billing` BillingClient + adapter | ✅ Existe | Provider isolado; adicionar novo gateway = novo adapter |
| `@workspace/i18n` core + React adapter | ✅ Existe | Framework-agnostic; locale switching runtime |
| `@workspace/auth` AuthClient | ✅ Existe | JWT hashing/verification isolado |
| Column Detection Engine | ✅ Existe | Detecta colunas semanticamente; revenue-engine delega |
| Entity exposure dedup | ✅ Existe | Previne double-counting cross-detector |
| Finding persistence (fingerprint upsert) | ✅ Existe | Idempotente cross-runs; stale sweep |
| Recommendation generation (findingId upsert) | ✅ Existe | Preserva analyst state em re-runs |
| **Detector interface** | ❌ FALTA | 4 detectores inline em `analyzeDataSource()` — precisa extrair (Fase 0.7) |
| **Versioning (detectorVersion/rulesVersion)** | ❌ FALTA | Findings não registram versão do detector (Fase 0.16) |
| **Rate limiting** | ❌ FALTA | (Fase 0.14) |
| **Health /ready com dependências** | ❌ FALTA | Só `/healthz` (process alive), sem `/ready` (Fase 0.25) |

---

## Conclusão da Fase 0.1/0.2

O MVP é **tecnicamente sólido na lógica de negócio** (detectores, persistência idempotente,
isolamento por org, dedup de exposure) mas tem **lacunas de segurança e operação
que o impedem de receber usuários externos com confiança**:

1. **CRÍTICO (bloqueia produção):** `SESSION_SECRET` ausente no Render + `ABACATEPAY_API_TOKEN`→`_KEY` (Fase 0.24).
2. **ALTO (segurança):** sem helmet, sem CORS allowlist, sem rate limiting (Fases 0.14/0.20).
3. **ALTO (integridade):** sem foreign keys no schema (Fase 0.5).
4. **MÉDIO (expansibilidade):** detector engine sem interface `Detector` + sem versionamento (Fases 0.7/0.16).
5. **MÉDIO (doc):** demo account inexistente, `.env.example` ausente, AGENTS.md desatualizado (Fases 0.22/0.26).

**Próximo passo:** prosseguir para Fase 0.3 (Auth) → 0.4 (Multi-tenancy) → 0.5 (DB) em sequência,
auditoria detalhada + testes dos 4 casos de auth e isolamento tenant, antes de qualquer correção.
