alter table public.empresas
  add column if not exists fuso_horario text not null default 'America/Sao_Paulo',
  add column if not exists inicio_operacao time not null default '00:00',
  add column if not exists fim_operacao time not null default '23:59';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'empresas_horario_operacao_valido'
      and conrelid = 'public.empresas'::regclass
  ) then
    alter table public.empresas
      add constraint empresas_horario_operacao_valido
      check (inicio_operacao <> fim_operacao);
  end if;
end;
$$;
