/**
 * Aceita a URL do Supabase em vários formatos e devolve https://<ref>.supabase.co
 * Ex.: "https://abc.supabase.co/rest/v1/", "abc.supabase.co", "abc",
 *      "https://supabase.com/dashboard/project/abc/settings/api", com aspas ou espaços.
 */
export function normalizarSupabaseUrl(bruta?: string | null): string | null {
  if (!bruta) return null;
  const s = bruta.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!s) return null;

  const painel = s.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{15,30})/i);
  if (painel) return `https://${painel[1].toLowerCase()}.supabase.co`;

  const dominio = s.match(/^(?:https?:\/\/)?([a-z0-9-]+)\.supabase\.(co|in)\b/i);
  if (dominio) return `https://${dominio[1].toLowerCase()}.supabase.${dominio[2].toLowerCase()}`;

  if (/^[a-z0-9]{15,30}$/i.test(s)) return `https://${s.toLowerCase()}.supabase.co`;

  // Domínio próprio (custom domain): mantém, só tira o caminho
  const outro = s.match(/^(https:\/\/[a-z0-9.-]+\.[a-z]{2,})(?:\/.*)?$/i);
  return outro ? outro[1].toLowerCase() : null;
}
