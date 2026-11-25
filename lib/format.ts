// Utilitários compartilhados (cliente e servidor)

export const TZ = process.env.APP_TIMEZONE || "America/Cuiaba";

/** Lotes que vencem em até N dias são "próximos do vencimento". */
export const DIAS_ALERTA_VENCIMENTO = 7;

export const UNIDADES = {
  kg: "Quilograma (kg)",
  unidade: "Unidade",
  pacote: "Pacote",
  caixa: "Caixa",
} as const;
export type Unidade = keyof typeof UNIDADES;

export const UNIDADE_CURTA: Record<Unidade, string> = {
  kg: "kg",
  unidade: "un",
  pacote: "pct",
  caixa: "cx",
};

export const REFEICOES = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  outro: "Outro",
} as const;
export type TipoRefeicao = keyof typeof REFEICOES;

export function ehUnidade(v: string): v is Unidade {
  return v in UNIDADES;
}

/** Data de hoje (YYYY-MM-DD) no fuso do sistema. */
export function hoje(tz: string = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function inicioDoMes(iso: string, mesesAtras = 0): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - mesesAtras, 1));
  return d.toISOString().slice(0, 10);
}

export function diasAte(dataISO: string, base: string = hoje()): number {
  const a = Date.parse(base + "T00:00:00Z");
  const b = Date.parse(dataISO.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export type StatusValidade = "vencido" | "proximo" | "ok";

export function statusValidade(dataISO: string, base?: string): { status: StatusValidade; dias: number } {
  const dias = diasAte(dataISO, base);
  if (dias < 0) return { status: "vencido", dias };
  if (dias <= DIAS_ALERTA_VENCIMENTO) return { status: "proximo", dias };
  return { status: "ok", dias };
}

export function fmtData(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDataHora(iso?: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function fmtMes(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(iso.slice(0, 10) + "T12:00:00Z"))
    .replace(".", "");
}

export function fmtNum(n: number | string | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(n ?? 0));
}

export function fmtQtd(n: number | string | null | undefined, u?: string | null): string {
  const s = fmtNum(n);
  if (!u) return s;
  return `${s} ${UNIDADE_CURTA[u as Unidade] ?? u}`;
}

/** Aceita "1,5", "1.5", "1.250,75". Retorna NaN se inválido. */
export function parseQtd(v: unknown): number {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(Number(s) * 1000) / 1000;
}

export function dataValida(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
}
