"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { db, traduzErro } from "@/lib/db";
import { ehUnidade } from "@/lib/format";
import type { Resultado } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim().replace(/\s+/g, " ");
}

export async function salvarProduto(_: Resultado, fd: FormData): Promise<Resultado> {
  await exigirSessao("admin");

  const id = texto(fd, "id");
  const codigo = texto(fd, "codigo").toUpperCase();
  const nome = texto(fd, "nome");
  const categoria_id = texto(fd, "categoria_id");
  const unidade = texto(fd, "unidade");
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const ativo = fd.get("ativo") === "on";

  if (!codigo || codigo.length > 30) return { ok: false, msg: "Informe o código do produto (até 30 caracteres)." };
  if (nome.length < 2 || nome.length > 120) return { ok: false, msg: "Informe o nome do produto (2 a 120 caracteres)." };
  if (!UUID.test(categoria_id)) return { ok: false, msg: "Selecione a categoria." };
  if (!ehUnidade(unidade)) return { ok: false, msg: "Selecione a unidade de medida." };
  if (descricao && descricao.length > 500) return { ok: false, msg: "A descrição deve ter até 500 caracteres." };
  if (id && !UUID.test(id)) return { ok: false, msg: "Produto inválido." };

  const dados = { codigo, nome, categoria_id, unidade, descricao, ativo };
  const { error } = id
    ? await db().from("produtos").update(dados).eq("id", id)
    : await db().from("produtos").insert(dados);

  if (error) {
    if (error.code === "23505") return { ok: false, msg: `Já existe um produto com o código ${codigo}.` };
    return { ok: false, msg: traduzErro(error) };
  }

  revalidatePath("/", "layout");
  return { ok: true, msg: id ? "Produto atualizado." : `Produto ${nome} cadastrado.` };
}

export async function alternarStatusProduto(id: string, ativo: boolean): Promise<void> {
  await exigirSessao("admin");
  if (!UUID.test(id)) return;
  await db().from("produtos").update({ ativo }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function criarCategoria(_: Resultado, fd: FormData): Promise<Resultado> {
  await exigirSessao("admin");
  const nome = texto(fd, "nome");
  if (nome.length < 2 || nome.length > 60) return { ok: false, msg: "O nome da categoria deve ter de 2 a 60 caracteres." };

  const { error } = await db().from("categorias").insert({ nome });
  if (error) {
    if (error.code === "23505") return { ok: false, msg: `A categoria "${nome}" já existe.` };
    return { ok: false, msg: traduzErro(error) };
  }
  revalidatePath("/", "layout");
  return { ok: true, msg: `Categoria "${nome}" criada.` };
}
