// Sessão assinada com HMAC-SHA256 (Web Crypto) — funciona no middleware (Edge) e no servidor.
export const SESSION_COOKIE = "siscof_sessao";
export const SESSION_HORAS = 12;

/** uid = id do usuário; v = versão da sessão (muda ao trocar senha/desativar, derrubando sessões antigas). */
export type Token = { uid: string; v: number; exp: number };

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function chave(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ausente ou muito curto (mínimo 32 caracteres).");
  }
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function criarToken(uid: string, v: number): Promise<string> {
  const t: Token = { uid, v, exp: Date.now() + SESSION_HORAS * 3600_000 };
  const payload = toB64url(enc.encode(JSON.stringify(t)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await chave(), enc.encode(payload)));
  return `${payload}.${toB64url(sig)}`;
}

export async function lerToken(token?: string | null): Promise<Token | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await chave(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const d = JSON.parse(dec.decode(fromB64url(payload))) as Partial<Token>;
    if (typeof d.uid !== "string" || typeof d.v !== "number" || typeof d.exp !== "number" || d.exp < Date.now())
      return null;
    return { uid: d.uid, v: d.v, exp: d.exp };
  } catch {
    return null;
  }
}

/** Compara textos em tempo constante (via hash). */
export async function textoConfere(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const u = new Uint8Array(x), w = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ w[i];
  return diff === 0;
}
