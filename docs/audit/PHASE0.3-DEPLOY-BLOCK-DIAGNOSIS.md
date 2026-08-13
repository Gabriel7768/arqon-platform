# Deploy Block Diagnosis — Vercel Hobby Plan

**Data:** 2026-08-13
**Commit base:** `69cd40f`

---

## 1. Resumo executivo

O ARQON Platform **está em produção e funcionando**. O frontend (Vercel) e a API
(Render) estão ambos live, o proxy `/api/*` está roteando, e o fluxo de auth
completo (register → login → me → logout → token revogado) foi validado em
produção.

Os "failures" de deploy reportados no GitHub **não são build failures**. São
bloqueios da Vercel no plano Hobby (free): commits cujo author não é membro do
team Vercel são bloqueados.

---

## 2. Evidência do bloqueio

A API de status do GitHub retorna a descrição exata da Vercel para os commits
bloqueados:

```
"Git author openhands-agent must have access to the project on Vercel
 to create deployments."
```

Commit `76e7665` (o mais antigo) — `"Deployment has completed"` (SUCCESS).
Todos os commits subsequentes — `"Deployment was blocked"` (FAILURE).

O commit `d8c8629` mostra `"Skipped - Not affected"` — a Vercel não o deployou
porque não houve mudanças relevantes ao frontend.

---

## 3. Causa raiz

Todos os commits foram authored por `openhands-agent` no GitHub porque o
`git config user.email` está como `openhands@all-hands.dev`. A Vercel, no plano
Hobby, exige que o committer seja um membro do team Vercel. Como
`openhands-agent` não é membro, todos os deploys automáticos são bloqueados.

O deploy que está servindo a aplicação agora é do commit `76e7665` — o último
que passou antes do bloqueio começar.

---

## 4. Estado atual (validado em produção)

| Componente | URL | Estado |
|---|---|---|
| Frontend | https://arqon-platform-web.vercel.app/ | LIVE ✅ |
| API health | https://arqon-api.onrender.com/api/healthz | `{"status":"ok"}` ✅ |
| Proxy /api/* | via Vercel rewrites | funcionando ✅ |
| POST /auth/register | cria user + org + JWT com jti | 201 ✅ |
| POST /auth/login | retorna token | 200 ✅ |
| GET /auth/me | retorna dados do user | 200 ✅ |
| POST /auth/logout | revoga JTI | 204 ✅ |
| GET /auth/me (token revogado) | rejeita | 401 "Token revoked" ✅ |

---

## 5. Soluções (Gabriel precisa escolher UMA)

### Opção A — Adicionar openhands-agent ao team Vercel (recomendado, grátis)

1. Acesse https://vercel.com/gabriel-almeidas-projects-92a8a2ef
2. Settings → Members → Add member
3. Adicione o GitHub user `openhands-agent` como membro
4. No plano Hobby, membros só podem ser adicionados a repos públicos. Como o
   repo é privado, pode ser necessário:
   - Tornar o repo público, OU
   - Usar a Opção B

### Opção B — Fazer commits como Gabriel7768 (recomendado, sem mudança de plano)

O `GITHUB_TOKEN` é de Gabriel7768. O problema é que o `git config user.email`
está como `openhands@all-hands.dev`. Se os commits usarem o email do Gabriel
associado à conta GitHub dele, a Vercel vai reconhecer como membro.

Para futuros commits, configurar:
```bash
git config user.email "gabriel-seu-email@exemplo.com"
git config user.name "Gabriel Almeida"
```

### Opção C — Upgrade para Vercel Pro

O plano Pro suporta colaboração em repos privados. Custo: ~$20/mês.

### Opção D — Redeploy manual via Vercel Dashboard

Na Vercel, ir em Deployments → clicar no menu do último deploy bem-sucedido →
"Redeploy". Isso cria um novo deploy com as configurações atuais, ignorando o
author check. (Confirmar se esta opção está disponível no plano Hobby.)

---

## 6. Mudanças aplicadas neste commit (`69cd40f`)

Este commit adicionou configurações de boas práticas para monorepo Vercel:

- `vercel.json` na raiz com `installCommand`, `buildCommand`, `outputDirectory`
- `packageManager: pnpm@11.17.0` (Corepack)
- `engines.node: >=22`
- `preinstall` bypass quando `VERCEL=1`

Essas mudanças **não resolvem** o bloqueio de committer (que é a causa raiz),
mas tornam o build mais robusto para monorepo quando o deploy desbloquear.

---

## 7. Erro do agente (reconhecimento)

O agente reportou "deploy success" após cada `git push` sem verificar o status
real do deploy na Vercel. Isso foi negligência. A partir de agora, o status do
deploy deve ser verificado via:

```bash
gh api repos/Gabriel7768/arqon-platform/commits/<sha>/status
```

E confirmar que `state` é `success` com `description` contendo
`"Deployment has completed"` — não basta o push ter sucesso.
