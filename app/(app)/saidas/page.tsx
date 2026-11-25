import type { Metadata } from "next";
import { ArrowUpFromLine } from "lucide-react";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { pode } from "@/lib/perfis";
import { fmtData, fmtDataHora, fmtQtd, hoje, REFEICOES, type TipoRefeicao } from "@/lib/format";
import { Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";
import SaidaForm from "./SaidaForm";

export const metadata: Metadata = { title: "Saídas" };

type Linha = {
  id: string;
  data_saida: string;
  criado_em: string;
  quantidade: number;
  unidade: string;
  destino: string;
  tipo_refeicao: TipoRefeicao;
  responsavel: string;
  usuario: string;
  observacoes: string | null;
  produtos: { codigo: string; nome: string } | null;
  entradas: { lote: string; numero_gf: string } | null;
};

export default async function SaidasPage() {
  const d = db();
  const sessao = await exigirSessao();

  const [{ data: produtos }, { data: saidas }] = await Promise.all([
    d.from("v_estoque_produto").select("id, codigo, nome, unidade, saldo").gt("saldo", 0).order("nome"),
    d
      .from("saidas")
      .select(
        "id, data_saida, criado_em, quantidade, unidade, destino, tipo_refeicao, responsavel, usuario, observacoes, produtos(codigo, nome), entradas(lote, numero_gf)",
      )
      .order("criado_em", { ascending: false })
      .limit(100),
  ]);
  const lista = (saidas ?? []) as unknown as Linha[];

  return (
    <>
      <PageHeader
        titulo="Registro de saída"
        descricao="Retirada de produtos da câmara frigorífica. Os lotes são sugeridos pelo método PEPS (primeiro que entra, primeiro que sai)."
      />

      {pode.movimentar(sessao.perfil) && (
      <Card titulo="Nova saída" icone={ArrowUpFromLine} className="mb-6">
          <SaidaForm
            produtos={(produtos ?? []).map((p) => ({ ...p, saldo: Number(p.saldo) }))}
            hoje={hoje()}
            usuario={sessao.nome}
          />
        </Card>
      )}

      <Card titulo="Histórico de saídas (últimas 100)" semPadding>
        {lista.length === 0 ? (
          <Vazio>Nenhuma saída registrada ainda.</Vazio>
        ) : (
          <TabelaWrap>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Lote / GF</th>
                  <th className="text-right">Quantidade</th>
                  <th>Destino</th>
                  <th>Refeição</th>
                  <th>Responsável</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtData(s.data_saida)}</td>
                    <td>
                      <span className="font-medium">{s.produtos?.nome}</span>{" "}
                      <span className="font-mono text-xs text-slate-400">{s.produtos?.codigo}</span>
                    </td>
                    <td className="font-mono text-xs">
                      {s.entradas?.lote}
                      <br />
                      <span className="text-slate-400">GF {s.entradas?.numero_gf}</span>
                    </td>
                    <td className="text-right tabular-nums">{fmtQtd(s.quantidade, s.unidade)}</td>
                    <td>
                      {s.destino}
                      {s.observacoes && <p className="text-xs text-slate-500">{s.observacoes}</p>}
                    </td>
                    <td>{REFEICOES[s.tipo_refeicao]}</td>
                    <td>{s.responsavel}</td>
                    <td className="text-xs text-slate-500">
                      {s.usuario}
                      <br />
                      {fmtDataHora(s.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelaWrap>
        )}
      </Card>
    </>
  );
}
