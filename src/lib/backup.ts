import { db } from '@/db/db';
import { localDate } from '@/lib/examIntegrity';

/**
 * Cópia completa dos dados locais (pacientes, exames, anamneses, agenda e configurações) em JSON.
 * Usada em Configurações e na tela de planos: a guarda do prontuário é do profissional (Res. CFFa 777/2025,
 * arts. 7º e 8º), inclusive quando a assinatura expira.
 */
export async function downloadFullBackup(): Promise<void> {
  const data = {
    exportedAt: new Date().toISOString(),
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
  a.download = `audiodash_backup_${localDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
