create policy "iniciador libera propria execucao"
  on public.execucoes for update
  using (
    usuario_id = auth.uid()
    and status = 'em_andamento'
    and checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_ver_checklist(id)
    )
  )
  with check (
    (
      usuario_id = auth.uid()
      and status = 'em_andamento'
      and checklist_template_id in (
        select id from public.checklist_templates
        where public.pode_ver_checklist(id)
      )
    )
    or (
      usuario_id is null
      and inicio is null
      and status = 'nao_iniciado'
      and checklist_template_id in (
        select id from public.checklist_templates
        where public.pode_ver_checklist(id)
      )
    )
  );

create policy "membro assume execucao liberada"
  on public.execucoes for update
  using (
    usuario_id is null
    and status = 'nao_iniciado'
    and checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_ver_checklist(id)
    )
  )
  with check (
    usuario_id = auth.uid()
    and status = 'em_andamento'
    and checklist_template_id in (
      select id from public.checklist_templates
      where public.pode_ver_checklist(id)
    )
  );

create policy "membro ve tarefas de execucao liberada"
  on public.tarefa_execucoes for select
  using (
    execucao_id in (
      select execucao.id
      from public.execucoes execucao
      join public.checklist_templates checklist
        on checklist.id = execucao.checklist_template_id
      where execucao.usuario_id is null
        and execucao.status = 'nao_iniciado'
        and public.pode_ver_checklist(checklist.id)
    )
  );
