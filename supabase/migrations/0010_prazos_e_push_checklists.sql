alter table public.checklist_templates
  add column if not exists limite_minutos integer not null default 90
  check (limite_minutos between 1 and 1440);

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create table if not exists public.checklist_alertas_enviados (
  id uuid primary key default uuid_generate_v4(),
  checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('nao_executado', 'atrasado')),
  push_enviado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (checklist_template_id, data, tipo)
);

alter table public.checklist_alertas_enviados enable row level security;

create policy "gestores leem alertas dos checklists da unidade"
  on public.checklist_alertas_enviados for select
  using (
    checklist_template_id in (
      select id
      from public.checklist_templates
      where public.pode_gerenciar_unidade(unidade_id)
    )
  );
