drop policy if exists "gestor edita a propria empresa" on public.empresas;
drop policy if exists "ve unidades da propria empresa" on public.unidades;
drop policy if exists "gestor gerencia unidades da propria empresa" on public.unidades;
drop policy if exists "gestor edita unidades da propria empresa" on public.unidades;
drop policy if exists "ve setores da propria empresa" on public.setores;
drop policy if exists "gestor gerencia setores da propria empresa" on public.setores;
drop policy if exists "ve colegas da propria empresa" on public.usuarios;
drop policy if exists "ve checklists dos seus setores" on public.checklist_templates;
drop policy if exists "ve checklists da propria empresa" on public.checklist_templates;
drop policy if exists "gestor cria checklists da propria empresa" on public.checklist_templates;
drop policy if exists "gestor edita checklists da propria empresa" on public.checklist_templates;
drop policy if exists "ve tarefas dos checklists da propria empresa" on public.tarefa_templates;
drop policy if exists "gestor gerencia tarefas dos proprios checklists" on public.tarefa_templates;
drop policy if exists "ve execucoes da propria empresa" on public.execucoes;
drop policy if exists "ve execucoes dos seus setores" on public.execucoes;
drop policy if exists "membro inicia execucao do setor" on public.execucoes;
drop policy if exists "iniciador ou gestor atualiza execucao" on public.execucoes;
drop policy if exists "usuario ve seus setores e gestor ve setores da empresa" on public.usuario_setores;
drop policy if exists "ve tarefa_execucoes da propria empresa" on public.tarefa_execucoes;
drop policy if exists "iniciador ou gestor ve tarefas da execucao" on public.tarefa_execucoes;
drop policy if exists "iniciador ou gestor gerencia tarefas da execucao" on public.tarefa_execucoes;

drop function if exists public.sou_gestor();

alter type public.perfil_usuario rename to perfil_usuario_antigo;
create type public.perfil_usuario as enum ('administrador', 'gestor', 'operacional');

alter table public.usuarios
  add column if not exists unidade_id uuid references public.unidades(id) on delete set null;

alter table public.usuarios
  alter column perfil drop default,
  alter column perfil type public.perfil_usuario
  using (
    case
      when perfil::text = 'gestor' then 'administrador'
      else perfil::text
    end
  )::public.perfil_usuario;

alter table public.usuarios
  alter column perfil set default 'operacional';

drop type public.perfil_usuario_antigo;

create index if not exists usuarios_unidade_id_idx
  on public.usuarios (unidade_id);

alter table public.usuarios
  add constraint usuarios_unidade_obrigatoria
  check (perfil = 'administrador' or unidade_id is not null)
  not valid;

with setores_de_unica_unidade as (
  select us.usuario_id, (array_agg(distinct s.unidade_id))[1] as unidade_id
  from public.usuario_setores us
  join public.setores s on s.id = us.setor_id
  group by us.usuario_id
  having count(distinct s.unidade_id) = 1
)
update public.usuarios u
set unidade_id = setores.unidade_id
from setores_de_unica_unidade setores
where u.id = setores.usuario_id
  and u.perfil = 'operacional'
  and u.unidade_id is null;

delete from public.usuario_setores us
using public.usuarios u, public.setores s
where us.usuario_id = u.id
  and us.setor_id = s.id
  and (
    u.perfil = 'administrador'
    or u.unidade_id is null
    or s.unidade_id <> u.unidade_id
  );

create or replace function public.criar_empresa_e_usuario(
  nome_empresa text,
  nome_usuario text
)
returns public.usuarios
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_empresa public.empresas;
  novo_usuario public.usuarios;
  email_usuario text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if exists (select 1 from public.usuarios where id = auth.uid()) then
    raise exception 'user_profile_already_exists';
  end if;

  if length(trim(coalesce(nome_empresa, ''))) = 0
    or length(trim(coalesce(nome_usuario, ''))) = 0
    or email_usuario is null then
    raise exception 'invalid_profile_data';
  end if;

  insert into public.empresas (nome)
  values (trim(nome_empresa))
  returning * into nova_empresa;

  insert into public.usuarios (id, empresa_id, nome, email, perfil)
  values (auth.uid(), nova_empresa.id, trim(nome_usuario), email_usuario, 'administrador')
  returning * into novo_usuario;

  return novo_usuario;
end;
$$;

revoke all on function public.criar_empresa_e_usuario(text, text) from public;
grant execute on function public.criar_empresa_e_usuario(text, text) to authenticated;

