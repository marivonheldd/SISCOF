import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Search } from "lucide-react";
import { db } from "@/lib/db";
import { dataValida, fmtData, fmtDataHora, fmtQtd, REFEICOES, type TipoRefeicao } from "@/lib/format";
import { Badge, Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Movimentações" };

const POR_PAGINA = 50;

type Mov = {
  id: string;
  tipo: "entrada" | "saida";
  data: string;
  criado_em: string;
  codigo: string;
  produto: string;
  lote: string;
  quantidade: number;
  unidade: string;
  numero_gf: string;
  destino: string | null;
  tipo_refeicao: TipoRefeicao | null;
  responsavel: string;
  usuario: string;
  observacoes: string | null;
};

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; de?: string; ate?: string; q?: string; p?: string }>;
}) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number.parseInt(sp.p ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim().replace(/[%,()*\\]/g, " ").trim();

  let consulta = db()
    .from("v_movimentacoes")
    .select("*", { count: "exact" })
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (sp.tipo === "entrada" || sp.tipo === "saida") consulta = consulta.eq("tipo", sp.tipo);
  if (dataValida(sp.de)) consulta = consulta.gte("data", sp.de);
  if (dataValida(sp.ate)) consulta = consulta.lte("data", sp.ate);
  if (q) consulta = consulta.or(`produto.ilike.%${q}%,codigo.ilike.%${q}%,lote.ilike.%${q}%,numero_gf.ilike.%${q}%`);

  const { data, count, error } = await consulta;
  const lista = (data ?? []) as Mov[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const link = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "p") u.set(k, v);
    u.set("p", String(p));
    return `/movimentacoes?${u}`;
  };

  return (
    <>
      <PageHeader titulo="Movimentações" descricao="Histórico completo e imutável de entradas e saídas." />
      <Card semPadding>
        <form className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input name="q" defaultValue={sp.q} placeholder="Produto, código, lote ou GF" className="input pl-9" />
          </div>
          <select name="tipo" defaultValue={sp.tipo ?? ""} className="input">
            <option value="">Entradas e saídas</option>
            <option value="entrada">Somente entradas</option>
            <option value="saida">Somente saídas</option>
          </select>
          <input type="date" name="de" defaultValue={sp.de} className="input" aria-label="De" />
          <input type="date" name="ate" defaultValue={sp.ate} className="input" aria-label="Até" />
          <button className="btn-secondary">Filtrar</button>
        </form>

        {error ? (
          <Vazio>Erro ao carregar: {error.message}</Vazio>
        ) : lista.length === 0 ? (
          <Vazio>Nenhuma movimentação encontrada.</Vazio>
        ) : (
          <TabelaWrap>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>GF</th>
                  <th className="text-right">Quantidade</th>
                  <th>Destino / refeição</th>
                  <th>Responsável</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={`${m.tipo}-${m.id}`}>
                    <td>
                      {m.tipo === "entrada" ? (
                        <Badge tom="verde">
                          <ArrowDownToLine className="h-3 w-3" /> Entrada
                        </Badge>
                      ) : (
                        <Badge tom="azul">
                          <ArrowUpFromLine className="h-3 w-3" /> Saída
                        </Badge>
                      )}
                    </td>
                    <td>{fmtData(m.data)}</td>
                    <td>
                      <span className="font-medium">{m.produto}</span>{" "}
                      <span className="font-mono text-xs text-slate-400">{m.codigo}</span>
                    </td>
                    <td className="font-mono text-xs">{m.lote}</td>
                    <td className="font-mono text-xs">{m.numero_gf}</td>
                    <td className={`text-right tabular-nums ${m.tipo === "saida" ? "text-marinho-700" : "text-emerald-700"}`}>
                      {m.tipo === "saida" ? "−" : "+"}
                      {fmtQtd(m.quantidade, m.unidade)}
                    </td>
                    <td>
                      {m.destino ?? "—"}
                      {m.tipo_refeicao && <span className="block text-xs text-slate-500">{REFEICOES[m.tipo_refeicao]}</span>}
                      {m.observacoes && <span className="block text-xs italic text-slate-500">{m.observacoes}</span>}
                    </td>
                    <td>{m.responsavel}</td>
                    <td className="text-xs text-slate-500">
                      {m.usuario}
                      <br />
                      {fmtDataHora(m.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelaWrap>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            {total} {total === 1 ? "registro" : "registros"} · página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link href={link(pagina - 1)} className="btn-secondary btn-sm">
                Anterior
              </Link>
            )}
            {pagina < paginas && (
              <Link href={link(pagina + 1)} className="btn-secondary btn-sm">
                Próxima
              </Link>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
