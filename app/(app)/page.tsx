import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Package,
  PackageX,
  Scale,
  XCircle,
  History,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  DIAS_ALERTA_VENCIMENTO,
  fmtData,
  fmtDataHora,
  fmtMes,
  fmtNum,
  fmtQtd,
  hoje,
  inicioDoMes,
  statusValidade,
  UNIDADES,
  type Unidade,
} from "@/lib/format";
import { Alerta, Badge, BadgeValidade, Card, PageHeader, TabelaWrap, Vazio } from "@/components/ui";
import Graficos, { type DadosGraficos } from "@/components/Graficos";
import AutoRefresh from "@/components/AutoRefresh";

type Tom = "azul" | "verde" | "amarelo" | "vermelho" | "cinza";

function Indicador({
  titulo,
  valor,
  detalhe,
  icone: I,
  tom = "azul",
  href,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: LucideIcon;
  tom?: Tom;
  href?: string;
}) {
  const cor = {
    azul: "bg-marinho-50 text-marinho-700",
    verde: "bg-emerald-50 text-emerald-700",
    amarelo: "bg-amber-50 text-amber-700",
    vermelho: "bg-red-50 text-red-700",
    cinza: "bg-slate-100 text-slate-600",
  }[tom];
  const corpo = (
    <div className="card flex h-full items-start gap-4 p-4 transition hover:shadow-md">
      <div className={`rounded-lg p-2.5 ${cor}`}>
        <I className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-marinho-900">{valor}</p>
        {detalhe && <p className="mt-0.5 truncate text-xs text-slate-500">{detalhe}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{corpo}</Link> : corpo;
}

type Lote = { id: string; produto: string; lote: string; data_validade: string; saldo: number; unidade: Unidade };
type Mov = {
  id: string;
  tipo: "entrada" | "saida";
  data: string;
  criado_em: string;
  produto: string;
  lote: string;
  quantidade: number;
  unidade: string;
  responsavel: string;
};

async function todosLotesComSaldo(): Promise<Lote[]> {
  const out: Lote[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db()
      .from("v_lotes")
      .select("id, produto, lote, data_validade, saldo, unidade")
      .gt("saldo", 0)
      .order("data_validade")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Lote[]));
    if (!data || data.length < 1000) return out;
  }
}

