"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarToken, SESSION_COOKIE, SESSION_HORAS, textoConfere } from "@/lib/session";
import { conferirHash, gerarHash } from "@/lib/senha";
import { db } from "@/lib/db";

export type EstadoLogin = { erro?: string } | null;

const MAX_FALHAS = 5;
const MINUTOS_BLOQUEIO = 15;
const espera = () => new Promise((r) => setTimeout(r, 700));

async function abrirSessao(uid: string, versao: number) {
  const token = await criarToken(uid, versao);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HORAS * 3600,
  });
}

/**
 * Primeiro acesso: enquanto não existir nenhum administrador, o login ADMIN_LOGIN (padrão "admin")
 * com a senha APP_PASSWORD cria a conta ADM. Depois disso, a APP_PASSWORD não é mais usada.
 */
async function primeiroAcesso(login: string, senha: string): Promise<boolean> {
  const loginAdm = (process.env.ADMIN_LOGIN || "admin").toLowerCase();
  const senhaInicial = process.env.APP_PASSWORD;
  if (login !== loginAdm || !senhaInicial) return false;

  const { count } = await db().from("usuarios").select("id", { count: "exact", head: true }).eq("perfil", "admin");
  if ((count ?? 0) > 0) return false;
  if (!(await textoConfere(senha, senhaInicial))) return false;

  const { data, error } = await db()
    .from("usuarios")
    .insert({
      nome: "Administrador",
      login: loginAdm,
      senha_hash: await gerarHash(senha),
      perfil: "admin",
      trocar_senha: false,
      ultimo_acesso: new Date().toISOString(),
    })
    .select("id, sessao_versao")
    .single();
  if (error || !data) return false;
  await abrirSessao(data.id, data.sessao_versao);
  return true;
}

export async function entrar(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const login = String(fd.get("login") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  if (!login || !senha) return { erro: "Informe usuário e senha." };

  if (await primeiroAcesso(login, senha)) redirect("/");

  const { data: u } = await db()
    .from("usuarios")
    .select("id, senha_hash, ativo, sessao_versao, falhas_login, bloqueado_ate")
    .eq("login", login)
    .maybeSingle();

  if (!u || !u.ativo) {
    await espera();
    return { erro: "Usuário ou senha incorretos." };
  }
  if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) {
    const min = Math.ceil((new Date(u.bloqueado_ate).getTime() - Date.now()) / 60000);
    return { erro: `Conta bloqueada por excesso de tentativas. Tente novamente em ${min} min ou peça ao ADM.` };
  }

  if (!(await conferirHash(senha, u.senha_hash))) {
    const falhas = u.falhas_login + 1;
    const bloquear = falhas >= MAX_FALHAS;
    await db()
      .from("usuarios")
      .update({
        falhas_login: bloquear ? 0 : falhas,
        bloqueado_ate: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEIO * 60000).toISOString() : u.bloqueado_ate,
      })
      .eq("id", u.id);
    await espera();
    return {
      erro: bloquear
        ? `Muitas tentativas erradas. Conta bloqueada por ${MINUTOS_BLOQUEIO} minutos.`
        : "Usuário ou senha incorretos.",
    };
  }

  await db()
    .from("usuarios")
    .update({ falhas_login: 0, bloqueado_ate: null, ultimo_acesso: new Date().toISOString() })
    .eq("id", u.id);
  await abrirSessao(u.id, u.sessao_versao);
  redirect("/");
}

export async function sair() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
