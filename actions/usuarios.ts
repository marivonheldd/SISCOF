"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { exigirSessao } from "@/lib/auth";
import { db, traduzErro } from "@/lib/db";
import { conferirHash, gerarHash, validarSenha } from "@/lib/senha";
import { criarToken, SESSION_COOKIE, SESSION_HORAS } from "@/lib/session";
import { ehPerfil } from "@/lib/perfis";
import type { Resultado } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOGIN = /^[a-z0-9._-]{3,30}$/;
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim().replace(/\s+/g, " ");

async function proximaVersao(id: string): Promise<number> {
  const { data } = await db().from("usuarios").select("sessao_versao").eq("id", id).single();
  return (data?.sessao_versao ?? 1) + 1;
}

export async function criarUsuario(_: Resultado, fd: FormData): Promise<Resultado> {
  await exigirSessao("admin");
  const nome = txt(fd, "nome");
  const login = txt(fd, "login").toLowerCase();
  const perfil = txt(fd, "perfil");
  const senha = String(fd.get("senha") ?? "");

  if (nome.length < 2 || nome.length > 80) return { ok: false, msg: "Informe o nome completo (2 a 80 caracteres)." };
  if (!LOGIN.test(login))
    return { ok: false, msg: "Usuário: 3 a 30 caracteres, só letras minúsculas, números, ponto, hífen ou _." };
  if (!ehPerfil(perfil)) return { ok: false, msg: "Selecione o perfil." };
  const erroSenha = validarSenha(senha);
  if (erroSenha) return { ok: false, msg: erroSenha };

  const { error } = await db()
    .from("usuarios")
    .insert({ nome, login, perfil, senha_hash: await gerarHash(senha), trocar_senha: true });
  if (error) {
    if (error.code === "23505") return { ok: false, msg: `O usuário "${login}" já existe.` };
    return { ok: false, msg: traduzErro(error) };
  }
  revalidatePath("/usuarios");
  return { ok: true, msg: `${nome} cadastrado(a). Informe o usuário "${login}" e a senha provisória; ela será trocada no 1º acesso.` };
}

export async function atualizarUsuario(_: Resultado, fd: FormData): Promise<Resultado> {
  const eu = await exigirSessao("admin");
  const id = txt(fd, "id");
  const nome = txt(fd, "nome");
  const perfil = txt(fd, "perfil");
  const ativo = fd.get("ativo") === "on";
  if (!UUID.test(id)) return { ok: false, msg: "Usuário inválido." };
  if (nome.length < 2 || nome.length > 80) return { ok: false, msg: "Informe o nome (2 a 80 caracteres)." };
  if (!ehPerfil(perfil)) return { ok: false, msg: "Selecione o perfil." };
  if (id === eu.id && (!ativo || perfil !== "admin"))
    return { ok: false, msg: "Você não pode desativar nem tirar o perfil ADM da sua própria conta." };

  const dados: Record<string, unknown> = { nome, perfil, ativo };
  if (!ativo) dados.sessao_versao = await proximaVersao(id); // derruba a sessão aberta
  const { error } = await db().from("usuarios").update(dados).eq("id", id);
  if (error) return { ok: false, msg: traduzErro(error) };
  revalidatePath("/usuarios");
  return { ok: true, msg: "Usuário atualizado." };
}

export async function redefinirSenha(_: Resultado, fd: FormData): Promise<Resultado> {
  await exigirSessao("admin");
  const id = txt(fd, "id");
  const senha = String(fd.get("senha") ?? "");
  if (!UUID.test(id)) return { ok: false, msg: "Usuário inválido." };
  const erroSenha = validarSenha(senha);
  if (erroSenha) return { ok: false, msg: erroSenha };

  const { error } = await db()
    .from("usuarios")
    .update({
      senha_hash: await gerarHash(senha),
      trocar_senha: true,
      falhas_login: 0,
      bloqueado_ate: null,
      sessao_versao: await proximaVersao(id),
    })
    .eq("id", id);
  if (error) return { ok: false, msg: traduzErro(error) };
  revalidatePath("/usuarios");
  return { ok: true, msg: "Senha provisória definida e conta desbloqueada. A pessoa troca a senha no próximo acesso." };
}

export async function trocarMinhaSenha(_: Resultado, fd: FormData): Promise<Resultado> {
  const eu = await exigirSessao();
  const atual = String(fd.get("atual") ?? "");
  const nova = String(fd.get("nova") ?? "");
  const confirma = String(fd.get("confirma") ?? "");

  const { data: u } = await db().from("usuarios").select("senha_hash").eq("id", eu.id).single();
  if (!u || !(await conferirHash(atual, u.senha_hash))) return { ok: false, msg: "A senha atual está incorreta." };
  const erroSenha = validarSenha(nova);
  if (erroSenha) return { ok: false, msg: erroSenha };
  if (nova !== confirma) return { ok: false, msg: "A confirmação não confere com a nova senha." };
  if (nova === atual) return { ok: false, msg: "A nova senha deve ser diferente da atual." };

  const versao = await proximaVersao(eu.id);
  const { error } = await db()
    .from("usuarios")
    .update({ senha_hash: await gerarHash(nova), trocar_senha: false, sessao_versao: versao })
    .eq("id", eu.id);
  if (error) return { ok: false, msg: traduzErro(error) };

  // Sessões em outros aparelhos caem; esta continua aberta.
  (await cookies()).set(SESSION_COOKIE, await criarToken(eu.id, versao), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HORAS * 3600,
  });
  revalidatePath("/", "layout");
  return { ok: true, msg: "Senha alterada com sucesso." };
}
