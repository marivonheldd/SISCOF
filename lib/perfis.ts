export const PERFIS = {
  admin: "Administrador (ADM)",
  operador: "Operador",
  consulta: "Consulta",
} as const;
export type Perfil = keyof typeof PERFIS;

export const DESCRICAO_PERFIL: Record<Perfil, string> = {
  admin: "Acesso total: cadastra pessoas, produtos e categorias, registra entradas e saídas.",
  operador: "Registra entradas e saídas e consulta todo o sistema.",
  consulta: "Apenas visualiza painel, estoque e movimentações.",
};

export const pode = {
  gerenciarUsuarios: (p: Perfil) => p === "admin",
  gerenciarProdutos: (p: Perfil) => p === "admin",
  movimentar: (p: Perfil) => p === "admin" || p === "operador",
};

export function ehPerfil(v: string): v is Perfil {
  return v in PERFIS;
}
