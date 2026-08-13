# Fase 0.3 — Auditoria de Autenticação

> **Data:** 2026-08-12
> **Escopo:** Sistema de autenticação do `api-server` (registro, login, logout, `/auth/me`, middleware `authenticate`, `org-guard`, pacote `@workspace/auth`).
> **Ambiente:** Servidor local na porta 3998 (`NODE_ENV` não definido como `production`), banco Supabase de desenvolvimento.
> **Decisão governante:** D-009 (push exige confirmação do founder), D-010 (segredos só no gerenciador de segredos), SEC-001.

---

## 1. Resultado dos casos obrigatórios

Os 4 casos de teste mandatórios do plano de auditoria de auth **passaram** (isolamento de tenant e validação de token funcionam corretamente).

| # | Caso | Resultado | Evidência |
|---|------|-----------|-----------|
| 1 | **Isolamento de tenant** — User A (org 12) tenta ler recurso da org 13 do User B | ✅ **403** `{"error":"organization_access_denied"}` | `GET /api/organizations/13` com token de A → 403 |
| 2 | **JWT expirado** — token com exp no passado | ✅ **401** `{"error":"Invalid or expired token"}` | token assinado com `exp` = agora - 1h |
| 3 | **Assinatura inválida** — token assinado com segredo errado | ✅ **401** `{"error":"Invalid or expired token"}` | token assinado com `"wrong-secret"` |
| 4 | **Usuário deletado** — token de um user removido do DB | ✅ **401** em `/auth/me` `{"error":"User not found"}` | user deletado após login; `/auth/me` rejeita |

**Conclusão mandatória:** o núcleo de auth está sólido. Tokens são verificados criptograficamente, isolamento multi-tenant é aplicado no middleware, e usuários removidos perdem acesso em endpoints autenticados.

---

## 2. Achados adicionais (fora do escopo mandatório)

Estes 5 itens foram descobertos durante a auditoria e representam riscos reais, ordenados por severidade.

### Achado A — Race condition no registro (ALTA severidade)

**Onde:** `artifacts/api-server/src/routes/auth.ts` — `POST /auth/register`.

**O que acontece:** Dois registros simultâneos com o mesmo email podem passar pela checagem `existing.length > 0` (ambos veem 0) antes que qualquer `INSERT` aconteça. Sem constraint `UNIQUE` no email e sem transação, ambos prosseguem:

1. Ambos criam uma `organization` (órfã).
2. O segundo `INSERT` em `users` falha (se houver constraint) ou duplica (se não houver).
3. O servidor retorna **HTTP 500** (erro não tratado do Drizzle/Postgres) em vez de **HTTP 409** "Email already registered".

**Reprodução:** dois requests `POST /auth/register` com o mesmo email disparados em paralelo (testado com `race_test.sh`).

**Impacto:**
- Resposta 500 em vez de 409 (má UX + vaza stack trace, ver Achado C).
- Criação de **organization órfã** no banco (dado inconsistente — a org existe mas não tem dono/usuário vinculado).
- Em alto volume, um atacante pode inflar o banco com orgs órfãs.

**Correção recomendada:**
1. Adicionar constraint `UNIQUE` na coluna `users.email` no schema Drizzle (garante integridade no nível do DB).
2. Envolver a checagem + os dois `INSERT`s em uma transação (`db.transaction(...)`).
3. Capturar o erro de violação de unique (`23505`) e retornar `409` em vez de deixar propagar como 500.

### Achado B — Logout stateless / sem revogação (MÉDIA severidade)

**Onde:** `artifacts/api-server/src/routes/auth.ts` — `POST /auth/logout`.

**O que acontece:** O endpoint retorna `204 No Content` e **não faz nada** — não há blacklist de tokens, não há invalidação de sessão. O JWT continua válido até expirar (7 dias, ver `DEFAULT_EXPIRES_IN`).

```ts
router.post("/auth/logout", (_req, res): void => {
  res.sendStatus(204);  // ← logout é no-op
});
```

**Impacto:** Se um token for roubado (ex: XSS, device compartilhado), o "logout" no cliente não invalida o token no servidor. O atacante continua autenticado por até 7 dias.

**Correção recomendada (esforço crescente):**
- **Curto prazo:** reduzir `DEFAULT_EXPIRES_IN` de `"7d"` para `"1d"` ou `"8h"` + implementar refresh tokens de curta duração.
- **Médio prazo:** adicionar uma blacklist de tokens revogados (tabela `revoked_tokens` no DB, checada no middleware `authenticate`) ou usar uma denylist em Redis.
- **Longo prazo:** migrar para sessões server-side (cookie + sessão no DB) em vez de JWT stateless, o que dá revogação imediata nativa.

### Achado C — Stack trace do Express vazado em JSON malformado (MÉDIA severidade)

**Onde:** `artifacts/api-server/src/app.ts` — ausência de middleware de erro.

