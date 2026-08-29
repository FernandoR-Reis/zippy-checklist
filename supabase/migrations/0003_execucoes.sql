alter table public.tarefa_execucoes
  add column if not exists titulo text,
  add column if not exists tipo public.tipo_tarefa,
  add column if not exists obrigatoria boolean,
  add column if not exists ordem int;

alter table public.tarefa_execucoes alter column tarefa_template_id drop not null;
alter table public.tarefa_execucoes drop constraint if exists tarefa_execucoes_tarefa_template_id_fkey;
alter table public.tarefa_execucoes add constraint tarefa_execucoes_tarefa_template_id_fkey
  foreign key (tarefa_template_id) references public.tarefa_templates(id) on delete set null;

create unique index if not exists execucoes_checklist_data_unique
  on public.execucoes (checklist_template_id, data);

create policy "responsavel cria sua execucao" on public.execucoes
  for insert with check (
    usuario_id = auth.uid()
    and checklist_template_id in (
      select id from public.checklist_templates
      where responsavel_id = auth.uid()
        and unidade_id in (select id from public.unidades where empresa_id = public.empresa_atual())
    )
  );

create policy "responsavel atualiza sua execucao" on public.execucoes
  for update using (usuario_id = auth.uid() and status <> 'concluido')
  with check (usuario_id = auth.uid());

create policy "responsavel gerencia tarefa_execucoes da propria execucao" on public.tarefa_execucoes
  for all using (execucao_id in (select id from public.execucoes where usuario_id = auth.uid()))
  with check (execucao_id in (select id from public.execucoes where usuario_id = auth.uid() and status <> 'concluido'));