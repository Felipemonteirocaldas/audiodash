import { db } from '@/db/db';
import { localDate } from '@/lib/examIntegrity';

/**
 * Cópia completa dos dados locais (pacientes, exames, anamneses, agenda e configurações) em JSON.
 * Usada em Configurações e na tela de planos: a guarda do prontuário é do profissional (Res. CFFa 777/2025,
 * arts. 7º e 8º), inclusive quando a assinatura expira.
 */

export const BACKUP_TABLES = ['patients', 'audiometries', 'settings', 'appointments', 'anamneses'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupCounts = Record<BackupTable, number>;
export type BackupRows = Record<BackupTable, any[]>;

export const BACKUP_TABLE_LABELS: Record<BackupTable, string> = {
  patients: 'pacientes',
  audiometries: 'exames',
  anamneses: 'anamneses',
  appointments: 'agendamentos',
  settings: 'configurações'
};

const BACKUP_TABLE_SINGULAR: Record<BackupTable, string> = {
  patients: 'paciente',
  audiometries: 'exame',
  anamneses: 'anamnese',
  appointments: 'agendamento',
  settings: 'configuração'
};

/** "1 paciente, 2 exames, 0 agendamentos, 0 anamneses" (sem as configurações, que são sempre uma linha). */
export function describeCounts(counts: BackupCounts): string {
  return (['patients', 'audiometries', 'appointments', 'anamneses'] as const)
    .map(table => `${counts[table]} ${counts[table] === 1 ? BACKUP_TABLE_SINGULAR[table] : BACKUP_TABLE_LABELS[table]}`)
    .join(', ');
}

const LAST_BACKUP_KEY = 'audiodash:lastBackupAt';

export function getLastBackupAt(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function rememberBackup(at: number) {
  try { localStorage.setItem(LAST_BACKUP_KEY, String(at)); } catch { /* armazenamento indisponível: só não lembra a data */ }
}

export async function countLocalRecords(): Promise<BackupCounts> {
  const [patients, audiometries, settings, appointments, anamneses] = await Promise.all(BACKUP_TABLES.map(table => db[table].count()));
  return { patients, audiometries, settings, appointments, anamneses };
}

/** Baixa a cópia completa e devolve quantos registros ela contém. */
export async function downloadFullBackup(): Promise<BackupCounts> {
  const exportedAt = new Date();
  const data = {
    app: 'AudioDash',
    exportedAt: exportedAt.toISOString(),
    patients: await db.patients.toArray(),
    audiometries: await db.audiometries.toArray(),
    settings: await db.settings.toArray(),
    appointments: await db.appointments.toArray(),
    anamneses: await db.anamneses.toArray()
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audiodash_backup_${localDate(exportedAt)}.json`;
  a.click();
  // Revogar na hora pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  rememberBackup(exportedAt.getTime());
  return { patients: data.patients.length, audiometries: data.audiometries.length, settings: data.settings.length, appointments: data.appointments.length, anamneses: data.anamneses.length };
}

export class BackupError extends Error {}

export interface ParsedBackup {
  rows: BackupRows;
  counts: BackupCounts;
  exportedAt: string | null;
  /** Exames cujo paciente não está no arquivo. Não impede a restauração, mas merece aviso. */
  orphanExams: number;
}

/** Valida o conteúdo de um arquivo de backup antes de qualquer alteração nos dados. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('O arquivo não é um JSON válido.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BackupError('Arquivo de backup inválido.');
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.patients) || !Array.isArray(source.audiometries)) {
    throw new BackupError('Arquivo de backup inválido: faltam as listas de pacientes e exames.');
  }

  const rows = {} as BackupRows;
  for (const table of BACKUP_TABLES) {
    const value = source[table];
    if (value !== undefined && !Array.isArray(value)) throw new BackupError(`Arquivo de backup inválido: "${table}" não é uma lista.`);
    const list = (value as any[] | undefined) || [];
    const ids = new Set<string>();
    list.forEach((row, index) => {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id) {
        throw new BackupError(`Registro sem identificador em ${BACKUP_TABLE_LABELS[table]} (posição ${index + 1}).`);
      }
      if (ids.has(row.id)) throw new BackupError(`Identificador repetido em ${BACKUP_TABLE_LABELS[table]}: ${row.id}.`);
      ids.add(row.id);
    });
    rows[table] = list;
  }

  const patientIds = new Set(rows.patients.map(p => p.id));
  const counts = Object.fromEntries(BACKUP_TABLES.map(table => [table, rows[table].length])) as BackupCounts;
  return {
    rows,
    counts,
    exportedAt: typeof source.exportedAt === 'string' ? source.exportedAt : null,
    orphanExams: rows.audiometries.filter(exam => !patientIds.has(exam.patientId)).length
  };
}

/**
 * Substitui os dados locais pelo conteúdo do backup, em uma única transação (se algo falhar, nada muda).
 * Tudo entra como "pending": registros marcados "synced" seriam apagados na próxima reconciliação com a nuvem
 * (pullFromSupabase remove locais sincronizados que não existem lá).
 */
export async function restoreBackup(rows: BackupRows): Promise<void> {
  const pending = (list: any[]) => list.map(row => ({ ...row, syncStatus: 'pending' as const }));
  await db.transaction('rw', db.patients, db.audiometries, db.settings, db.appointments, db.anamneses, async () => {
    for (const table of BACKUP_TABLES) await db[table].clear();
    for (const table of BACKUP_TABLES) if (rows[table].length) await (db[table] as any).bulkAdd(pending(rows[table]));
  });
}