create or replace function public.sou_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and perfil in ('administrador', 'gestor')
  );
$$;

create or replace function public.sou_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and perfil = 'administrador'
  );
$$;

create or replace function public.unidade_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unidade_id from public.usuarios where id = auth.uid();
$$;

create or replace function public.pode_acessar_unidade(p_unidade_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios atual
    join public.unidades unidade on unidade.id = p_unidade_id
    where atual.id = auth.uid()
      and atual.empresa_id = unidade.empresa_id
      and (
        atual.perfil = 'administrador'
        or (
          atual.perfil in ('gestor', 'operacional')
          and atual.unidade_id = unidade.id
        )
      )
  );
$$;

create or replace function public.pode_gerenciar_unidade(p_unidade_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios atual
    join public.unidades unidade on unidade.id = p_unidade_id
    where atual.id = auth.uid()
      and atual.empresa_id = unidade.empresa_id
      and (
        atual.perfil = 'administrador'
        or (atual.perfil = 'gestor' and atual.unidade_id = unidade.id)
      )
  );
$$;

create or replace function public.pode_ver_checklist(p_checklist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.checklist_templates checklist
    join public.unidades unidade on unidade.id = checklist.unidade_id
    join public.usuarios atual on atual.id = auth.uid()
    where checklist.id = p_checklist_id
      and atual.empresa_id = unidade.empresa_id
      and (
        atual.perfil = 'administrador'
        or (atual.perfil = 'gestor' and atual.unidade_id = unidade.id)
        or (
          atual.perfil = 'operacional'
          and atual.unidade_id = unidade.id
          and (
            exists (
              select 1
              from public.usuario_setores vinculo
              join public.setores setor on setor.id = vinculo.setor_id
              where vinculo.usuario_id = atual.id
                and setor.id = checklist.setor_id
                and setor.ativo
            )
            or exists (
              select 1
              from public.execucoes execucao
              where execucao.checklist_template_id = checklist.id
                and execucao.usuario_id = atual.id
            )
          )
        )
      )
      );
$$;

create or replace function public.definir_unidade_usuario(
  p_usuario_id uuid,
  p_unidade_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.sou_administrador() then
    raise exception 'not_authorized';
  end if;

  if not exists (
    select 1
    from public.usuarios usuario
    join public.unidades unidade on unidade.id = p_unidade_id
    where usuario.id = p_usuario_id
      and usuario.empresa_id = public.empresa_atual()
      and usuario.perfil <> 'administrador'
      and unidade.empresa_id = public.empresa_atual()
  ) then
    raise exception 'invalid_user_or_unit';
  end if;

  update public.usuarios set unidade_id = p_unidade_id where id = p_usuario_id;

  delete from public.usuario_setores vinculo
  using public.setores setor
  where vinculo.usuario_id = p_usuario_id
    and setor.id = vinculo.setor_id
    and setor.unidade_id <> p_unidade_id;
end;
$$;

revoke all on function public.definir_unidade_usuario(uuid, uuid) from public;
grant execute on function public.definir_unidade_usuario(uuid, uuid) to authenticated;

create or replace function public.atualizar_usuario(
  p_usuario_id uuid,
  p_nome text,
  p_perfil public.perfil_usuario,
  p_unidade_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitante public.usuarios;
  alvo public.usuarios;
  unidade_destino uuid;
begin
  if auth.uid() is null or length(trim(coalesce(p_nome, ''))) = 0 or length(trim(p_nome)) > 120 then
    raise exception 'invalid_user_data';
  end if;

  select * into solicitante
  from public.usuarios
  where id = auth.uid();

  select * into alvo
  from public.usuarios
  where id = p_usuario_id
    and empresa_id = solicitante.empresa_id
  for update;

  if solicitante.id is null or alvo.id is null then
    raise exception 'user_not_found';
  end if;

  if solicitante.perfil = 'administrador' then
    if alvo.id = solicitante.id and p_perfil <> 'administrador' then
      raise exception 'cannot_demote_self';
    end if;

    if p_perfil = 'administrador' then
      unidade_destino := null;
    else
      if p_unidade_id is null or not exists (
        select 1 from public.unidades
        where id = p_unidade_id
          and empresa_id = solicitante.empresa_id
      ) then
        raise exception 'invalid_unit';
      end if;
      unidade_destino := p_unidade_id;
    end if;
  elsif solicitante.perfil = 'gestor' then
    if alvo.perfil <> 'operacional'
      or alvo.unidade_id is distinct from solicitante.unidade_id
      or p_perfil <> 'operacional' then
      raise exception 'not_authorized';
    end if;
    unidade_destino := solicitante.unidade_id;
  else
    raise exception 'not_authorized';
  end if;

  update public.usuarios
  set nome = trim(p_nome),
      perfil = p_perfil,
      unidade_id = unidade_destino
  where id = p_usuario_id;

  if p_perfil = 'administrador' or unidade_destino is distinct from alvo.unidade_id then
    delete from public.usuario_setores where usuario_id = p_usuario_id;
  end if;
end;
$$;

revoke all on function public.atualizar_usuario(uuid, text, public.perfil_usuario, uuid) from public;
grant execute on function public.atualizar_usuario(uuid, text, public.perfil_usuario, uuid) to authenticated;

create or replace function public.definir_setores_usuario(
  p_usuario_id uuid,
  p_setor_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  unidade_usuario uuid;
begin
  select unidade_id into unidade_usuario
  from public.usuarios
  where id = p_usuario_id
    and empresa_id = public.empresa_atual()
    and perfil = 'operacional';

  if auth.uid() is null
    or unidade_usuario is null
    or not public.pode_gerenciar_unidade(unidade_usuario) then
    raise exception 'not_authorized';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_setor_ids, '{}'::uuid[])) as requested(id)
    where not exists (
      select 1 from public.setores
      where id = requested.id
        and unidade_id = unidade_usuario
        and ativo
    )
  ) then
    raise exception 'invalid_sector';
  end if;

  delete from public.usuario_setores where usuario_id = p_usuario_id;

  insert into public.usuario_setores (usuario_id, setor_id)
  select p_usuario_id, requested.id
  from (
    select distinct unnest(coalesce(p_setor_ids, '{}'::uuid[])) as id
  ) requested;
