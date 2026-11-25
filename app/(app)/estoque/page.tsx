import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { DIAS_ALERTA_VENCIMENTO, diasAte, fmtData, fmtQtd, hoje, type Unidade } from "@/lib/format";
import { Badge, BadgeValidade, Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Estoque e validade" };

type Lote = {
  id: string;
  codigo: string;
  produto: string;
  categoria: string;
  lote: string;
  numero_gf: string;
  data_recebimento: string;
  data_validade: string;
  quantidade: number;
  saldo: number;
  unidade: Unidade;
};

type ProdutoEstoque = {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  unidade: Unidade;
  ativo: boolean;
  saldo: number;
  lotes_ativos: number;
  proxima_validade: string | null;
};

const ABAS = [
  { id: "produtos", label: "Por produto" },
  { id: "lotes", label: "Por lote" },
  { id: "proximos", label: `Vencendo em até ${DIAS_ALERTA_VENCIMENTO} dias` },
  { id: "vencidos", label: "Vencidos" },
  { id: "zerados", label: "Estoque zerado" },
] as const;

function diaMaisN(base: string, n: number) {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const sp = await searchParams;
  const aba = ABAS.some((a) => a.id === sp.aba) ? sp.aba! : "produtos";
  const d = db();
  const dataHoje = hoje();

  let conteudo: React.ReactNode;

  if (aba === "produtos" || aba === "zerados") {
    let q = d.from("v_estoque_produto").select("*").order("nome");
    if (aba === "zerados") q = q.eq("saldo", 0).eq("ativo", true);
    const { data } = await q;
    const lista = (data ?? []) as ProdutoEstoque[];
    conteudo =
      lista.length === 0 ? (
        <Vazio>{aba === "zerados" ? "Nenhum produto ativo com estoque zerado." : "Nenhum produto cadastrado."}</Vazio>
      ) : (
        <TabelaWrap>
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th className="text-right">Saldo</th>
                <th className="text-right">Lotes</th>
                <th>Próxima validade</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.codigo}</td>
                  <td className="font-medium">{p.nome}</td>
                  <td>{p.categoria}</td>
                  <td className="text-right font-semibold tabular-nums">{fmtQtd(p.saldo, p.unidade)}</td>
                  <td className="text-right tabular-nums">{p.lotes_ativos}</td>
                  <td>
                    {p.proxima_validade ? (
                      <div className="flex items-center gap-2">
                        {fmtData(p.proxima_validade)} <BadgeValidade data={p.proxima_validade} base={dataHoje} />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {!p.ativo ? (
                      <Badge>Inativo</Badge>
                    ) : Number(p.saldo) === 0 ? (
                      <Badge tom="vermelho">Zerado</Badge>
                    ) : (
                      <Badge tom="verde">Em estoque</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaWrap>
      );
  } else {
    let q = d
      .from("v_lotes")
      .select("*")
      .gt("saldo", 0)
      .order("data_validade", { ascending: true })
      .order("data_recebimento", { ascending: true });
    if (aba === "vencidos") q = q.lt("data_validade", dataHoje);
    if (aba === "proximos") q = q.gte("data_validade", dataHoje).lte("data_validade", diaMaisN(dataHoje, DIAS_ALERTA_VENCIMENTO));
    const { data } = await q;
    const lista = (data ?? []) as Lote[];
    conteudo =
      lista.length === 0 ? (
        <Vazio>Nenhum lote nesta situação.</Vazio>
      ) : (
        <TabelaWrap>
          <table className="tabela">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Lote</th>
                <th>GF</th>
                <th>Recebimento</th>
                <th>Validade</th>
                <th className="text-right">Recebido</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} className={diasAte(l.data_validade, dataHoje) < 0 ? "bg-red-50/60" : ""}>
                  <td>
                    <span className="font-medium">{l.produto}</span>{" "}
                    <span className="font-mono text-xs text-slate-400">{l.codigo}</span>
                  </td>
                  <td>{l.categoria}</td>
                  <td className="font-mono text-xs font-semibold">{l.lote}</td>
                  <td className="font-mono text-xs">{l.numero_gf}</td>
                  <td>{fmtData(l.data_recebimento)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {fmtData(l.data_validade)} <BadgeValidade data={l.data_validade} base={dataHoje} />
                    </div>
                  </td>
                  <td className="text-right tabular-nums text-slate-500">{fmtQtd(l.quantidade, l.unidade)}</td>
                  <td className="text-right font-semibold tabular-nums">{fmtQtd(l.saldo, l.unidade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaWrap>
      );
  }

  return (
    <>
      <PageHeader titulo="Estoque e validade" descricao="Saldo atual por produto e por lote, com alertas de vencimento." />
      <div className="mb-4 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`/estoque?aba=${a.id}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              aba === a.id ? "bg-marinho-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>
      <Card semPadding>{conteudo}</Card>
    </>
  );
}
