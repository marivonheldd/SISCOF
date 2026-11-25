import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizarSupabaseUrl } from "./supabase-url";

let cliente: SupabaseClient | null = null;

/** Cliente Supabase do servidor (service_role). Nunca importe em componentes "use client". */
export function db(): SupabaseClient {
  if (cliente) return cliente;
  const url = normalizarSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["'`]+|["'`]+$/g, "");
  if (!url || !key) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.");
  }
  cliente = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

export function traduzErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Erro desconhecido.";
  if (e.code === "23505") return "Registro duplicado: já existe um item com este código ou nome.";
  if (e.code === "23514") return "Valor inválido: verifique quantidades e datas.";
  if (e.code === "23503") return "Referência inválida: o item vinculado não existe.";
  if (e.code === "22P02") return "Dado em formato inválido.";
  return e.message || "Erro ao acessar o banco de dados.";
}
