# Zippy Check-list

App web mobile-first de checklists operacionais para o Grupo Zippy.
Produto independente — não faz parte do REIS FLOW.

Inclui autenticação, gestão de empresas, unidades, setores e usuários,
criação e importação de checklists, execução por tarefa, agenda operacional
e acompanhamento de prazos e alertas.

**Produção:** [zippy-checklist.vercel.app](https://zippy-checklist.vercel.app).

## Stack

Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · Supabase
(Auth + Postgres).

## Estrutura

```
src/
  app/
    (auth)/           login, cadastro, callback e definição de senha
    (app)/            hoje, alertas, unidades, usuarios, empresa
    api/              assinaturas push e rotina de alertas
  components/
    ui/               controles compartilhados, incluindo TimePicker
    layout/           cabeçalho, navegação e feedback
    checklists/ hoje/ usuarios/ alertas/   formulários e fluxos de tela
  lib/
    supabase/         clients de navegador e servidor
    auth/             server actions de login, cadastro, logout
    execucoes/        execução, agenda, prazos e alertas
    push/             envio de notificações Web Push
    checklists/ empresas/ unidades/ setores/ tarefas/ usuarios/
  types/database.ts   tipos das tabelas e perfis de acesso
supabase/
  migrations/         schema, RLS e evolução da agenda (0001 a 0012)
  templates/          e-mails de cadastro e convite
tests/                testes de regras e fluxos de checklist
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
2. Em **SQL Editor**, rode as migrations de `supabase/migrations/` em ordem
   numérica.
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
   "Criar empresa" para o primeiro cadastro (você entra como administrador).
   Se a porta estiver ocupada, use a URL indicada pelo Next.js no terminal.

## Checklists de hoje

A tela **Hoje** mostra a saudação, o horário e fuso da operação, os setores,
horários e estados dos checklists. Execuções acessíveis exibem o progresso
das tarefas efetivamente concluídas. Tarefas justificadas como “Não feitas”
não são contadas como concluídas e aparecem em um aviso próprio.

## Validação e publicação

Antes de publicar, execute:

```powershell
node --test tests\*.test.cjs
npx tsc --noEmit
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm run build
```

Os testes cobrem agenda operacional, duplicação/exclusão e finalização com
tarefas não executadas justificadas. O comando `npm run lint` requer
configuração inicial do ESLint; não há configuração versionada atualmente.

Para publicar o projeto vinculado na Vercel, após revisar e commitar as
alterações:

```powershell
vercel --prod
```

O CLI envia a pasta de trabalho local, não apenas os arquivos do último
commit. A configuração em [.vercelignore](.vercelignore) exclui as variáveis
locais de ambiente, dependências e arquivos de build. Configure as variáveis
de produção na Vercel e confira o status do deploy, o login e os logs após
a publicação.

Migrations, templates de e-mail e a rotina do Supabase Cron **não são
aplicados pelo deploy da Vercel**; configure-os separadamente conforme as
instruções abaixo.

## Funcionalidades e configuração

### Importar checklist de planilha

Em **Unidade → Checklists → Importar planilha**, envie um arquivo `.xlsx`
ou `.csv` de até 10 MB. O app analisa as abas e sugere as colunas de
tarefas, setor e unidade; se necessário, ajuste a aba, as colunas e o
intervalo manualmente. Revise e edite a prévia, escolha o setor, responsável,
frequência e horário e confirme a importação. A planilha é processada no
navegador e nenhum checklist ou tarefa é criado antes da confirmação.

### Observações de tarefas não feitas

Aplique a migration `supabase/migrations/0005_tarefa_observacao.sql` no
SQL Editor do Supabase antes de usar este fluxo. “Não feito” exige um
motivo não vazio e só avança após salvá-lo. A tarefa permanece registrada
como não executada, mas a justificativa permite finalizar o checklist,
inclusive para tarefas obrigatórias. Um aviso identifica as tarefas não
executadas na revisão, no resumo concluído e na lista de hoje; as observações
continuam disponíveis após finalizar. Concluir a tarefa ou resetar o
checklist remove essa observação.

No resumo, “Finalizar checklist” conclui a execução sem confirmação
intermediária e retorna à lista de hoje após salvar. Tarefas obrigatórias
sem conclusão nem justificativa continuam bloqueando a finalização.

### Duplicação de checklists

Após a migration `0007`, aplique
[0008_leitura_checklist_apos_insert.sql](supabase/migrations/0008_leitura_checklist_apos_insert.sql)
no Supabase. Ela permite que administradores e gestores leiam a cópia
retornada pelo `INSERT`, respeitando a empresa e a unidade; as permissões
dos colaboradores não mudam. A cópia preserva campos e tarefas do original
e é criada ativa. Falhas são exibidas na tela e registradas no servidor.
Teste os caminhos de sucesso e falha com `node --test tests/duplicar-checklist.test.cjs`.

### Exclusão de checklists

Administradores e gestores da unidade podem excluir um checklist pela lista
ou pela edição. O botão abre uma confirmação; cancelar não altera os dados.
A exclusão é permanente e remove também tarefas e histórico de execuções
pelas relações do banco. Para preservar o histórico, desative o checklist.
A ação valida a permissão no servidor e usa a política RLS de exclusão da
migration `0007`. Testes: `node --test tests/duplicar-checklist.test.cjs`.

### Convite de usuários

O botão **Novo usuário**, à direita do título **Usuários**, abre
o formulário de convite em um modal. Feche pelo botão de fechar, pela tecla
Escape ou clicando fora do modal.
Em telas pequenas, as ações **Editar** e **Excluir** ficam em uma linha
própria nos cards; e-mails longos quebram a linha e os modais permitem
rolagem em telas de pouca altura.

A tela **Usuários** convida por e-mail via
`supabase.auth.admin.inviteUserByEmail`, que exige a
`SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role)
no `.env.local`. Sem essa chave, o formulário funciona mas avisa que
o convite não pôde ser enviado — o resto do app funciona normalmente.

