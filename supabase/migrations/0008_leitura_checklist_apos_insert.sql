alter policy "ve checklists da unidade ou setores permitidos"
  on public.checklist_templates
  using (
    public.pode_gerenciar_unidade(unidade_id)
    or public.pode_ver_checklist(id)
  );
