"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, PieChart as PieIcon, Boxes } from "lucide-react";
import { fmtNum, UNIDADE_CURTA, type Unidade } from "@/lib/format";

export type DadosGraficos = {
  unidades: Unidade[];
  mensal: Record<Unidade, { mes: string; entradas: number; saidas: number }[]>;
  categorias: Record<Unidade, { categoria: string; total: number }[]>;
  estoque: Record<Unidade, { produto: string; saldo: number }[]>;
};

const CORES = ["#1d3762", "#4f77b6", "#0e9f6e", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#64748b"];

function Bloco({ titulo, icone: I, children }: { titulo: string; icone: typeof BarChart3; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-marinho-900">
        <I className="h-4 w-4 text-marinho-500" /> {titulo}
      </h3>
      {children}
    </section>
  );
}

function SemDados() {
  return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sem dados no período.</div>;
}

export default function Graficos({ dados }: { dados: DadosGraficos }) {
  const [u, setU] = useState<Unidade>(dados.unidades[0] ?? "kg");
  const un = UNIDADE_CURTA[u];
  const mensal = dados.mensal[u] ?? [];
  const cats = dados.categorias[u] ?? [];
  const est = dados.estoque[u] ?? [];
  const temMensal = mensal.some((m) => m.entradas || m.saidas);
  const tip = (v: unknown) => `${fmtNum(Number(v))} ${un}`;

  return (
    <div className="space-y-4">
      {dados.unidades.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Unidade dos gráficos:</span>
          {dados.unidades.map((x) => (
            <button
              key={x}
              onClick={() => setU(x)}
              className={`rounded-full px-3 py-1 font-medium ${
                x === u ? "bg-marinho-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {UNIDADE_CURTA[x]}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo={`Entradas e saídas mensais (${un})`} icone={BarChart3}>
          {temMensal ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mensal} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip formatter={tip} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#0e9f6e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#1d3762" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SemDados />
          )}
        </Bloco>

        <Bloco titulo={`Consumo por categoria – últimos 6 meses (${un})`} icone={PieIcon}>
          {cats.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={cats} dataKey="total" nameKey="categoria" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {cats.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tip} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <SemDados />
          )}
        </Bloco>
      </div>

      <Bloco titulo={`Quantidade em estoque por produto (${un})`} icone={Boxes}>
        {est.length ? (
          <ResponsiveContainer width="100%" height={Math.max(220, est.length * 32)}>
            <BarChart data={est} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => fmtNum(v)} />
              <YAxis type="category" dataKey="produto" width={150} tick={{ fontSize: 12 }} />
              <Tooltip formatter={tip} />
              <Bar dataKey="saldo" name="Saldo" fill="#4f77b6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SemDados />
        )}
      </Bloco>
    </div>
  );
}
