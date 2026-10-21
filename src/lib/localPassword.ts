/**
 * Senhas do modo local (sem Supabase). Armazena PBKDF2-SHA256 com sal aleatório em vez do texto da senha.
 * Formato: pbkdf2$<iterações>$<sal base64>$<hash base64>. Valores sem esse prefixo são registros antigos em texto.
 */
const ITERATIONS = 210000;
const PREFIX = 'pbkdf2';

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export function isHashedPassword(stored: string | undefined): boolean {
  return !!stored && stored.startsWith(`${PREFIX}$`);
}

export async function hashLocalPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(await derive(password, salt, ITERATIONS))}`;
}

/** Comparação em tempo constante do hash derivado. Registros antigos em texto são aceitos para migração. */
export async function verifyLocalPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  if (!isHashedPassword(stored)) return stored === password;
  const [, iterations, salt, hash] = stored.split('$');
  const expected = fromBase64(hash);
  const actual = await derive(password, fromBase64(salt), Number(iterations));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
