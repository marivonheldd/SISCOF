import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Verifica a configuração do servidor e a conexão com o banco.
 * Mostra apenas NOMES de variáveis e mensagens — nunca valores.
 */
export async function diagnosticar(): Promise<string[]> {
  const problemas: string[] = [];
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const secret = process.env.SESSION_SECRET;

  if (!url) problemas.push("Variável SUPABASE_URL não cadastrada na Vercel.");
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url))
    problemas.push("SUPABASE_URL inválida: deve ser no formato https://xxxx.supabase.co (sem /rest/v1 no final).");
  if (!key) problemas.push("Variável SUPABASE_SERVICE_ROLE_KEY não cadastrada na Vercel.");
  if (!secret) problemas.push("Variável SESSION_SECRET não cadastrada na Vercel.");
  else if (secret.length < 32) problemas.push("SESSION_SECRET muito curto: use pelo menos 32 caracteres.");
  if (!process.env.APP_PASSWORD) problemas.push("Variável APP_PASSWORD não cadastrada (necessária no primeiro acesso do ADM).");

  if (url && key && /^https:\/\//.test(url)) {
    try {
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await db.from("usuarios").select("id", { head: true, count: "exact" });
      if (error) {
        if (error.code === "PGRST205" || error.code === "42P01" || /usuarios/.test(error.message))
          problemas.push("O banco ainda não tem as tabelas do SISCOF: rode o arquivo supabase/schema.sql no SQL Editor do Supabase.");
        else if (/JWT|Invalid API key|apikey/i.test(error.message))
          problemas.push("SUPABASE_SERVICE_ROLE_KEY inválida: copie a chave service_role (secret) em Project Settings → API Keys.");
        else problemas.push(`Erro ao acessar o banco: ${error.message}`);
      }
    } catch {
      problemas.push("Não foi possível conectar ao Supabase: confira a SUPABASE_URL e se o projeto está ativo (não pausado).");
    }
  }
  return problemas;
}
