import "server-only";
import { createClient } from "@supabase/supabase-js";
import { normalizarSupabaseUrl } from "./supabase-url";

/**
 * Verifica a configuração do servidor e a conexão com o banco.
 * Mostra apenas NOMES de variáveis e mensagens — nunca valores.
 */
export async function diagnosticar(): Promise<string[]> {
  const problemas: string[] = [];
  const bruta = process.env.SUPABASE_URL?.trim();
  const url = normalizarSupabaseUrl(bruta);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["'`]+|["'`]+$/g, "");
  const secret = process.env.SESSION_SECRET;

  if (!bruta) problemas.push("Variável SUPABASE_URL não cadastrada na Vercel.");
  else if (/^["'`]?(eyJ|sb_)/.test(bruta))
    problemas.push("Em SUPABASE_URL foi colada uma CHAVE. Ali vai o endereço https://xxxx.supabase.co; a chave vai em SUPABASE_SERVICE_ROLE_KEY.");
  else if (!url && !/^["'`]?(eyJ|sb_)/.test(bruta))
    problemas.push("SUPABASE_URL não reconhecida: cole a Project URL (https://xxxx.supabase.co), em Project Settings → Data API.");
  if (!key) problemas.push("Variável SUPABASE_SERVICE_ROLE_KEY não cadastrada na Vercel.");
  else if (/^sb_publishable_/.test(key) || /^https?:/.test(key))
    problemas.push("SUPABASE_SERVICE_ROLE_KEY errada: use a chave service_role (eyJ...) ou a secret (sb_secret_...), não a publishable/anon nem a URL.");
  if (!secret) problemas.push("Variável SESSION_SECRET não cadastrada na Vercel.");
  else if (secret.length < 32) problemas.push("SESSION_SECRET muito curto: use pelo menos 32 caracteres.");
  if (!process.env.APP_PASSWORD) problemas.push("Variável APP_PASSWORD não cadastrada (necessária no primeiro acesso do ADM).");

  if (url && key) {
    try {
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { error, status } = await db.from("usuarios").select("id").limit(1);
      if (error) {
        const m = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
        if (status === 404 || /PGRST205|PGRST202|42P01|does not exist|schema cache|Could not find/i.test(m))
          problemas.push("O banco ainda não tem as tabelas do SISCOF: rode o arquivo supabase/schema.sql no SQL Editor do Supabase (no mesmo projeto desta URL).");
        else if (status === 401 || status === 403 || /42501|permission denied|JWT|Invalid API key|apikey|Unauthorized/i.test(m))
          problemas.push("A chave em SUPABASE_SERVICE_ROLE_KEY não tem permissão: use a secret (sb_secret_...) ou a service_role, do MESMO projeto da URL.");
        else problemas.push(`Erro ao acessar o banco (HTTP ${status}): ${m.trim() || "sem detalhes"}`);
      }
    } catch {
      problemas.push("Não foi possível conectar ao Supabase: confira a SUPABASE_URL e se o projeto está ativo (não pausado).");
    }
  }
  return problemas;
}
