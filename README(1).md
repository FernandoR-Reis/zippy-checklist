# Zippy Check-list

Aplicação web mobile-first de checklists operacionais para o Grupo Zippy.
Produto independente — não faz parte do REIS FLOW.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase
(Auth + Postgres).

## Funcionalidades implementadas

- Cadastro da primeira empresa e do usuário gestor, login e logout.
- Gestão do nome da empresa, unidades, usuários e setores.
- Convites por e-mail, definição de senha e exclusão de usuários (ações
  administrativas dependem da chave de serviço do Supabase).
- Criação e gestão de modelos de checklist por unidade e setor, com responsável,
  horário e opção de frequência diária, semanal ou mensal.
- Cadastro, edição, exclusão e ordenação de tarefas. Os tipos disponíveis na
  interface são checkbox, Sim/Não, número e texto; tarefas podem ser obrigatórias
  ou opcionais.
- Lista de checklists atribuídos ao usuário em **Hoje**, início e salvamento de
  execução diária, respostas às tarefas e finalização. Tarefas obrigatórias
  precisam estar concluídas para finalizar; após a conclusão, a execução fica
  somente para leitura.
- Proteção das rotas autenticadas e políticas de acesso por empresa no Supabase.

## O que ainda não está implementado

- A frequência escolhida no modelo é salva, mas ainda não determina em quais
  dias o checklist aparece em **Hoje**: os modelos atribuídos são listados
  diariamente.
- O tipo de tarefa `foto` existe no schema do banco, mas não está disponível na
  interface de criação ou execução.
- Não há telas de histórico/relatórios, dashboard gerencial ou PWA.
- Não há suíte de testes automatizados configurada.

## Estrutura

```text
src/
  app/
    (auth)/              login, cadastro, callback e definição de senha
    (app)/               área autenticada: hoje, empresa, unidades e usuários
    (app)/unidades/      setores e modelos de checklist
  components/
    checklists/          formulários e linhas de tarefas
    hoje/                execução dos checklists
    layout/              navegação e layout
    setores/             gestão de setores
    ui/                  componentes visuais
  lib/
    auth/                autenticação
    checklists/          modelos de checklist
    empresas/            dados da empresa
    execucoes/            execução diária
    setores/ unidades/ usuarios/  acesso a dados e regras
    supabase/            clientes de servidor e navegador
  types/database.ts      tipos usados pela aplicação
  middleware.ts          sessão e proteção de rotas
supabase/
  migrations/            schema, políticas RLS e alterações incrementais
```

As alterações de banco estão numeradas e devem ser aplicadas em ordem:

1. `0001_init.sql` — tabelas iniciais e políticas RLS.
2. `0002_setores_checklists.sql` — setores ativos, responsáveis e permissões
   de gestão de modelos e tarefas.
3. `0003_execucoes.sql` — dados e permissões das execuções.
4. `0004_harden_usuarios.sql` — criação segura do perfil inicial e reforço das
   permissões de usuários e checklists.

## Configuração local

1. Crie um projeto no [Supabase](https://supabase.com).
2. No **SQL Editor** do projeto, aplique o conteúdo dos arquivos em
   `supabase/migrations/`, na ordem acima. A aplicação das migrations no projeto
   Supabase de cada ambiente deve ser confirmada separadamente.
3. Em **Authentication → URL Configuration**, configure a URL base do site e
   permita os endereços de retorno usados pelo ambiente, incluindo
   `http://localhost:3000/callback` e
   `https://zippy-checklist.vercel.app/callback`.
4. Para desenvolvimento local sem envio de e-mail, desative a confirmação de
   e-mail em **Authentication → Providers → Email**. Em produção, mantenha-a
   habilitada e configure o envio de e-mails/SMTP.
5. Copie `.env.example` para `.env.local` e preencha as variáveis com os valores
   de **Project Settings → API**:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

6. Instale dependências e inicie a aplicação:

   ```bash
   npm install
   npm run dev
   ```

7. Acesse `http://localhost:3000`. Crie a primeira empresa em **Criar empresa**;
   o usuário que a cria recebe o perfil de gestor.

### Convites e operações administrativas

Para convidar ou excluir usuários, configure `SUPABASE_SERVICE_ROLE_KEY` no
`.env.local` com a chave `service_role` do Supabase. Essa chave é usada apenas
no servidor e **nunca deve ser exposta no navegador ou commitada no repositório**.
Configure também `NEXT_PUBLIC_SITE_URL` para a URL exata do ambiente; essa URL
deve estar permitida na configuração de redirecionamento do Supabase.

Sem a chave de serviço, o restante do aplicativo continua disponível, mas
convites e exclusões administrativas não funcionam.

## Validação

O comando de build de produção também executa a compilação e a checagem de tipos:

```bash
npm run build
```

## Deploy

O aplicativo online está em `https://zippy-checklist.vercel.app`. Para publicar
ou validar um ambiente, configure nele as variáveis de ambiente acima, autorize
`https://zippy-checklist.vercel.app/callback` no Supabase e aplique as migrations
no banco correspondente. A disponibilidade do site, por si só, não confirma que
as migrations e as configurações de Auth do projeto Supabase estejam atualizadas.