export default async function Painel({ searchParams }: { searchParams: Promise<{ sem_permissao?: string }> }) {
  const semPermissao = (await searchParams).sem_permissao === "1";
  const d = db();
  const dataHoje = hoje();
  const mesAtual = inicioDoMes(dataHoje);
  const seisMeses = inicioDoMes(dataHoje, 5);

  const [{ data: produtos }, lotes, { data: mensais }, { data: consumo }, { data: ultimas }] = await Promise.all([
    d.from("v_estoque_produto").select("id, nome, unidade, ativo, saldo"),
    todosLotesComSaldo(),
    d.from("v_movimentos_mensais").select("*").gte("mes", seisMeses),
    d.from("v_consumo_categoria").select("*").gte("mes", seisMeses),
    d
      .from("v_movimentacoes")
      .select("id, tipo, data, criado_em, produto, lote, quantidade, unidade, responsavel")
      .order("criado_em", { ascending: false })
      .limit(10),
  ]);

  const prods = (produtos ?? []) as { id: string; nome: string; unidade: Unidade; ativo: boolean; saldo: number }[];
  const mens = (mensais ?? []) as { mes: string; tipo: string; unidade: Unidade; total: number; registros: number }[];
  const cons = (consumo ?? []) as { mes: string; categoria: string; unidade: Unidade; total: number }[];

  // --- Indicadores
  const ativos = prods.filter((p) => p.ativo).length;
  const estoqueKg = prods.filter((p) => p.unidade === "kg").reduce((s, p) => s + Number(p.saldo), 0);
  const outrasUnid = prods.filter((p) => p.unidade !== "kg" && Number(p.saldo) > 0);
  const doMes = (tipo: string) => mens.filter((m) => m.tipo === tipo && m.mes.slice(0, 10) === mesAtual);
  const resumoMes = (tipo: string) => {
    const l = doMes(tipo);
    const regs = l.reduce((s, m) => s + Number(m.registros), 0);
    const kg = l.filter((m) => m.unidade === "kg").reduce((s, m) => s + Number(m.total), 0);
    return { regs, kg };
  };
  const entMes = resumoMes("entrada");
  const saiMes = resumoMes("saida");
  const vencidos = lotes.filter((l) => statusValidade(l.data_validade, dataHoje).status === "vencido");
  const proximos = lotes.filter((l) => statusValidade(l.data_validade, dataHoje).status === "proximo");
  const zerados = prods.filter((p) => p.ativo && Number(p.saldo) === 0);

  // --- Gráficos
  const unidades = (Object.keys(UNIDADES) as Unidade[]).filter(
    (u) => mens.some((m) => m.unidade === u) || prods.some((p) => p.unidade === u && Number(p.saldo) > 0),
  );
  if (unidades.length === 0) unidades.push("kg");
  const meses = Array.from({ length: 6 }, (_, i) => inicioDoMes(dataHoje, 5 - i));
  const graficos: DadosGraficos = { unidades, mensal: {} as never, categorias: {} as never, estoque: {} as never };
  for (const u of unidades) {
    graficos.mensal[u] = meses.map((mes) => {
      const soma = (t: string) =>
        mens.filter((m) => m.unidade === u && m.tipo === t && m.mes.slice(0, 10) === mes).reduce((s, m) => s + Number(m.total), 0);
      return { mes: fmtMes(mes), entradas: soma("entrada"), saidas: soma("saida") };
    });
    const porCat = new Map<string, number>();
    for (const c of cons.filter((c) => c.unidade === u)) porCat.set(c.categoria, (porCat.get(c.categoria) ?? 0) + Number(c.total));
    graficos.categorias[u] = [...porCat].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
    graficos.estoque[u] = prods
      .filter((p) => p.unidade === u && Number(p.saldo) > 0)
      .map((p) => ({ produto: p.nome, saldo: Number(p.saldo) }))
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 15);
  }

  const alertas = [...vencidos, ...proximos].slice(0, 8);
  const movs = (ultimas ?? []) as Mov[];

  return (
    <>
      <AutoRefresh segundos={60} />
      <PageHeader titulo="Painel" descricao={`Situação da câmara frigorífica em ${fmtData(dataHoje)}. Atualização automática a cada minuto.`} />

      {semPermissao && (
        <div className="mb-4">
          <Alerta tom="vermelho">Seu perfil não tem permissão para acessar aquela página.</Alerta>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Produtos cadastrados" valor={fmtNum(prods.length)} detalhe={`${ativos} ativos`} icone={Package} href="/produtos" />
        <Indicador
          titulo="Estoque total (kg)"
          valor={`${fmtNum(Math.round(estoqueKg * 10) / 10)} kg`}
          detalhe={outrasUnid.length ? `+ ${outrasUnid.length} produto(s) em outras unidades` : undefined}
          icone={Scale}
          href="/estoque"
        />
        <Indicador
          titulo="Entradas no mês"
          valor={fmtNum(entMes.regs)}
          detalhe={`${fmtNum(entMes.kg)} kg recebidos`}
          icone={ArrowDownToLine}
          tom="verde"
          href="/movimentacoes?tipo=entrada"
        />
        <Indicador
          titulo="Saídas no mês"
          valor={fmtNum(saiMes.regs)}
          detalhe={`${fmtNum(saiMes.kg)} kg retirados`}
          icone={ArrowUpFromLine}
          tom="azul"
          href="/movimentacoes?tipo=saida"
        />
        <Indicador
          titulo={`Vencendo em até ${DIAS_ALERTA_VENCIMENTO} dias`}
          valor={fmtNum(proximos.length)}
          detalhe="lotes com saldo"
          icone={Clock}
          tom={proximos.length ? "amarelo" : "cinza"}
          href="/estoque?aba=proximos"
        />
        <Indicador
          titulo="Produtos vencidos"
          valor={fmtNum(vencidos.length)}
          detalhe="lotes com saldo"
          icone={XCircle}
          tom={vencidos.length ? "vermelho" : "cinza"}
          href="/estoque?aba=vencidos"
        />
        <Indicador
          titulo="Estoque zerado"
          valor={fmtNum(zerados.length)}
          detalhe="produtos ativos"
          icone={PackageX}
          tom={zerados.length ? "amarelo" : "cinza"}
          href="/estoque?aba=zerados"
        />
        <Indicador titulo="Lotes em estoque" valor={fmtNum(lotes.length)} detalhe="com saldo disponível" icone={History} href="/estoque?aba=lotes" />
      </div>

      {alertas.length > 0 && (
        <Card titulo="Alertas de validade" icone={AlertTriangle} className="mt-6" semPadding>
          <ul className="divide-y divide-slate-100">
            {alertas.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{l.produto}</span>{" "}
                  <span className="font-mono text-xs text-slate-500">lote {l.lote}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-slate-600">{fmtQtd(l.saldo, l.unidade)}</span>
                  <span className="text-slate-500">{fmtData(l.data_validade)}</span>
                  <BadgeValidade data={l.data_validade} base={dataHoje} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6">
        <Graficos dados={graficos} />
      </div>

      <Card
        titulo="Últimas movimentações"
        icone={History}
        className="mt-6"
        semPadding
        acoes={
          <Link href="/movimentacoes" className="text-sm font-medium text-marinho-600 hover:underline">
            Ver todas
          </Link>
        }
      >
        {movs.length === 0 ? (
          <Vazio>Nenhuma movimentação registrada ainda.</Vazio>
        ) : (
          <TabelaWrap>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th className="text-right">Quantidade</th>
                  <th>Responsável</th>
                  <th>Registrado em</th>
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={`${m.tipo}-${m.id}`}>
                    <td>{m.tipo === "entrada" ? <Badge tom="verde">Entrada</Badge> : <Badge tom="azul">Saída</Badge>}</td>
                    <td>{fmtData(m.data)}</td>
                    <td className="font-medium">{m.produto}</td>
                    <td className="font-mono text-xs">{m.lote}</td>
                    <td className="text-right tabular-nums">{fmtQtd(m.quantidade, m.unidade)}</td>
                    <td>{m.responsavel}</td>
                    <td className="text-xs text-slate-500">{fmtDataHora(m.criado_em)}</td>
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
