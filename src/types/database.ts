// Tipos mínimos hand-written, cobrindo o Sprint 1 (empresas, unidades,
// setores, usuarios). A partir do Sprint 2, gere este arquivo com:
//   npx supabase gen types typescript --project-id SEU_PROJETO > src/types/database.ts

export type PerfilUsuario = "gestor" | "operacional";
export type Recorrencia = "diaria" | "semanal" | "mensal";
export type TipoTarefa = "checkbox" | "sim_nao" | "numero" | "texto" | "foto";

export interface Empresa {
  id: string;
  nome: string;
  created_at: string;
}

export interface Unidade {
  id: string;
  empresa_id: string;
  nome: string;
  created_at: string;
}

export interface Setor {
  id: string;
  unidade_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  unidade_id: string;
  setor_id: string;
  responsavel_id: string | null;
  nome: string;
  descricao: string | null;
  recorrencia: Recorrencia;
  horario: string | null;
  ativo: boolean;
  created_at: string;
}

export interface TarefaTemplate {
  id: string;
  checklist_template_id: string;
  titulo: string;
  tipo: TipoTarefa;
  obrigatoria: boolean;
  ordem: number;
}

export interface Usuario {
  id: string;
  empresa_id: string | null;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      empresas: { Row: Empresa; Insert: Partial<Empresa>; Update: Partial<Empresa> };
      unidades: { Row: Unidade; Insert: Partial<Unidade>; Update: Partial<Unidade> };
      setores: { Row: Setor; Insert: Partial<Setor>; Update: Partial<Setor> };
      usuarios: { Row: Usuario; Insert: Partial<Usuario>; Update: Partial<Usuario> };
      checklist_templates: { Row: ChecklistTemplate; Insert: Partial<ChecklistTemplate>; Update: Partial<ChecklistTemplate> };
      tarefa_templates: { Row: TarefaTemplate; Insert: Partial<TarefaTemplate>; Update: Partial<TarefaTemplate> };
    };
  };
}
