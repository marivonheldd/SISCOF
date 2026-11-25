"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { lotesDisponiveis, registrarSaida, type LoteDisponivel } from "@/actions/movimentos";
import type { Resultado } from "@/actions/types";
import { fmtData, fmtQtd, parseQtd, REFEICOES, statusValidade, UNIDADES, UNIDADE_CURTA, type Unidade } from "@/lib/format";
import { Alerta, BadgeValidade } from "@/components/ui";

type Produto = { id: string; codigo: string; nome: string; unidade: Unidade; saldo: number };

const DESTINOS = ["Cozinha", "Refeitório", "Preparo", "Evento", "Descarte (vencido/avariado)", "Transferência"];

export default function SaidaForm({ produtos, hoje, usuario }: { produtos: Produto[]; hoje: string; usuario: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado>(null);

  const [produtoId, setProdutoId] = useState("");
  const [lotes, setLotes] = useState<LoteDisponivel[]>([]);
  const [loteId, setLoteId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [data, setData] = useState(hoje);
  const [destino, setDestino] = useState("");
  const [refeicao, setRefeicao] = useState("almoco");
  const [responsavel, setResponsavel] = useState(usuario);
  const [obs, setObs] = useState("");

  const produto = produtos.find((p) => p.id === produtoId);
  const lote = lotes.find((l) => l.id === loteId);
  const lotePeps = lotes[0];
  const qtd = parseQtd(quantidade);

  async function carregarLotes(id: string, manterSelecao = false) {
    if (!id) {
      setLotes([]);
      setLoteId("");
      return;
    }
    setCarregando(true);
    try {
      const l = await lotesDisponiveis(id);
      setLotes(l);
      setLoteId((atual) => (manterSelecao && l.some((x) => x.id === atual) ? atual : (l[0]?.id ?? "")));
    } catch (e) {
      setResultado({ ok: false, msg: (e as Error).message });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setResultado(null);
    setQuantidade("");
    carregarLotes(produtoId);
  }, [produtoId]);

  let erroQtd: string | null = null;
  if (quantidade && !(qtd > 0)) erroQtd = "Quantidade inválida.";
  else if (lote && qtd > lote.saldo) erroQtd = `Saída superior ao saldo do lote (${fmtQtd(lote.saldo, lote.unidade)}).`;
  else if (produto && qtd > 0 && produto.unidade !== "kg" && !Number.isInteger(qtd))
    erroQtd = `Use quantidade inteira (${UNIDADES[produto.unidade]}).`;

  const erroData = lote && data < lote.data_recebimento ? "Data anterior ao recebimento do lote." : null;
  const foraPeps = lote && lotePeps && lote.id !== lotePeps.id;
  const loteVencido = lote && statusValidade(lote.data_validade, hoje).status === "vencido";

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    if (!lote || erroQtd || erroData || !(qtd > 0)) return;
    if (foraPeps && !window.confirm(`O lote ${lotePeps.lote} é mais antigo (PEPS). Deseja retirar do lote ${lote.lote} mesmo assim?`)) return;
    if (loteVencido && !window.confirm(`O lote ${lote.lote} está VENCIDO. Confirmar a retirada (ex.: descarte)?`)) return;

    iniciar(async () => {
      const r = await registrarSaida({
        entrada_id: lote.id,
        quantidade,
        data_saida: data,
        destino,
        tipo_refeicao: refeicao,
        responsavel,
        observacoes: obs,
      });
      setResultado(r);
      if (r?.ok) {
        setQuantidade("");
        setObs("");
        await carregarLotes(produtoId, true);
        router.refresh();
      }
    });
  }

  if (produtos.length === 0) {
    return <Alerta tom="azul">Não há produtos com saldo em estoque. Registre uma entrada primeiro.</Alerta>;
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label htmlFor="produto" className="label label-req">
            Produto
          </label>
          <select id="produto" className="input" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} required>
            <option value="">Selecione um produto com saldo</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nome} ({fmtQtd(p.saldo, p.unidade)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="data" className="label label-req">
            Data da saída
          </label>
          <input id="data" type="date" className="input" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required />
          {erroData && <p className="mt-1 text-xs text-red-600">{erroData}</p>}
        </div>
      </div>

      {produtoId && (
        <div>
          <p className="label label-req">Lote</p>
          {carregando ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando lotes...
            </div>
          ) : lotes.length === 0 ? (
            <Alerta tom="amarelo">Este produto não possui lotes com saldo.</Alerta>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="tabela">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Lote</th>
                    <th>GF</th>
                    <th>Recebimento</th>
                    <th>Validade</th>
                    <th className="text-right">Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((l, i) => (
                    <tr
                      key={l.id}
                      onClick={() => setLoteId(l.id)}
                      className={`cursor-pointer ${l.id === loteId ? "!bg-marinho-50" : ""}`}
                    >
                      <td>
                        <input
                          type="radio"
                          name="lote"
                          checked={l.id === loteId}
                          onChange={() => setLoteId(l.id)}
                          aria-label={`Lote ${l.lote}`}
                        />
                      </td>
                      <td className="font-mono text-xs font-semibold">
                        {l.lote}
                        {i === 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-marinho-800 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase text-white">
                            <Star className="h-2.5 w-2.5" /> PEPS
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs">{l.numero_gf}</td>
                      <td>{fmtData(l.data_recebimento)}</td>
                      <td>
                        <span className="mr-2">{fmtData(l.data_validade)}</span>
                        <BadgeValidade data={l.data_validade} base={hoje} />
                      </td>
                      <td className="text-right font-semibold tabular-nums">{fmtQtd(l.saldo, l.unidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {foraPeps && (
            <p className="mt-2 text-xs text-amber-700">
              Atenção: o lote selecionado não é o mais antigo. Pelo PEPS, o recomendado é o lote {lotePeps.lote}.
            </p>
          )}
          {loteVencido && <p className="mt-2 text-xs font-medium text-red-700">Lote vencido — use apenas para descarte.</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="qtd" className="label label-req">
            Quantidade retirada
          </label>
          <div className="flex">
            <input
              id="qtd"
              className="input rounded-r-none"
              inputMode="decimal"
              placeholder="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
              disabled={!lote}
            />
            <span className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-2 text-xs text-slate-600">
              {produto ? UNIDADE_CURTA[produto.unidade] : "—"}
            </span>
          </div>
          {lote && !erroQtd && <p className="mt-1 text-xs text-slate-500">Disponível no lote: {fmtQtd(lote.saldo, lote.unidade)}</p>}
          {erroQtd && <p className="mt-1 text-xs text-red-600">{erroQtd}</p>}
        </div>
        <div>
          <label htmlFor="destino" className="label label-req">
            Destino ou finalidade
          </label>
          <input id="destino" list="destinos" className="input" value={destino} onChange={(e) => setDestino(e.target.value)} required maxLength={120} />
          <datalist id="destinos">
            {DESTINOS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="refeicao" className="label label-req">
            Tipo de refeição
          </label>
          <select id="refeicao" className="input" value={refeicao} onChange={(e) => setRefeicao(e.target.value)} required>
            {Object.entries(REFEICOES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="resp" className="label label-req">
            Responsável pela retirada
          </label>
          <input id="resp" className="input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} required minLength={2} maxLength={80} />
        </div>
      </div>
      <div>
        <label htmlFor="obs" className="label">
          Observações
        </label>
        <input id="obs" className="input" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
      </div>

      {resultado && <Alerta tom={resultado.ok ? "verde" : "vermelho"}>{resultado.msg}</Alerta>}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pendente || !lote || !!erroQtd || !!erroData || !(qtd > 0)}>
          <CheckCircle2 className="h-4 w-4" />
          {pendente ? "Registrando..." : "Confirmar saída"}
        </button>
      </div>
    </form>
  );
}
