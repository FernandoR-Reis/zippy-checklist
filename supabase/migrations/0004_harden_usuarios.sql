-- Impede que clientes associem a própria conta a outra empresa ou alterem perfil.
drop policy if exists "usuario insere seu proprio registro" on public.usuarios;
drop policy if exists "usuario edita seu proprio registro" on public.usuarios;

-- O primeiro gestor é criado uma única vez, de forma atômica, após o sign-up.
-- Convites continuam criando perfis via service_role apenas no servidor.
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
  values (auth.uid(), nova_empresa.id, trim(nome_usuario), email_usuario, 'gestor')
  returning * into novo_usuario;

  return novo_usuario;
end;
$$;

revoke all on function public.criar_empresa_e_usuario(text, text) from public;
grant execute on function public.criar_empresa_e_usuario(text, text) to authenticated;

-- Um checklist só pode ser atribuído a alguém da mesma empresa da unidade.
drop policy if exists "gestor cria checklists da propria empresa" on public.checklist_templates;
drop policy if exists "gestor edita checklists da propria empresa" on public.checklist_templates;

create policy "gestor cria checklists da propria empresa" on public.checklist_templates
  for insert with check (
    public.sou_gestor()
    and unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
    and setor_id in (select id from public.setores where unidade_id = checklist_templates.unidade_id)
    and responsavel_id in (select id from public.usuarios where empresa_id = public.empresa_atual())
  );

create policy "gestor edita checklists da propria empresa" on public.checklist_templates
  for update using (
    public.sou_gestor()
    and unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
  ) with check (
    public.sou_gestor()
    and unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
    and setor_id in (select id from public.setores where unidade_id = checklist_templates.unidade_id)
    and responsavel_id in (select id from public.usuarios where empresa_id = public.empresa_atual())
  );