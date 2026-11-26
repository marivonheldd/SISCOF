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
 * Retorna "ok" (conta criada e sessão aberta), "nao" (não se aplica) ou uma mensagem de erro.
 */
async function primeiroAcesso(login: string, senha: string): Promise<"ok" | "nao" | { erro: string }> {
  const loginAdm = (process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
  const senhaInicial = process.env.APP_PASSWORD?.trim();

  const { count, error: e1 } = await db()
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("perfil", "admin");
  if (e1) return { erro: "Não foi possível acessar o banco de dados. Veja os avisos acima do formulário de login." };
  if ((count ?? 0) > 0) return "nao";

  // Ainda não há ADM: orienta em vez de dizer só "senha incorreta"
  if (!senhaInicial) return { erro: "Primeiro acesso: a variável APP_PASSWORD não está cadastrada na Vercel." };
  if (login !== loginAdm)
    return { erro: `Primeiro acesso: ainda não existe nenhuma conta. Entre com o usuário "${loginAdm}" para criar a conta ADM.` };
  if (!(await textoConfere(senha.trim(), senhaInicial)))
    return { erro: "Primeiro acesso: a senha não confere com a APP_PASSWORD cadastrada na Vercel (atenção a maiúsculas e minúsculas)." };

  const { data, error } = await db()
    .from("usuarios")
    .insert({
      nome: "Administrador",
      login: loginAdm,
      senha_hash: await gerarHash(senhaInicial),
      perfil: "admin",
      trocar_senha: false,
      ultimo_acesso: new Date().toISOString(),
    })
    .select("id, sessao_versao")
    .single();
  if (error || !data) return { erro: `Não foi possível criar a conta ADM: ${error?.message ?? "erro desconhecido"}` };
  await abrirSessao(data.id, data.sessao_versao);
  return "ok";
}

export async function entrar(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  let r: EstadoLogin | "ok";
  try {
    r = await tentarEntrar(fd);
  } catch (e) {
    console.error("[login]", e);
    const msg = e instanceof Error ? e.message : "";
    if (/SUPABASE|SESSION_SECRET/.test(msg)) return { erro: `Configuração do servidor: ${msg}` };
    return { erro: "Não foi possível conectar ao banco de dados. Verifique a configuração do Supabase." };
  }
  if (r === "ok") redirect("/");
  return r;
}

async function tentarEntrar(fd: FormData): Promise<EstadoLogin | "ok"> {
  const login = String(fd.get("login") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  if (!login || !senha) return { erro: "Informe usuário e senha." };

  const pa = await primeiroAcesso(login, senha);
  if (pa === "ok") return "ok";
  if (pa !== "nao") return pa;

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
  return "ok";
}

export async function sair() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
