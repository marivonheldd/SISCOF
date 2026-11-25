import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { statusValidade, type StatusValidade } from "@/lib/format";

export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-marinho-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Card({
  titulo,
  icone: Icone,
  acoes,
  children,
  className = "",
  semPadding = false,
}: {
  titulo?: string;
  icone?: LucideIcon;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  semPadding?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {titulo && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-semibold text-marinho-900">
            {Icone && <Icone className="h-4 w-4 text-marinho-500" />}
            {titulo}
          </h2>
          {acoes}
        </div>
      )}
      <div className={semPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

const tons = {
  azul: "bg-marinho-50 text-marinho-700 ring-marinho-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amarelo: "bg-amber-50 text-amber-800 ring-amber-200",
  vermelho: "bg-red-50 text-red-700 ring-red-200",
  cinza: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;
export type Tom = keyof typeof tons;

export function Badge({ tom = "cinza", children }: { tom?: Tom; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tons[tom]}`}>
      {children}
    </span>
  );
}

export function BadgeValidade({ data, base }: { data: string; base?: string }) {
  const { status, dias } = statusValidade(data, base);
  const mapa: Record<StatusValidade, { tom: Tom; texto: string; icone: LucideIcon }> = {
    vencido: { tom: "vermelho", texto: `Vencido há ${Math.abs(dias)} d`, icone: XCircle },
    proximo: { tom: "amarelo", texto: dias === 0 ? "Vence hoje" : `Vence em ${dias} d`, icone: Clock },
    ok: { tom: "verde", texto: `${dias} dias`, icone: CheckCircle2 },
  };
  const { tom, texto, icone: I } = mapa[status];
  return (
    <Badge tom={tom}>
      <I className="h-3 w-3" />
      {texto}
    </Badge>
  );
}

export function Alerta({
  tom = "amarelo",
  titulo,
  children,
}: {
  tom?: "amarelo" | "vermelho" | "azul" | "verde";
  titulo?: string;
  children?: React.ReactNode;
}) {
  const cls = {
    amarelo: "border-amber-200 bg-amber-50 text-amber-900",
    vermelho: "border-red-200 bg-red-50 text-red-800",
    azul: "border-marinho-200 bg-marinho-50 text-marinho-900",
    verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tom];
  const Icone = tom === "verde" ? CheckCircle2 : tom === "vermelho" ? XCircle : AlertTriangle;
  return (
    <div className={`flex gap-3 rounded-lg border p-3 text-sm ${cls}`} role="alert">
      <Icone className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500">{children}</div>;
}

export function TabelaWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
