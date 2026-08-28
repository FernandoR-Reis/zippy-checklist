// Tipos mínimos hand-written, cobrindo o Sprint 1 (empresas, unidades,
// setores, usuarios). A partir do Sprint 2, gere este arquivo com:
//   npx supabase gen types typescript --project-id SEU_PROJETO > src/types/database.ts

export type PerfilUsuario = "gestor" | "operacional";

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
  created_at: string;
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
    };
  };
}
