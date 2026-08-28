# Zippy Check-list

App web mobile-first de checklists operacionais para o Grupo Zippy.
Produto independente — não faz parte do REIS FLOW.

Este pacote entrega o **Sprint 0** (arquitetura + Design System) e o
**Sprint 1** (autenticação + Empresa + Unidade + Usuários) do
briefing, como código real e funcional.

## Stack

Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · Supabase
(Auth + Postgres).

## Estrutura

```
src/
  app/
    (auth)/          login, cadastro, callback de confirmação de e-mail
    (app)/            área logada: hoje, unidades, usuarios, empresa
  components/
    ui/               Button, Input, Card, Badge, EmptyState
    layout/           AppHeader, AppNav
  lib/
    supabase/         clients (browser / server / admin)
    auth/             server actions de login, cadastro, logout
    empresas/ unidades/ usuarios/   server actions de dados
  types/database.ts   tipos das tabelas (Sprint 1)
supabase/
  migrations/0001_init.sql   schema + RLS
```

Separação: UI (`components/`), regra de negócio e acesso a dados
(`lib/*/actions.ts`, sempre via server actions), modelos
(`types/database.ts`), autenticação (`lib/auth`, `middleware.ts`).

## Design System

Os tokens (`tailwind.config.ts`) vieram do protótipo visual já
validado: **navy** `#161F4C` como cor estrutural, **orange**
`#F5821F` como cor de ação, **pink** `#ED4C87` como acento de marca,
mais `success`/`danger` para os status de checklist. Tipografia:
**Baloo 2** (títulos), **Inter** (texto/UI), **JetBrains Mono**
(contagens, horários) — carregadas via `next/font/google` em
`src/app/layout.tsx`.

## Rodando localmente

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode o conteúdo de `supabase/migrations/0001_init.sql`.
3. Em **Authentication → Providers → Email**, para testar sem
   configurar envio de e-mail, desative "Confirm email" (em produção,
   deixe ativado e configure o SMTP).
4. Copie `.env.example` para `.env.local` e preencha com as chaves em
   **Project Settings → API**.
5. Instale as dependências e suba o servidor:

   ```bash
   npm install
   npm run dev
   ```

6. Acesse `http://localhost:3000` → você cai em `/login`. Clique em
   "Criar empresa" para o primeiro cadastro (você entra como gestor).

### Convite de usuários

A tela **Usuários** convida por e-mail via
`supabase.auth.admin.inviteUserByEmail`, que exige a
`SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role)
no `.env.local`. Sem essa chave, o formulário funciona mas avisa que
o convite não pôde ser enviado — o resto do app funciona normalmente.

## O que NÃO está nesta entrega

Por escopo (ver seção 20 do briefing e a ordem de sprints da seção
25): criação/execução de checklists, tarefas, recorrência, histórico,
dashboard, PWA. O schema dessas tabelas já está na migration
(`checklist_templates`, `tarefa_templates`, `execucoes`,
`tarefa_execucoes`), preparado para os próximos sprints sem precisar
de migração destrutiva depois.

## Próximo passo sugerido (Sprint 2)

Setores (CRUD dentro de cada unidade) + criação de checklist
(nome, setor, recorrência, horário, tarefas).
