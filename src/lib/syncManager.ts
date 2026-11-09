import { db } from '@/db/db';
import { supabase, isConfigured } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'unconfigured';
export type SyncTable = 'patients' | 'audiometries' | 'settings' | 'appointments' | 'anamneses';

interface PendingDeletion {
  table: SyncTable;
  id: string;
  timestamp: number;
  /** Conta que pediu a exclusão. Itens sem dono são de versões anteriores. */
  user_id?: string;
}

const DELETIONS_STORAGE_KEY = 'audiodash_pending_deletions';
/** Conta dona dos dados guardados neste aparelho. Impede enviar pendências de uma conta para outra. */
export const DATA_OWNER_KEY = 'audiodash_data_owner';
const SYNC_TABLES: SyncTable[] = ['patients', 'audiometries', 'settings', 'appointments', 'anamneses'];

export function getDataOwner(): string | null {
  try { return localStorage.getItem(DATA_OWNER_KEY); } catch { return null; }
}

export function setDataOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(DATA_OWNER_KEY, userId);
    else localStorage.removeItem(DATA_OWNER_KEY);
  } catch { /* armazenamento indisponível */ }
}

/** Verdadeiro quando os dados do aparelho pertencem a outra conta (sem dono registrado = dados antigos, aceitos). */
export function isForeignData(owner: string | null, userId: string): boolean {
  return !!owner && owner !== userId;
}

