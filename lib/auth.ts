import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken, SESSION_COOKIE } from "./session";
import { db } from "./db";
import type { Perfil } from "./perfis";

export type Sessao = { id: string; nome: string; login: string; perfil: Perfil; trocar_senha: boolean };

/** Lê o cookie e confere no banco se a conta continua ativa (1 consulta por requisição). */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  const t = await lerToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!t) return null;
  const { data } = await db()
    .from("usuarios")
    .select("id, nome, login, perfil, ativo, sessao_versao, trocar_senha")
    .eq("id", t.uid)
    .maybeSingle();
  if (!data || !data.ativo || data.sessao_versao !== t.v) return null;
  return { id: data.id, nome: data.nome, login: data.login, perfil: data.perfil, trocar_senha: data.trocar_senha };
});

/** Use em toda página e ação protegida. Com perfis, restringe o acesso. */
export async function exigirSessao(...perfis: Perfil[]): Promise<Sessao> {
  const s = await getSessao();
  if (!s) redirect("/login");
  if (perfis.length && !perfis.includes(s.perfil)) redirect("/?sem_permissao=1");
  return s;
}

/** Texto gravado no campo "usuário" das movimentações. */
export const assinatura = (s: Sessao) => `${s.nome} (${s.login})`;