end;
$$;

revoke all on function public.definir_setores_usuario(uuid, uuid[]) from public;
grant execute on function public.definir_setores_usuario(uuid, uuid[]) to authenticated;

create or replace function public.proteger_identidade_execucao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.usuario_id is distinct from old.usuario_id
    or new.checklist_template_id is distinct from old.checklist_template_id
    or new.data is distinct from old.data
    or new.inicio is distinct from old.inicio then
    raise exception 'execution_identity_is_immutable';
  end if;
  return new;
end;
$$;

create trigger proteger_identidade_execucao
  before update on public.execucoes
  for each row execute function public.proteger_identidade_execucao();

create policy "administrador edita empresa"
  on public.empresas for update
  using (id = public.empresa_atual() and public.sou_administrador())
  with check (id = public.empresa_atual() and public.sou_administrador());

create policy "ve unidades permitidas"
  on public.unidades for select
  using (public.pode_acessar_unidade(id));

create policy "administrador cria unidades"
  on public.unidades for insert
  with check (empresa_id = public.empresa_atual() and public.sou_administrador());

create policy "administrador edita unidades"
  on public.unidades for update
  using (empresa_id = public.empresa_atual() and public.sou_administrador())
  with check (empresa_id = public.empresa_atual() and public.sou_administrador());

create policy "ve setores da unidade permitida"
  on public.setores for select
  using (
    public.pode_acessar_unidade(unidade_id)
    and (
      public.sou_gestor()
      or id in (
        select setor_id from public.usuario_setores
        where usuario_id = auth.uid()
      )
    )
  );

create policy "gestor ou administrador gerencia setores da unidade"
  on public.setores for all
  using (public.pode_gerenciar_unidade(unidade_id))
  with check (public.pode_gerenciar_unidade(unidade_id));

create policy "ve usuarios da empresa ou unidade"
  on public.usuarios for select
  using (
    id = auth.uid()
    or (
      empresa_id = public.empresa_atual()
      and (
        public.sou_administrador()
        or (perfil <> 'administrador' and unidade_id = public.unidade_atual())
      )
    )
  );

create policy "usuario ve vinculos proprios e gestor vinculos da unidade"
  on public.usuario_setores for select
  using (
    usuario_id = auth.uid()
    or exists (
      select 1
      from public.usuarios usuario
      where usuario.id = usuario_id
        and usuario.empresa_id = public.empresa_atual()
        and (
          public.sou_administrador()
          or (
            usuario.unidade_id = public.unidade_atual()
            and public.pode_gerenciar_unidade(usuario.unidade_id)
          )
        )
    )
  );

create policy "ve checklists da unidade ou setores permitidos"
  on public.checklist_templates for select
  using (public.pode_ver_checklist(id));

