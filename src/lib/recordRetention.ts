/**
 * [DOC-02] Guarda do prontuário — Resolução CFFa 777/2025, art. 8º, b: prontuário eletrônico de guarda permanente,
 * com eliminação possível após 20 anos do último registro. Antes disso, o paciente é arquivado (oculto das listas,
 * registros preservados e sincronizados), nunca apagado.
 */
export const RETENTION_YEARS = 20;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Data (AAAA-MM-DD) do último registro clínico: exames, anamneses e o cadastro do paciente. */
export function lastRecordDate(dates: Array<string | undefined | null>): string | null {
  const valid = dates.filter((d): d is string => !!d && DATE.test(d)).sort();
  return valid.length ? valid[valid.length - 1] : null;
}

/** Primeira data em que a eliminação passa a ser possível (mesmo dia/mês, 20 anos depois; 29/02 → 01/03). */
export function eliminationAvailableFrom(lastDate: string): string {
  const [y, m, d] = lastDate.split('-').map(Number);
  const date = new Date(Date.UTC(y + RETENTION_YEARS, m - 1, d));
  return date.toISOString().slice(0, 10);
}

export function permanentDeletionStatus(lastDate: string | null, today: string): { allowed: boolean; availableFrom: string | null; reason: string } {
  if (!lastDate) return { allowed: false, availableFrom: null, reason: 'Data do último registro indisponível: o paciente só pode ser arquivado.' };
  const availableFrom = eliminationAvailableFrom(lastDate);
  const allowed = today >= availableFrom;
  const show = (iso: string) => iso.split('-').reverse().join('/');
  return {
    allowed,
    availableFrom,
    reason: allowed
      ? `Último registro em ${show(lastDate)}: prazo mínimo de ${RETENTION_YEARS} anos cumprido (Res. CFFa 777/2025, art. 8º). A eliminação definitiva é permitida.`
      : `Último registro em ${show(lastDate)}. O prontuário eletrônico deve ser guardado e só pode ser eliminado a partir de ${show(availableFrom)} (Res. CFFa 777/2025, art. 8º). Até lá, o paciente pode apenas ser arquivado.`
  };
}

/** Converte timestamp (ms) em data local AAAA-MM-DD. */
export function timestampToLocalDate(ms: number | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
