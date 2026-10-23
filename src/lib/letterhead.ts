import { formatCEP, formatCNPJ, onlyDigits } from '@/lib/settingsValidation';

/** Dados cadastrais usados no cabeçalho do laudo. Site e Instagram ficam só no cadastro, de propósito. */
export interface LetterheadSettings {
  corporateName?: string;
  cnpj?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
}

const clean = (value: string | undefined | null) => (value || '').trim();

/**
 * Linhas institucionais do cabeçalho do laudo, sem linhas vazias:
 * identificação legal ("razão social • CNPJ"), endereço completo e contato.
 */
export function letterheadLines(settings: LetterheadSettings | null | undefined): { legal: string; address: string; contact: string } {
  const s = settings || {};
  const cnpjDigits = onlyDigits(s.cnpj);
  const cnpj = cnpjDigits ? `CNPJ ${cnpjDigits.length === 14 ? formatCNPJ(cnpjDigits) : clean(s.cnpj)}` : '';
  const zipDigits = onlyDigits(s.zipCode);
  const cep = zipDigits ? `CEP ${zipDigits.length === 8 ? formatCEP(zipDigits) : clean(s.zipCode)}` : '';
  const cityState = [clean(s.city), clean(s.state).toUpperCase()].filter(Boolean).join('/');
  return {
    legal: [clean(s.corporateName), cnpj].filter(Boolean).join(' • '),
    address: [clean(s.address), clean(s.neighborhood), cityState, cep].filter(Boolean).join(', '),
    contact: [clean(s.phone), clean(s.email)].filter(Boolean).join(' | ')
  };
}
