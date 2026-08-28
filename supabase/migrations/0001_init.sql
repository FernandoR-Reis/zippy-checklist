-- Zippy Check-list — schema inicial
-- Sprint 1: empresas, unidades, setores, usuarios (funcional).
-- checklist_templates em diante já ficam criadas (schema estável desde a V1,
-- conforme o briefing), mas sem UI ainda — chegam nos próximos sprints.

create extension if not exists "uuid-ossp";

-- ========== Sprint 1 ==========

create table if not exists public.empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.unidades (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.setores (
  id uuid primary key default uuid_generate_v4(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.perfil_usuario as enum ('gestor', 'operacional');
exception when duplicate_object then null;
end $$;

-- 1:1 com auth.users — criado sob demanda em getOrCreateUsuarioAtual().
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  nome text not null,
  email text not null,
  perfil public.perfil_usuario not null default 'operacional',
  created_at timestamptz not null default now()
);

-- ========== Preparado para os próximos sprints ==========

do $$ begin
  create type public.recorrencia_checklist as enum ('diaria', 'semanal', 'mensal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tipo_tarefa as enum ('checkbox', 'sim_nao', 'numero', 'texto', 'foto');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.status_execucao as enum ('nao_iniciado', 'em_andamento', 'concluido', 'atrasado');
exception when duplicate_object then null;
end $$;

create table if not exists public.checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  setor_id uuid not null references public.setores(id) on delete cascade,
  nome text not null,
  descricao text,
  recorrencia public.recorrencia_checklist not null default 'diaria',
  horario time,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tarefa_templates (
  id uuid primary key default uuid_generate_v4(),
  checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade,
  titulo text not null,
  tipo public.tipo_tarefa not null default 'checkbox',
  obrigatoria boolean not null default true,
  ordem int not null default 0
);

create table if not exists public.execucoes (
  id uuid primary key default uuid_generate_v4(),
  checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  data date not null default current_date,
  inicio timestamptz,
  fim timestamptz,
  status public.status_execucao not null default 'nao_iniciado'
);

create table if not exists public.tarefa_execucoes (
  id uuid primary key default uuid_generate_v4(),
  execucao_id uuid not null references public.execucoes(id) on delete cascade,
  tarefa_template_id uuid not null references public.tarefa_templates(id) on delete cascade,
  resposta jsonb,
  concluida boolean not null default false,
  concluida_em timestamptz,
  evidencia text
);

-- ========== RLS ==========
-- Modelo multiempresa: cada usuário só enxerga dados da própria
-- empresa. As políticas de escrita aqui são o mínimo para o Sprint 1;
-- refine (ex.: só gestor edita checklists) quando essas telas chegarem.

alter table public.empresas enable row level security;
alter table public.unidades enable row level security;
alter table public.setores enable row level security;
alter table public.usuarios enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.tarefa_templates enable row level security;
alter table public.execucoes enable row level security;
alter table public.tarefa_execucoes enable row level security;

create or replace function public.empresa_atual()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select empresa_id from public.usuarios where id = auth.uid();
$$;

-- empresas
create policy "ve a propria empresa" on public.empresas
  for select using (id = public.empresa_atual());

create policy "usuario autenticado pode criar uma empresa" on public.empresas
  for insert with check (auth.uid() is not null);

create policy "gestor edita a propria empresa" on public.empresas
  for update using (
    id = public.empresa_atual()
    and exists (select 1 from public.usuarios where id = auth.uid() and perfil = 'gestor')
  );

-- unidades
create policy "ve unidades da propria empresa" on public.unidades
  for select using (empresa_id = public.empresa_atual());

create policy "gestor gerencia unidades da propria empresa" on public.unidades
  for insert with check (
    empresa_id = public.empresa_atual()
    and exists (select 1 from public.usuarios where id = auth.uid() and perfil = 'gestor')
  );

create policy "gestor edita unidades da propria empresa" on public.unidades
  for update using (
    empresa_id = public.empresa_atual()
    and exists (select 1 from public.usuarios where id = auth.uid() and perfil = 'gestor')
  );

-- setores
create policy "ve setores da propria empresa" on public.setores
  for select using (
    unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
  );

create policy "gestor gerencia setores da propria empresa" on public.setores
  for all using (
    unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
    and exists (select 1 from public.usuarios where id = auth.uid() and perfil = 'gestor')
  ) with check (
    unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
  );

-- usuarios
create policy "ve colegas da propria empresa" on public.usuarios
  for select using (empresa_id = public.empresa_atual());

create policy "usuario insere seu proprio registro" on public.usuarios
  for insert with check (id = auth.uid());

create policy "usuario edita seu proprio registro" on public.usuarios
  for update using (id = auth.uid());

-- checklist_templates / tarefa_templates / execucoes / tarefa_execucoes:
-- leitura liberada para a propria empresa; escrita chega junto com a UI
-- de checklists (Sprint 2+).
create policy "ve checklists da propria empresa" on public.checklist_templates
  for select using (
    unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
  );

create policy "ve tarefas dos checklists da propria empresa" on public.tarefa_templates
  for select using (
    checklist_template_id in (
      select id from public.checklist_templates where unidade_id in (
        select id from public.unidades where empresa_id = public.empresa_atual()
      )
    )
  );

create policy "ve execucoes da propria empresa" on public.execucoes
  for select using (
    checklist_template_id in (
      select id from public.checklist_templates where unidade_id in (
        select id from public.unidades where empresa_id = public.empresa_atual()
      )
    )
  );

create policy "ve tarefa_execucoes da propria empresa" on public.tarefa_execucoes
  for select using (
    execucao_id in (
      select id from public.execucoes where checklist_template_id in (
        select id from public.checklist_templates where unidade_id in (
          select id from public.unidades where empresa_id = public.empresa_atual()
        )
      )
    )
  );
