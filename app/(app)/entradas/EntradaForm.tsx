"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { registrarEntrada, type ItemEntrada } from "@/actions/movimentos";
import type { Resultado } from "@/actions/types";
import { fmtData, fmtQtd, parseQtd, UNIDADES, UNIDADE_CURTA, type Unidade } from "@/lib/format";
import { Alerta } from "@/components/ui";

type Produto = { id: string; codigo: string; nome: string; unidade: Unidade };
type Item = ItemEntrada & { chave: number };

let seq = 0;
const novoItem = (): Item => ({
  chave: ++seq,
  produto_id: "",
  quantidade: "",
  lote: "",
  data_fabricacao: "",
  data_validade: "",
});

export default function EntradaForm({ produtos, hoje, usuario }: { produtos: Produto[]; hoje: string; usuario: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado>(null);

  const [data, setData] = useState(hoje);
  const [gf, setGf] = useState("");
  const [responsavel, setResponsavel] = useState(usuario);
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<Item[]>([novoItem()]);

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const alterar = (chave: number, campo: keyof ItemEntrada, valor: string) =>
    setItens((l) => l.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)));

  function problemasItem(i: Item): string | null {
    const p = porId.get(i.produto_id);
    if (!p) return null;
    const q = parseQtd(i.quantidade);
    if (i.quantidade && !(q > 0)) return "Quantidade inválida.";
    if (q > 0 && p.unidade !== "kg" && !Number.isInteger(q)) return `Use quantidade inteira (${UNIDADES[p.unidade]}).`;
    if (i.data_validade && i.data_validade < data) return "Validade anterior ao recebimento: produto vencido.";
    if (i.data_fabricacao && i.data_validade && i.data_fabricacao > i.data_validade)
      return "Fabricação posterior à validade.";
    if (i.data_fabricacao && i.data_fabricacao > data) return "Fabricação posterior ao recebimento.";
    return null;
  }

  const temProblema = itens.some((i) => problemasItem(i));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    if (temProblema) {
      setResultado({ ok: false, msg: "Corrija os itens destacados antes de confirmar." });
      return;
    }
    const resumo = itens
      .map((i) => {
        const p = porId.get(i.produto_id);
        return `• ${p?.nome ?? "?"} — ${fmtQtd(parseQtd(i.quantidade), p?.unidade)} — lote ${i.lote} — val. ${fmtData(i.data_validade)}`;
      })
      .join("\n");
    if (!window.confirm(`Confirmar entrada da GF ${gf} em ${fmtData(data)}?\n\n${resumo}`)) return;

    iniciar(async () => {
      const r = await registrarEntrada({
        data_recebimento: data,
        numero_gf: gf,
        responsavel,
        observacoes: obs,
        itens: itens.map(({ chave: _c, ...resto }) => resto),
      });
      setResultado(r);
      if (r?.ok) {
        setItens([novoItem()]);
        setGf("");
        setObs("");
        router.refresh();
      }
    });
  }

  if (produtos.length === 0) {
    return <Alerta tom="azul">Cadastre pelo menos um produto ativo antes de registrar entradas.</Alerta>;
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="data" className="label label-req">
            Data do recebimento
          </label>
          <input id="data" type="date" className="input" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="gf" className="label label-req">
            Nº da Guia de Fornecimento (GF)
          </label>
          <input id="gf" className="input font-mono" value={gf} onChange={(e) => setGf(e.target.value)} required maxLength={40} />
        </div>
        <div>
          <label htmlFor="resp" className="label label-req">
            Responsável pelo recebimento
          </label>
          <input id="resp" className="input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} required minLength={2} maxLength={80} />
        </div>
        <div>
          <label htmlFor="obs" className="label">
            Observações
          </label>
          <input id="obs" className="input" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-marinho-900">Produtos desta GF ({itens.length})</h3>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setItens((l) => [...l, novoItem()])}>
            <Plus className="h-3.5 w-3.5" /> Adicionar produto
          </button>
        </div>

        <div className="space-y-3">
          {itens.map((i, idx) => {
            const p = porId.get(i.produto_id);
            const problema = problemasItem(i);
            return (
              <div
                key={i.chave}
                className={`rounded-lg border p-3 ${problema ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-slate-50/60"}`}
              >
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="label label-req">Produto {idx + 1}</label>
                    <select className="input" value={i.produto_id} onChange={(e) => alterar(i.chave, "produto_id", e.target.value)} required>
                      <option value="">Selecione o produto</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} — {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label label-req">Quantidade</label>
                    <div className="flex">
                      <input
                        className="input rounded-r-none"
                        inputMode="decimal"
                        placeholder="0"
                        value={i.quantidade}
                        onChange={(e) => alterar(i.chave, "quantidade", e.target.value)}
                        required
                      />
                      <span className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-2 text-xs text-slate-600">
                        {p ? UNIDADE_CURTA[p.unidade] : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label label-req">Lote</label>
                    <input className="input font-mono" value={i.lote} onChange={(e) => alterar(i.chave, "lote", e.target.value)} required maxLength={40} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Fabricação</label>
                    <input type="date" className="input" value={i.data_fabricacao} max={data} onChange={(e) => alterar(i.chave, "data_fabricacao", e.target.value)} />
                  </div>
                  <div className="flex gap-2 md:col-span-2">
                    <div className="flex-1">
                      <label className="label label-req">Validade</label>
                      <input type="date" className="input" value={i.data_validade} min={data} onChange={(e) => alterar(i.chave, "data_validade", e.target.value)} required />
                    </div>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        className="mt-6 self-start rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setItens((l) => l.filter((x) => x.chave !== i.chave))}
                        aria-label={`Remover produto ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {problema && <p className="mt-2 text-xs font-medium text-red-700">{problema}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {resultado && <Alerta tom={resultado.ok ? "verde" : "vermelho"}>{resultado.msg}</Alerta>}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pendente}>
          <CheckCircle2 className="h-4 w-4" />
          {pendente ? "Registrando..." : "Confirmar entrada"}
        </button>
      </div>
    </form>
  );
}