**O que acontece:** Não há `app.use((err, req, res, next) => ...)` de tratamento de erros. Quando o `express.json()` encontra um body inválido (ex: `{"email":}`), o Express usa o handler padrão, que em modo development (`NODE_ENV !== "production"`) retorna o stack trace completo do Express no corpo da resposta.

**Reprodução:** `POST /api/auth/login` com body `{"email":` → resposta 400 com `stack: "SyntaxError: ...\n    at ..."` contendo caminhos do sistema de arquivos e versões internas.

**Impacto:** Vazamento de informação (caminhos de arquivos, estrutura interna) que facilita reconhecimento para um atacante.

**Correção recomendada:**
1. Adicionar um middleware de erro final em `app.ts` que **sempre** retorne `{ "error": "Internal server error" }` sem stack trace, independente do `NODE_ENV`.
2. Garantir `NODE_ENV=production` em todos os ambientes de deploy (Render, etc.).
3. Logar o stack trace no logger (pino) server-side, mas nunca no response.

### Achado D — Validação de input via Zod funciona corretamente (CONFIRMAÇÃO POSITIVA)

**Onde:** `RegisterBody` / `LoginBody` em `@workspace/api-zod`, usados com `safeParse` em todos os endpoints de auth.

**O que acontece:** Toda entrada é validada antes de tocar no DB. Emails inválidos, senhas curtas, campos faltantes retornam `400` com a mensagem de erro do Zod. Não há SQL injection (usa Drizzle parametrizado).

**Conclusão:** A camada de validação está sólida — é o padrão correto.

### Achado E — Sem user enumeration no login (CONFIRMAÇÃO POSITIVA)

**O que acontece:** Login com email inexistente e login com email existente + senha errada retornam a **mesma mensagem genérica** `{"error":"Invalid email or password"}` (HTTP 401). Um atacante não consegue distinguir "email não existe" de "senha errada", impedindo enumeração de contas.

**Conclusão:** Padrão correto (OWASP recomenda mensagens genéricas no login).

### Achado F — organizationId NULL vaza todas as organizações em GET /organizations (BAIXA severidade, defesa em profundidade)

**Onde:** `artifacts/api-server/src/routes/organizations.ts` — `GET /organizations` (listagem).

**O que acontece:** A rota de listagem busca o usuário e, se `organizationId` for NULL (falsy), cai num `else` que executa `db.select().from(organizationsTable)` **sem cláusula WHERE** — retornando todas as organizações do banco (vazamento cross-tenant). O `orgGuard` (rotas `/:id`) **não** tem esse problema: ele compara `user.organizationId !== orgId`, e `null !== 12` é `true` → 403.

```ts
// Código vulnerável (antes da correção):
if (user[0].organizationId) {
  orgs = await db.select().from(organizationsTable).where(eq(...));
} else {
  orgs = await db.select().from(organizationsTable);  // ← lista TODAS as orgs
}
```

**Impacto:** Hoje = nenhum. Verifiquei no DB: **0 usuários com `organizationId IS NULL`** (de 5 users), e todo registro cria uma org e vincula ao user. Portanto o caminho perigoso não é alcançável pelo fluxo normal hoje. Mas é uma defesa em profundidade que faltava — se um dia um user for criado sem org (seed manual, migração, bug futuro), ele veria todas as orgs.

**Correção aplicada:** Removido o `else` que lista tudo. Se `organizationId` for NULL, a rota retorna **403** `{"error":"organization_access_denied"}` em vez de listar todas as orgs.

---

## 3. Resumo de severidade e prioridade

| Achado | Severidade | Esforço de correção | Prioridade |
|--------|-----------|---------------------|------------|
| A — Race condition no registro | ALTA | Médio (transação + unique constraint + handler 23505) | P1 — ✅ Corrigido (d8c8629) |
| B — Logout stateless | MÉDIA | Médio (blacklist) / Alto (sessões) | P2 — backlog (decisão de arquitetura) |
| C — Stack trace vazado | MÉDIA | Baixo (1 middleware de erro + NODE_ENV=prod) | P2 — ✅ Corrigido (d8c8629) |
| F — GET /organizations com NULL | BAIXA | Baixo (rejeitar NULL) | P3 — ✅ Corrigido |
| D — Validação Zod | ✅ OK | — | — |
| E — Sem user enumeration | ✅ OK | — | — |

---

## 4. Estado do banco de auditoria

Durante os testes foram criados dados de teste no Supabase de desenvolvimento:
- 5 users, 7 organizations (incluindo 1 org órfã do teste de race condition).
- Recomenda-se limpar esses dados antes de um ambiente de produção, ou rodar em um DB isolado.

---

## 5. Próximos passos

1. **Corrigir Achado A (race condition)** — é o mais importante e bloqueia confiança no fluxo de registro.
2. **Corrigir Achado C (stack trace)** — correção trivial de 1 middleware, alto valor.
3. **Decidir postura de Achado B (logout)** — depende da estratégia de sessão vs JWT.
4. Retomar a **Fase 3** (revisão geral) após aplicar as correções de P1/P2, ou documentar a aceitação de risco pelo founder.