O envio usa o SMTP Brevo configurado no Supabase Auth. O template de
convite está em [supabase/templates/invite-user.html](supabase/templates/invite-user.html).
Para atualizá-lo, copie o HTML em **Authentication → Emails → Templates →
Invite user** no Supabase, use o assunto **Seu convite para o Zippy Check-list**
e salve. O arquivo não é aplicado automaticamente pelo deploy da Vercel.
Preserve `{{ .ConfirmationURL }}` no botão e no link alternativo: ele valida
o convite antes de redirecionar para a definição de senha.

### Confirmação de cadastro da empresa

O cadastro de uma nova empresa usa o template de confirmação de e-mail em
[supabase/templates/confirm-signup.html](supabase/templates/confirm-signup.html),
com texto próprio para quem está criando uma empresa (diferente do convite
para entrar em uma equipe). Para aplicá-lo, copie o HTML em
**Authentication → Emails → Templates → Confirm signup**, use o assunto
**Confirme seu e-mail para criar sua empresa no Zippy Check-list** e salve.
O arquivo não é aplicado automaticamente pelo deploy da Vercel. Preserve
`{{ .ConfirmationURL }}` no botão e no link alternativo para manter a
confirmação do endereço.

### Acesso compartilhado por setor

Aplique a migration `supabase/migrations/0006_acesso_por_setor.sql` no
SQL Editor do Supabase depois das migrations `0001` a `0005`. Na tela
**Usuários**, o gestor vincula cada colaborador operacional aos setores
que ele pode acessar; membros do setor podem ver e iniciar seus
checklists. Depois do início, os demais colaboradores veem que o checklist está em
andamento, mas somente quem iniciou ou um gestor da unidade pode abrir,
editar ou finalizar aquela execução.

### Administradores e gestores por unidade

Aplique `supabase/migrations/0007_administrador_e_gestor_por_unidade.sql`
depois das migrations `0001` a `0006`. Os gestores existentes são promovidos
a administradores para preservar o acesso atual. Administradores acessam toda
a empresa; gestores ficam limitados à unidade vinculada e podem gerenciar seus
checklists, setores e colaboradores operacionais. Colaboradores operacionais
precisam de uma unidade e continuam limitados aos setores atribuídos. Um
administrador pode atribuir a unidade dos usuários existentes na tela
**Usuários**. O botão **Editar** permite atualizar nome, perfil e unidade;
Gestores podem editar somente o nome de Operacionais da própria unidade.

### Prazos, acompanhamento e notificações

