/** Validação e máscaras dos campos cadastrais de Configurações (formato brasileiro). Campos vazios são sempre válidos. */

export const UF_LIST = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;

export const onlyDigits = (value: string | undefined | null): string => (value || '').replace(/\D/g, '');

/** Dígitos do telefone sem o código do país: "+55 11 98765-4321" vira "11987654321". */
export function nationalPhoneDigits(value: string | undefined | null): string {
  const d = onlyDigits(value);
  return d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
}

function checkDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const n = d.split('').map(Number);
  return checkDigit(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === n[9] && checkDigit(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === n[10];
}

export function isValidCNPJ(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const n = d.split('').map(Number);
  return checkDigit(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === n[12] && checkDigit(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === n[13];
}

export const isValidCEP = (value: string): boolean => onlyDigits(value).length === 8;
export const isValidUF = (value: string): boolean => (UF_LIST as readonly string[]).includes(value.trim().toUpperCase());
export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
/** Telefone com DDD: 10 dígitos (fixo) ou 11 (celular). */
export const isValidPhone = (value: string): boolean => [10, 11].includes(nationalPhoneDigits(value).length);
/** Perfil do Instagram: arroba opcional, letras, números, ponto e sublinhado (até 30 caracteres). */
/** Site com ou sem http(s)://; outros esquemas (como javascript:) são recusados. */
export const isValidWebsite = (value: string): boolean => /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:\d+)?(\/\S*)?$/.test(value.trim());
export const isValidInstagram = (value: string): boolean => /^@?[A-Za-z0-9._]{1,30}$/.test(value.trim());

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function formatPhone(value: string): string {
  const d = nationalPhoneDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const split = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}

export type SettingsFields = Partial<Record<'cpf' | 'cnpj' | 'zipCode' | 'state' | 'email' | 'phone' | 'website' | 'instagram', string>>;

/** Mensagens de erro por campo; só campos preenchidos e inválidos aparecem. */
export function validateSettings(settings: SettingsFields): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (key: keyof SettingsFields, valid: (v: string) => boolean, message: string) => {
    const value = (settings[key] || '').trim();
    if (value && !valid(value)) errors[key] = message;
  };
  check('cpf', isValidCPF, 'CPF inválido. Confira os 11 dígitos.');
  check('cnpj', isValidCNPJ, 'CNPJ inválido. Confira os 14 dígitos.');
  check('zipCode', isValidCEP, 'CEP deve ter 8 dígitos.');
  check('state', isValidUF, 'Use a sigla de um estado, por exemplo SP.');
  check('email', isValidEmail, 'E-mail inválido.');
  check('phone', isValidPhone, 'Informe o DDD e o número (10 ou 11 dígitos).');
  check('website', isValidWebsite, 'Informe um endereço válido, por exemplo www.clinica.com.br.');
  check('instagram', isValidInstagram, 'Use só letras, números, ponto e sublinhado, por exemplo @suaclinica.');
  return errors;
}
