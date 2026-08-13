# Revisão Geral de Deploy — Fase 0.3 (Opção 1)

**Data:** 2026-08-07
**Commit base:** `a8844c3`
**Escopo:** Configuração de deploy, segurança de rotas não-auditadas (billing, data-sources, findings), headers/CORS, rate limiting, variáveis de ambiente.

---

## 1. Resumo executivo

O sistema de autenticação está blindado (Achados A, C, F corrigidos). Esta revisão encontrou **4 novos pontos de risco** — nenhum bloqueador para o MVP, mas todos devem ser endereçados antes de tráfego real pago. O mais crítico é o **CORS aberto** (correção trivial) e os **dois IDORs no billing** (requerem trabalho de arquitetura já planejado em D-012).

---

## 2. Achados

### Achado G1 — CORS aberto para qualquer origem (MÉDIA)

**Onde:** `artifacts/api-server/src/app.ts:29` — `app.use(cors())` sem configuração.

**O que acontece:** `cors()` sem argumentos emite `Access-Control-Allow-Origin: *`, permitindo que **qualquer site** faça requisições à API. Como a auth usa Bearer tokens (não cookies), o risco de roubo de credenciais é baixo — mas qualquer website malicioso poderia fazer chamadas autenticadas se o usuário colasse um token, e o backend fica exposto a abuso de qualquer origem.

**Impacto:** Hoje = baixo (MVP sem tráfego). Em produção = médio — permite abuso cross-origin.

**Correção:** Restringir CORS à origem do frontend (`WEB_ORIGIN`), com fallback para `localhost` em dev.

---

### Achado G2 — `GET /billing/subscriptions` lista todas as assinaturas (MÉDIA-ALTA)

**Onde:** `artifacts/api-server/src/routes/billing.ts:75`

**O que acontece:** Qualquer usuário autenticado recebe **todas** as assinaturas da conta Abacatepay, sem filtro por organização. O código comenta explicitamente: *"In a later slice we will filter by the caller's organization once we persist a local subscription record."*

**Impacto:** Vazamento cross-tenant de dados de billing. Hoje = baixo (poucos usuários, mesma conta). Escala com o número de tenants.

**Correção:** Requer persistir assinaturas localmente (nova tabela `subscriptions` com `orgId`). Trabalho planejado em D-012.

---

### Achado G3 — `POST /billing/cancel` é um IDOR destrutivo (ALTA)

**Onde:** `artifacts/api-server/src/routes/billing.ts:91`

**O que acontece:** Qualquer usuário autenticado pode cancelar **qualquer** assinatura passando um `subscriptionId` arbitrário. Não há verificação de que a assinatura pertence à organização do caller.

**Impacto:** Destrutivo — um usuário pode cancelar a assinatura de outra organização. Hoje = baixo (IDs não são sequenciais, poucos usuários). Mas é o tipo de bug que causa incidentes reais quando descoberto.

**Correção:** Mesma que G2 — persistir assinaturas localmente com `orgId` e verificar posse antes de cancelar. Planejado em D-012.

---

### Achado G4 — Sem rate limiting nos endpoints de auth (MÉDIA)

**Onde:** `artifacts/api-server/src/routes/auth.ts` — `/auth/login` e `/auth/register` não têm rate limiting.

**O que acontece:** Não há limite de tentativas. Um atacante pode fazer brute-force de senhas no login ou flood de registros.

**Impacto:** Médio — o bcrypt (10 rounds) torna cada tentativa cara para o atacante, mas sem rate limiting o ataque é viável.

**Correção:** Adicionar `express-rate-limit` (ou similar) em `/auth/login` (ex: 10 tentativas / 15 min por IP) e `/auth/register` (ex: 5 / hora por IP).

---

## 3. Achados positivos (confirmações)

| Item | Estado |
|------|--------|
| `SESSION_SECRET` — fail-closed, sem fallback inseguro | ✅ |
| `ABACATEPAY_API_KEY` / `ABACATEPAY_WEBHOOK_SECRET` — fail-closed | ✅ |
| Webhook — verificação fail-closed + `crypto.timingSafeEqual` + HMAC-SHA256 | ✅ |
| Todas as rotas CRUD usam `authenticate` + `orgParamGuard` | ✅ |
| Middleware de erro final — sem leak de stack trace | ✅ |
| Raw body capturado só na rota de webhook (sem overhead global) | ✅ |
| `PORT` — validado, throw se ausente/inválido | ✅ |
| `NODE_ENV` — logger respeja `production` para nível de log | ✅ |

---

## 4. Gaps conhecidos (acknowledged, não-bloqueadores)

| Gap | Contexto |
|-----|----------|
| Billing sem registros locais de assinatura | Causa G2 + G3. Planejado em D-012 (billing evolve to monthly subscriptions). |
| Sem `.env.example` | Gap de onboarding. Não é risco de segurança, mas facilita misconfiguration. |
| Sem `render.yaml` (IaC) | Deploy do Render configurado via dashboard. Não versionado, mas funcional. |
| Sem security headers (helmet) | Sem `X-Frame-Options`, `X-Content-Type-Options`, etc. Baixo risco para API-only. |
| `DEFAULT_EXPIRES_IN = "7d"` | Achado B (logout stateless). Backlog — decisão de arquitetura. |

---

## 5. Matriz de prioridade

| Achado | Severidade | Esforço | Quando |
|--------|-----------|---------|--------|
| G1 — CORS aberto | MÉDIA | Baixo (~5 min) | **Agora** (quick win) |
| G4 — Rate limiting no auth | MÉDIA | Médio (~30 min, nova dep) | **Agora** ou próximo sprint |
| G3 — IDOR no cancel billing | ALTA | Alto (schema + D-012) | Com a evolução do billing (D-012) |
| G2 — Listagem billing cross-tenant | MÉDIA-ALTA | Alto (schema + D-012) | Com a evolução do billing (D-012) |