Aplique as migrations `0010_prazos_e_push_checklists.sql` e
`0011_agendar_alertas.sql` depois da migration `0009`, e então
`0012_agenda_operacional_empresa.sql`. Checklists existentes
recebem prazo padrão de 90 minutos; o gestor pode ajustar a duração ao criar
ou editar cada checklist. O prazo é contado a partir do horário configurado,
no fuso configurado pelo administrador em **Empresa**. A mesma área define
início e fim da operação; o padrão inicial `00:00–23:59` preserva o
comportamento anterior. O seletor visual separa horas (00–23) e minutos
(00–59) em colunas roláveis, com navegação por teclado e envio em `HH:MM`;
selecionar o minuto confirma o horário e fecha o seletor, enquanto a validação
ao salvar permanece no servidor.
O mesmo seletor é usado ao criar, editar e importar checklists, com horário
obrigatório e atualização imediata dos avisos de prazo. Nos formulários de
checklist, o controle usa o tamanho compacto, alinhado aos demais campos;
em **Empresa**, mantém o tamanho ampliado.
Em operações que atravessam a meia-noite, os
checklists após a virada continuam vinculados ao dia em que a operação
começou. Cada checklist conserva seu próprio horário e prazo. Se o prazo
ultrapassar o fim da operação, o app avisa e mantém a duração integral.
Só é possível iniciar a partir do horário do checklist;
quando o prazo termina, o progresso fica preservado, mas não pode mais ser
alterado. A execução de uma nova data operacional começa separada da anterior.

Administradores e gestores têm a área **Alertas**, com checklists agendados,
em andamento, não executados, atrasados e as tarefas ainda pendentes. Para
acompanhar a operação, use a busca por checklist/responsável e os filtros
de unidade, setor e status. Os cartões de resumo também filtram a lista;
“Precisam de atenção” reúne itens ainda não iniciados, não executados e com
prazo vencido. Os contadores respeitam a busca e os filtros de unidade/setor.
As tarefas não concluídas podem ser expandidas em cada cartão. A aba
**Histórico · 30 dias** mantém os filtros disponíveis para alertas registrados
de operações anteriores; trocar de aba limpa os filtros. Os filtros de tela
não alteram permissões nem os critérios de envio de notificações.

Para receber notificações mesmo com o app fechado:

1. Gere um par de chaves Web Push com `npx web-push generate-vapid-keys`.
2. Configure no ambiente do app (local e Vercel): `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`,
   `WEB_PUSH_SUBJECT` e `CHECKLIST_ALERTS_SECRET`. Use uma chave aleatória
   longa para `CHECKLIST_ALERTS_SECRET` (por exemplo, `openssl rand -base64 32`);
   nunca publique a chave privada ou o segredo.
3. Crie dois segredos no Supabase Vault, substituindo pelos valores reais:

   ```sql
   select vault.create_secret('https://SEU-DOMINIO', 'zippy_app_url');
   select vault.create_secret('SEU_CHECKLIST_ALERTS_SECRET', 'zippy_alerts_secret');
   ```

4. Agende a rotina no SQL Editor do Supabase:

   ```sql
   select cron.schedule(
     'zippy-checklist-alertas',
     '* * * * *',
     $$
       select net.http_post(
         url := (select decrypted_secret from vault.decrypted_secrets where name = 'zippy_app_url')
           || '/api/cron/checklist-alertas',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || (
             select decrypted_secret from vault.decrypted_secrets where name = 'zippy_alerts_secret'
           )
         ),
         body := '{}'::jsonb,
         timeout_milliseconds := 10000
       );
     $$
   );
   ```

5. Cada gestor/administrador abre **Alertas** e ativa notificações no aparelho.
   No iPhone, o site deve ser adicionado à tela inicial e aberto como app; o
   navegador também precisa conceder permissão para notificações.

A rotina usa o Supabase Cron a cada minuto e a Vercel não precisa executar
cron. O endpoint só aceita chamadas com o segredo configurado. Erros de envio
ficam registrados nos logs da função e a área **Alertas** continua mostrando
os casos mesmo quando um aparelho ainda não ativou push.

## Próximos passos

Histórico gerencial por período, filtros por unidade/setor e indicadores
consolidados de cumprimento podem ser adicionados à área **Alertas**.
