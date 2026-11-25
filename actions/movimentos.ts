"use server";

import { revalidatePath } from "next/cache";
import { assinatura, exigirSessao } from "@/lib/auth";
import { db, traduzErro } from "@/lib/db";
import { dataValida, hoje, parseQtd, REFEICOES } from "@/lib/format";
import type { Resultado } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limpa = (s: unknown, max = 200) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, max);

// ---------------------------------------------------------------- Entradas

export type ItemEntrada = {
  produto_id: string;
  quantidade: string;
  lote: string;
  data_fabricacao: string;
  data_validade: string;
};

export type DadosEntrada = {
  data_recebimento: string;
  numero_gf: string;
  responsavel: string;
  observacoes: string;
  itens: ItemEntrada[];
};

export async function registrarEntrada(d: DadosEntrada): Promise<Resultado> {
  const sessao = await exigirSessao("admin", "operador");

  if (!dataValida(d?.data_recebimento)) return { ok: false, msg: "Informe uma data de recebimento válida." };
  const gf = limpa(d.numero_gf, 40);
  if (!gf) return { ok: false, msg: "Informe o número da Guia de Fornecimento (GF)." };
  const responsavel = limpa(d.responsavel, 80);
  if (responsavel.length < 2) return { ok: false, msg: "Informe o responsável pelo recebimento." };
  if (!Array.isArray(d.itens) || d.itens.length === 0) return { ok: false, msg: "Inclua pelo menos um produto." };
  if (d.itens.length > 100) return { ok: false, msg: "Máximo de 100 itens por registro." };

  const itens = [];
  for (const [i, it] of d.itens.entries()) {
    const n = i + 1;
    if (!UUID.test(it.produto_id)) return { ok: false, msg: `Item ${n}: selecione o produto.` };
    const qtd = parseQtd(it.quantidade);
    if (!(qtd > 0)) return { ok: false, msg: `Item ${n}: informe uma quantidade maior que zero.` };
    const lote = limpa(it.lote, 40);
    if (!lote) return { ok: false, msg: `Item ${n}: informe o número do lote.` };
    if (!dataValida(it.data_validade)) return { ok: false, msg: `Item ${n}: informe a data de validade.` };
    if (it.data_fabricacao && !dataValida(it.data_fabricacao))
      return { ok: false, msg: `Item ${n}: data de fabricação inválida.` };
    itens.push({
      produto_id: it.produto_id,
      quantidade: qtd,
      lote,
      data_fabricacao: it.data_fabricacao || null,
      data_validade: it.data_validade,
    });
  }

  const { data, error } = await db().rpc("registrar_entradas", {
    p_data: d.data_recebimento,
    p_numero_gf: gf,
    p_responsavel: responsavel,
    p_observacoes: limpa(d.observacoes, 500),
    p_usuario: assinatura(sessao),
    p_itens: itens,
    p_hoje: hoje(),
  });
  if (error) return { ok: false, msg: traduzErro(error) };

  revalidatePath("/", "layout");
  const qt = Number(data ?? itens.length);
  return { ok: true, msg: `${qt} ${qt === 1 ? "item registrado" : "itens registrados"} na GF ${gf}. Estoque atualizado.` };
}

// ---------------------------------------------------------------- Saídas

export type LoteDisponivel = {
  id: string;
  lote: string;
  numero_gf: string;
  data_recebimento: string;
  data_validade: string;
  saldo: number;
  unidade: string;
};

/** Lotes com saldo, em ordem PEPS: primeiro recebido, depois menor validade. */
export async function lotesDisponiveis(produtoId: string): Promise<LoteDisponivel[]> {
  await exigirSessao("admin", "operador");
  if (!UUID.test(produtoId)) return [];
  const { data, error } = await db()
    .from("entradas")
    .select("id, lote, numero_gf, data_recebimento, data_validade, saldo, unidade")
    .eq("produto_id", produtoId)
    .gt("saldo", 0)
    .order("data_recebimento", { ascending: true })
    .order("data_validade", { ascending: true })
    .order("criado_em", { ascending: true });
  if (error) throw new Error(traduzErro(error));
  return (data ?? []).map((l) => ({ ...l, saldo: Number(l.saldo) })) as LoteDisponivel[];
}

export type DadosSaida = {
  entrada_id: string;
  quantidade: string;
  data_saida: string;
  destino: string;
  tipo_refeicao: string;
  responsavel: string;
  observacoes: string;
};

export async function registrarSaida(d: DadosSaida): Promise<Resultado> {
  const sessao = await exigirSessao("admin", "operador");

  if (!UUID.test(d?.entrada_id)) return { ok: false, msg: "Selecione o lote." };
  const qtd = parseQtd(d.quantidade);
  if (!(qtd > 0)) return { ok: false, msg: "Informe uma quantidade maior que zero." };
  if (!dataValida(d.data_saida)) return { ok: false, msg: "Informe uma data de saída válida." };
  const destino = limpa(d.destino, 120);
  if (!destino) return { ok: false, msg: "Informe o destino ou finalidade." };
  if (!(d.tipo_refeicao in REFEICOES)) return { ok: false, msg: "Selecione o tipo de refeição." };
  const responsavel = limpa(d.responsavel, 80);
  if (responsavel.length < 2) return { ok: false, msg: "Informe o responsável pela retirada." };

  const { error } = await db().rpc("registrar_saida", {
    p_entrada_id: d.entrada_id,
    p_quantidade: qtd,
    p_data: d.data_saida,
    p_destino: destino,
    p_tipo_refeicao: d.tipo_refeicao,
    p_responsavel: responsavel,
    p_observacoes: limpa(d.observacoes, 500),
    p_usuario: assinatura(sessao),
    p_hoje: hoje(),
  });
  if (error) return { ok: false, msg: traduzErro(error) };

  revalidatePath("/", "layout");
  return { ok: true, msg: "Saída registrada. Estoque atualizado." };
}
