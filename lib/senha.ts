import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (s: string, salt: Buffer, len: number, o: object) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, LEN = 64;

/** Gera o hash da senha (scrypt + sal aleatório). A senha em texto nunca é gravada. */
export async function gerarHash(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(senha, salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}

export async function conferirHash(senha: string, armazenado: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = armazenado.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const h = await scrypt(senha, Buffer.from(salt, "base64"), esperado.length, { N: +n, r: +r, p: +p });
  return h.length === esperado.length && timingSafeEqual(h, esperado);
}

/** Regras mínimas de senha. Retorna a mensagem de erro, ou null se estiver ok. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (senha.length > 72) return "A senha deve ter no máximo 72 caracteres.";
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return "A senha deve ter letras e números.";
  return null;
}
