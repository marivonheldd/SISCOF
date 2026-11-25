import type { Metadata } from "next";
import { ArrowDownToLine, Search } from "lucide-react";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { pode } from "@/lib/perfis";
import { fmtData, fmtDataHora, fmtQtd, hoje } from "@/lib/format";
import { BadgeValidade, Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";
import EntradaForm from "./EntradaForm";

export const metadata: Metadata = { title: "Entradas" };

type Linha = {
  id: string;
  data_recebimento: string;
  criado_em: string;
  lote: string;
  quantidade: number;
  saldo: number;
  unidade: string;
  numero_gf: string;
  data_validade: string;
  responsavel: string;
  usuario: string;
  produtos: { codigo: string; nome: string } | null;
};

export default async function EntradasPage({ searchParams }: { searchParams: Promise<{ gf?: string }> }) {
  const sp = await searchParams;
  const gf = (sp.gf ?? "").trim().replace(/[%,()*\\]/g, "");
  const d = db();
  const sessao = await exigirSessao();

  let historico = d
    .from("entradas")
    .select(
      "id, data_recebimento, criado_em, lote, quantidade, saldo, unidade, numero_gf, data_validade, responsavel, usuario, produtos(codigo, nome)",
    )
    .order("criado_em", { ascending: false })
    .limit(100);
  if (gf) historico = historico.ilike("numero_gf", `%${gf}%`);

  const [{ data: produtos }, { data: entradas }] = await Promise.all([
    d.from("produtos").select("id, codigo, nome, unidade").eq("ativo", true).order("nome"),
    historico,
  ]);
  const lista = (entradas ?? []) as unknown as Linha[];
  const dataHoje = hoje();

  return (
    <>
      <PageHeader
        titulo="Registro de entrada"
        descricao="Recebimento de produtos na câmara frigorífica, vinculado ao número da Guia de Fornecimento (GF)."
      />

      {pode.movimentar(sessao.perfil) && (
      <Card titulo="Nova entrada" icone={ArrowDownToLine} className="mb-6">
          <EntradaForm produtos={produtos ?? []} hoje={dataHoje} usuario={sessao.nome} />
        </Card>
      )}

      <Card
        titulo="Entradas registradas"
        semPadding
        acoes={
          <form className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <input name="gf" defaultValue={gf} placeholder="Buscar por nº da GF" className="input w-48 py-1.5 pl-8" />
          </form>
        }
      >
        {lista.length === 0 ? (
          <Vazio>{gf ? `Nenhuma entrada para a GF "${gf}".` : "Nenhuma entrada registrada ainda."}</Vazio>
        ) : (
          <TabelaWrap>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Recebimento</th>
                  <th>GF</th>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th className="text-right">Quantidade</th>
                  <th className="text-right">Saldo do lote</th>
                  <th>Validade</th>
                  <th>Responsável</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                    <tr key={e.id}>
                      <td>{fmtData(e.data_recebimento)}</td>
                      <td className="font-mono text-xs font-semibold">{e.numero_gf}</td>
                      <td>
                        <span className="font-medium">{e.produtos?.nome}</span>{" "}
                        <span className="font-mono text-xs text-slate-400">{e.produtos?.codigo}</span>
                      </td>
                      <td className="font-mono text-xs">{e.lote}</td>
                      <td className="text-right tabular-nums">{fmtQtd(e.quantidade, e.unidade)}</td>
                      <td className="text-right tabular-nums">{fmtQtd(e.saldo, e.unidade)}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span>{fmtData(e.data_validade)}</span>
                          {Number(e.saldo) > 0 && <BadgeValidade data={e.data_validade} base={dataHoje} />}
                        </div>
                      </td>
                      <td>{e.responsavel}</td>
                      <td className="text-xs text-slate-500">
                        {e.usuario}
                        <br />
                        {fmtDataHora(e.criado_em)}
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
