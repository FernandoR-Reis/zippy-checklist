create table if not exists public.usuario_setores (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  setor_id uuid not null references public.setores(id) on delete cascade,
  primary key (usuario_id, setor_id)
);

alter table public.usuario_setores enable row level security;

create policy "usuario ve seus setores e gestor ve setores da empresa"
  on public.usuario_setores
  for select using (
    usuario_id = auth.uid()
    or (
      public.sou_gestor()
      and setor_id in (
        select s.id
        from public.setores s
        join public.unidades u on u.id = s.unidade_id
        where u.empresa_id = public.empresa_atual()
      )
    )
  );

create or replace function public.definir_setores_usuario(
  p_usuario_id uuid,
  p_setor_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.sou_gestor() then
    raise exception 'not_authorized';
  end if;

  if not exists (
    select 1
    from public.usuarios
    where id = p_usuario_id
      and empresa_id = public.empresa_atual()
      and perfil = 'operacional'
  ) then
    raise exception 'invalid_user';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_setor_ids, '{}'::uuid[])) as requested(id)
    where not exists (
      select 1
      from public.setores s
      join public.unidades u on u.id = s.unidade_id
      where s.id = requested.id
        and u.empresa_id = public.empresa_atual()
        and s.ativo
    )
  ) then
    raise exception 'invalid_sector';
  end if;

  delete from public.usuario_setores
  where usuario_id = p_usuario_id;

  insert into public.usuario_setores (usuario_id, setor_id)
  select p_usuario_id, requested.id
  from (
    select distinct unnest(coalesce(p_setor_ids, '{}'::uuid[])) as id
  ) requested;
end;
$$;

revoke all on function public.definir_setores_usuario(uuid, uuid[]) from public;
grant execute on function public.definir_setores_usuario(uuid, uuid[]) to authenticated;

create or replace function public.usuario_iniciou_checklist(p_checklist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.execucoes
    where checklist_template_id = p_checklist_id
      and usuario_id = auth.uid()
  );
$$;

revoke all on function public.usuario_iniciou_checklist(uuid) from public;
grant execute on function public.usuario_iniciou_checklist(uuid) to authenticated;

drop policy if exists "ve checklists da propria empresa" on public.checklist_templates;
create policy "ve checklists dos seus setores"
  on public.checklist_templates
  for select using (
    public.sou_gestor()
    or setor_id in (
      select us.setor_id
      from public.usuario_setores us
      join public.setores s on s.id = us.setor_id
      where us.usuario_id = auth.uid()
        and s.ativo
    )
    or public.usuario_iniciou_checklist(id)
  );

drop policy if exists "ve execucoes da propria empresa" on public.execucoes;
create policy "ve execucoes dos seus setores"
  on public.execucoes
  for select using (
    usuario_id = auth.uid()
    or checklist_template_id in (select id from public.checklist_templates)
  );

drop policy if exists "responsavel cria sua execucao" on public.execucoes;
create policy "membro inicia execucao do setor"
  on public.execucoes
  for insert with check (
    usuario_id = auth.uid()
    and checklist_template_id in (
      select id from public.checklist_templates where ativo
    )
  );

drop policy if exists "responsavel atualiza sua execucao" on public.execucoes;
create policy "iniciador ou gestor atualiza execucao"
  on public.execucoes
  for update using (
    status <> 'concluido'
    and (usuario_id = auth.uid() or public.sou_gestor())
    and checklist_template_id in (
      select id from public.checklist_templates
    )
  )
  with check (
    (usuario_id = auth.uid() or public.sou_gestor())
    and checklist_template_id in (
      select id from public.checklist_templates
    )
  );

drop policy if exists "ve tarefa_execucoes da propria empresa" on public.tarefa_execucoes;
create policy "iniciador ou gestor ve tarefas da execucao"
  on public.tarefa_execucoes
  for select using (
    execucao_id in (
      select id
      from public.execucoes
      where usuario_id = auth.uid() or public.sou_gestor()
    )
  );

drop policy if exists "responsavel gerencia tarefa_execucoes da propria execucao" on public.tarefa_execucoes;
create policy "iniciador ou gestor gerencia tarefas da execucao"
  on public.tarefa_execucoes
  for all using (
    execucao_id in (
      select id
      from public.execucoes
      where status <> 'concluido'
        and (usuario_id = auth.uid() or public.sou_gestor())
    )
  )
  with check (
    execucao_id in (
      select id
      from public.execucoes
      where status <> 'concluido'
        and (usuario_id = auth.uid() or public.sou_gestor())
    )
  );