create policy "gestor ou administrador cria checklists da unidade"
  on public.checklist_templates for insert
  with check (
    public.pode_gerenciar_unidade(unidade_id)
    and setor_id in (
      select id from public.setores where unidade_id = checklist_templates.unidade_id
    )
    and (
      responsavel_id is null
      or responsavel_id in (
        select id from public.usuarios
        where empresa_id = public.empresa_atual()
          and (
            perfil = 'administrador'
            or unidade_id = checklist_templates.unidade_id
          )
      )
    )
  );

create policy "gestor ou administrador edita checklists da unidade"
  on public.checklist_templates for update
  using (public.pode_gerenciar_unidade(unidade_id))
  with check (
    public.pode_gerenciar_unidade(unidade_id)
    and setor_id in (
      select id from public.setores where unidade_id = checklist_templates.unidade_id
    )
    and (
      responsavel_id is null
      or responsavel_id in (
        select id from public.usuarios
        where empresa_id = public.empresa_atual()
          and (
            perfil = 'administrador'
            or unidade_id = checklist_templates.unidade_id
          )
      )
    )
  );

create policy "gestor ou administrador remove checklists da unidade"
  on public.checklist_templates for delete
  using (public.pode_gerenciar_unidade(unidade_id));

create policy "le tarefas do checklist permitido"
  on public.tarefa_templates for select
  using (
    checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_ver_checklist(id)
    )
  );

create policy "gestor ou administrador gerencia tarefas modelo da unidade"
  on public.tarefa_templates for all
  using (
    checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_gerenciar_unidade(unidade_id)
    )
  )
  with check (
    checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_gerenciar_unidade(unidade_id)
    )
  );

create policy "ve execucoes da unidade ou propria"
  on public.execucoes for select
  using (
    checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_ver_checklist(id)
        or public.pode_gerenciar_unidade(unidade_id)
    )
  );

create policy "membro ou gestor inicia checklist permitido"
  on public.execucoes for insert
  with check (
    usuario_id = auth.uid()
    and (
      public.pode_ver_checklist(checklist_template_id)
      or checklist_template_id in (
        select id from public.checklist_templates
        where public.pode_gerenciar_unidade(unidade_id)
      )
    )
    and checklist_template_id in (
      select id from public.checklist_templates
      where ativo and public.pode_ver_checklist(id)
    )
  );

create policy "iniciador atualiza propria execucao"
  on public.execucoes for update
  using (
    usuario_id = auth.uid()
    and status <> 'concluido'
    and public.pode_ver_checklist(checklist_template_id)
  )
  with check (
    usuario_id = auth.uid()
    and public.pode_ver_checklist(checklist_template_id)
  );

create policy "gestor ou administrador atualiza execucao da unidade"
  on public.execucoes for update
  using (
    status <> 'concluido'
    and checklist_template_id in (
      select checklist.id from public.checklist_templates checklist
      where public.pode_gerenciar_unidade(checklist.unidade_id)
    )
  )
  with check (
    checklist_template_id in (
      select checklist.id from public.checklist_templates checklist
      where public.pode_gerenciar_unidade(checklist.unidade_id)
    )
  );

create policy "iniciador ou gestor ve tarefas da execucao"
  on public.tarefa_execucoes for select
  using (
    execucao_id in (
      select execucao.id
      from public.execucoes execucao
      join public.checklist_templates checklist
        on checklist.id = execucao.checklist_template_id
      where execucao.usuario_id = auth.uid()
        or public.pode_gerenciar_unidade(checklist.unidade_id)
        or (
          execucao.status = 'concluido'
          and public.pode_ver_checklist(checklist.id)
        )
    )
  );

create policy "iniciador ou gestor gerencia tarefas da execucao"
  on public.tarefa_execucoes for all
  using (
    execucao_id in (
      select execucao.id
      from public.execucoes execucao
      join public.checklist_templates checklist
        on checklist.id = execucao.checklist_template_id
      where execucao.status <> 'concluido'
        and (
          execucao.usuario_id = auth.uid()
          or public.pode_gerenciar_unidade(checklist.unidade_id)
        )
    )
  )
  with check (
    execucao_id in (
      select execucao.id
      from public.execucoes execucao
      join public.checklist_templates checklist
        on checklist.id = execucao.checklist_template_id
      where execucao.status <> 'concluido'
        and (
          execucao.usuario_id = auth.uid()
          or public.pode_gerenciar_unidade(checklist.unidade_id)
        )
    )
  );