class SyncManager {
  private isSyncing = false;
  private _status: SyncStatus = 'idle';
  private _lastError: string | null = null;
  private _lastSyncTime: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
    }
  }

  get status() { return this._status; }
  get lastError() { return this._lastError; }
  get lastSyncTime() { return this._lastSyncTime; }

  private setStatus(status: SyncStatus, error?: string) {
    this._status = status;
    this._lastError = error || null;
    window.dispatchEvent(new CustomEvent('sync-status-change', { detail: { status, error } }));
  }

  /**
   * Pending deletions queue in localStorage
   */
  private getPendingDeletions(): PendingDeletion[] {
    try {
      const stored = localStorage.getItem(DELETIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private savePendingDeletions(deletions: PendingDeletion[]): void {
    try {
      localStorage.setItem(DELETIONS_STORAGE_KEY, JSON.stringify(deletions));
    } catch (e) {
      console.error('[SyncManager] Falha ao persistir pendências de exclusão:', e);
    }
  }

  private queueDeletions(items: { table: SyncTable; id: string }[], userId: string | null): void {
    const keys = new Set(items.map(i => `${i.table}:${i.id}`));
    const list = this.getPendingDeletions().filter(d => !keys.has(`${d.table}:${d.id}`));
    const now = Date.now();
    for (const i of items) list.push({ table: i.table, id: i.id, timestamp: now, user_id: userId ?? undefined });
    this.savePendingDeletions(list);
  }

  /** Esvazia a fila de exclusões (logout limpo, sem pendências). */
  clearPendingDeletions(): void {
    this.savePendingDeletions([]);
  }

  private async sessionUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }

  /**
   * Apaga na nuvem e confirma. Com RLS, um delete recusado (ex.: assinatura vencida) volta sem erro e sem linhas;
   * nesse caso confere se o registro ainda existe: se existe, a exclusão NÃO aconteceu.
   */
  private async deleteRemote(table: SyncTable, id: string): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
    if (error) {
      console.warn(`[SyncManager] Erro ao excluir '${id}' de '${table}' na nuvem:`, error.message);
      return false;
    }
    if (data && data.length > 0) return true;
    const { data: still, error: readError } = await supabase.from(table).select('id').eq('id', id).limit(1);
    if (readError) return false;
    return !still || still.length === 0; // nunca chegou à nuvem ou já foi apagado
  }

  /**
   * Flush and synchronize all pending deletions to Supabase
   */
  async syncDeletions(): Promise<void> {
    if (!navigator.onLine || !isConfigured || !supabase) return;

    const deletions = this.getPendingDeletions();
    if (deletions.length === 0) return;

    const userId = await this.sessionUserId();
    if (!userId) return;
    const remaining: PendingDeletion[] = [];

    for (const item of deletions) {
      // Itens de outra conta não são enviados com esta sessão (o RLS recusaria) e não ficam acumulando.
      if (item.user_id && item.user_id !== userId) continue;
      try {
        if (!await this.deleteRemote(item.table, item.id)) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }

    this.savePendingDeletions(remaining);
  }

  /**
   * Apaga registros no aparelho (em uma única transação) e enfileira a exclusão na nuvem.
   * Devolve 'cloud' se a nuvem confirmou todas, 'queued' se alguma ficou pendente.
   */
  async deleteRecords(items: { table: SyncTable; id: string }[]): Promise<'cloud' | 'queued'> {
    if (items.length === 0) return 'cloud';
    const tables = [...new Set(items.map(i => i.table))].map(t => db[t]);
    await db.transaction('rw', tables, async () => {
      for (const i of items) await (db[i.table] as any).delete(i.id);
    });
    const userId = isConfigured ? await this.sessionUserId() : null;
    this.queueDeletions(items, userId);
    await this.syncDeletions();
    const left = new Set(this.getPendingDeletions().map(d => `${d.table}:${d.id}`));
    return items.some(i => left.has(`${i.table}:${i.id}`)) ? 'queued' : 'cloud';
  }

  async deleteRecord(table: SyncTable, id: string): Promise<'cloud' | 'queued'> {
    return this.deleteRecords([{ table, id }]);
  }

  /** Registros ainda não enviados (todas as tabelas) mais exclusões na fila. */
  async countPending(): Promise<number> {
    const counts = await Promise.all(SYNC_TABLES.map(t => db[t].where('syncStatus').equals('pending').count()));
    return counts.reduce((a, b) => a + b, 0) + this.getPendingDeletions().length;
  }

  /**
   * Tests if the Supabase connection is reachable
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!isConfigured || !supabase) {
      return { ok: false, error: 'Supabase não está configurado. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env' };
    }

    try {
      const { error } = await supabase.from('patients').select('id', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') {
          return { ok: false, error: `Tabela 'patients' não encontrada no Supabase. As tabelas precisam ser criadas no painel do Supabase.` };
        }
        return { ok: false, error: `Erro do Supabase: ${error.message} (código: ${error.code})` };
      }

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return { ok: false, error: 'Não foi possível conectar ao Supabase. O projeto pode estar pausado ou a URL está incorreta.' };
      }
      return { ok: false, error: `Erro de conexão: ${message}` };
    }
  }

  /**
   * Push pending records to Supabase
   */
  private async pushToSupabase(table: string, records: any[]): Promise<boolean> {
    if (!supabase) return false;

    const userId = await this.sessionUserId();
    if (!userId) {
      console.error('[SyncManager] Usuário não logado, cancelando push.');
      return false;
    }
    if (isForeignData(getDataOwner(), userId)) {
      throw new Error('Os dados deste aparelho pertencem a outra conta e não foram enviados.');
    }

    const cleanRecords = records.map(record => {
      const { syncStatus, ...cleanRecord } = record;
      return { ...cleanRecord, user_id: userId };
    });

    const { error } = await supabase.from(table).upsert(cleanRecords);

    if (error) {
      console.error(`[SyncManager] Erro ao enviar para '${table}':`, error.message);
      throw new Error(`Erro na tabela ${table}: ${error.message} (Código: ${error.code})`);
    }
    return true;
  }

  /**
   * Marca como enviados só os registros que não mudaram durante o envio: uma edição feita enquanto o upsert
   * estava em andamento tem outro updatedAt e continua 'pending' para o próximo ciclo.
   */
  private async markSynced(table: SyncTable, sent: { id: string; updatedAt?: number }[]): Promise<void> {
    const sentAt = new Map(sent.map(r => [r.id, r.updatedAt]));
    await db.transaction('rw', db[table], async () => {
      await (db[table] as any)
        .where('id').anyOf([...sentAt.keys()])
        .and((row: { id: string; updatedAt?: number; syncStatus: string }) => row.syncStatus === 'pending' && row.updatedAt === sentAt.get(row.id))
        .modify({ syncStatus: 'synced' });
    });
  }

  /**
   * Main sync function — syncs deletions, pushes pending records to Supabase
   */
  async sync(): Promise<void> {
    // Guard: offline
    if (!navigator.onLine) {
      this.setStatus('offline');
      console.log('[SyncManager] Offline — sync ignorado.');
      return;
    }

    // Guard: Supabase not configured
    if (!isConfigured || !supabase) {
      this.setStatus('unconfigured');
      console.warn('[SyncManager] Supabase não configurado — executando em modo offline.');
      return;
    }

    // Guard: already syncing
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.setStatus('syncing');
    window.dispatchEvent(new Event('sync-started'));
    console.log('[SyncManager] Iniciando sincronização...');

    try {
      // 1. Process pending deletions first
      await this.syncDeletions();

      // 2. Push pending creations and updates
      const tables = SYNC_TABLES;
      let totalSynced = 0;
      let hadErrors = false;
      let firstError = '';

      for (const table of tables) {
        const pendingRecords = await db[table].where('syncStatus').equals('pending').toArray();

        if (pendingRecords.length > 0) {
          // Falha de uma tabela não pode impedir o envio das seguintes; os registros dela continuam pendentes.
          const success = await this.pushToSupabase(table, pendingRecords).catch((err: unknown) => {
            firstError ||= err instanceof Error ? err.message : String(err);
            return false;
          });

          if (success) {
            await this.markSynced(table, pendingRecords);
            totalSynced += pendingRecords.length;
          } else {
            hadErrors = true;
          }
        }
      }

      this._lastSyncTime = Date.now();

      if (hadErrors) {
        this.setStatus('error', firstError || 'Alguns registros não puderam ser sincronizados.');
        console.warn(`[SyncManager] Sync parcial: ${totalSynced} enviados, com erros.`);
      } else if (totalSynced === 0) {
        this.setStatus('success');
        console.log('[SyncManager] Nenhum registro pendente para sincronizar.');
      } else {
        this.setStatus('success');
        console.log(`[SyncManager] ✓ Sync completo: ${totalSynced} registros sincronizados.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.setStatus('error', message);
      console.error('[SyncManager] Falha na sincronização:', error);
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new Event('sync-completed'));
    }
  }

  /**
   * Pulls all records for the specified user from Supabase into the local DB.
   * Cleans up locally deleted items and keeps local DB strictly synchronized.
   */
  async pullFromSupabase(userId: string): Promise<boolean> {
    if (!navigator.onLine || !isConfigured || !supabase) return false;
    // Dados de outra conta no aparelho: não misturar. Quem resolve é o AuthContext (cópia ou descarte).
    if (isForeignData(getDataOwner(), userId)) return false;
    setDataOwner(userId);

    this.setStatus('syncing');
    try {
      // 1. First sync any pending deletions to ensure Supabase doesn't return them
      await this.syncDeletions();

      const pendingDeletionIds = new Set(this.getPendingDeletions().map(d => d.id));
      const tables = SYNC_TABLES;

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
        if (error) {
          console.error(`[SyncManager] Erro ao puxar '${table}':`, error.message);
          continue;
        }
        
        if (data) {
          // Filter out any records that are pending deletion locally
          const validRemoteRecords = data.filter(d => !pendingDeletionIds.has(d.id));
          const remoteIds = new Set(validRemoteRecords.map(d => d.id));

          // Reconcile: delete local records that were synced previously but no longer exist in Supabase
          const localSynced = await db[table].where('syncStatus').equals('synced').toArray();
          for (const item of localSynced) {
            if (!remoteIds.has(item.id)) {
              await (db[table] as any).delete(item.id);
            }
          }

          // Insert or update valid remote records into local DB, sem sobrescrever edições locais ainda não enviadas
          const localPendingIds = new Set(await db[table].where('syncStatus').equals('pending').primaryKeys());
          const incoming = validRemoteRecords.filter(d => !localPendingIds.has(d.id));
          if (incoming.length > 0) {
            const localRecords = incoming.map(d => ({ ...d, syncStatus: 'synced' }));
            await (db[table] as any).bulkPut(localRecords);
          }
        }
      }
      this._lastSyncTime = Date.now();
      // O pull não envia nada: o estado final (sincronizado ou erro) vem do envio dos pendentes.
      this.setStatus('idle');
      void this.sync();
      return true;
    } catch (error) {
      console.error('[SyncManager] Erro no pull:', error);
      this.setStatus('error', error instanceof Error ? error.message : 'Erro no pull');
      return false;
    } finally {
      window.dispatchEvent(new Event('sync-completed'));
    }
  }
}

export const syncManager = new SyncManager();
