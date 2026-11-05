import { db } from '@/db/db';
import { supabase, isConfigured } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'unconfigured';
export type SyncTable = 'patients' | 'audiometries' | 'settings' | 'appointments' | 'anamneses';

interface PendingDeletion {
  table: SyncTable;
  id: string;
  timestamp: number;
}

const DELETIONS_STORAGE_KEY = 'audiodash_pending_deletions';

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

  private addPendingDeletion(table: SyncTable, id: string): void {
    const list = this.getPendingDeletions().filter(d => !(d.table === table && d.id === id));
    list.push({ table, id, timestamp: Date.now() });
    this.savePendingDeletions(list);
  }

  private removePendingDeletion(table: SyncTable, id: string): void {
    const list = this.getPendingDeletions().filter(d => !(d.table === table && d.id === id));
    this.savePendingDeletions(list);
  }

  /**
   * Flush and synchronize all pending deletions to Supabase
   */
  async syncDeletions(): Promise<void> {
    if (!navigator.onLine || !isConfigured || !supabase) return;

    const deletions = this.getPendingDeletions();
    if (deletions.length === 0) return;

    console.log(`[SyncManager] Processando ${deletions.length} exclusões pendentes...`);
    const remaining: PendingDeletion[] = [];

    for (const item of deletions) {
      try {
        const { error } = await supabase.from(item.table).delete().eq('id', item.id);
        if (error) {
          console.warn(`[SyncManager] Erro ao deletar '${item.id}' de '${item.table}' no Supabase:`, error.message);
          remaining.push(item);
        } else {
          console.log(`[SyncManager] ✓ Registro '${item.id}' excluído de '${item.table}' na nuvem.`);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    this.savePendingDeletions(remaining);
  }

  /**
   * Delete a record locally in IndexedDB and in Supabase
   */
  async deleteRecord(table: SyncTable, id: string): Promise<boolean> {
    // 1. Delete immediately from local IndexedDB
    try {
      await (db[table] as any).delete(id);
    } catch (localErr) {
      console.error(`[SyncManager] Erro ao deletar localmente de '${table}':`, localErr);
    }

    // 2. Mark as pending deletion
    this.addPendingDeletion(table, id);

    // 3. If online and Supabase is configured, delete directly from cloud
    if (navigator.onLine && isConfigured && supabase) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
          this.removePendingDeletion(table, id);
          console.log(`[SyncManager] ✓ '${id}' excluído com sucesso da nuvem ('${table}').`);
          return true;
        } else {
          console.warn(`[SyncManager] Erro ao deletar na nuvem, mantido na fila offline:`, error.message);
        }
      } catch (cloudErr) {
        console.warn(`[SyncManager] Exceção ao deletar na nuvem:`, cloudErr);
      }
    }

    return true;
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

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.error('[SyncManager] Usuário não logado, cancelando push.');
      return false;
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
    
    console.log(`[SyncManager] ✓ ${records.length} registros enviados para '${table}'`);
    return true;
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
      const tables: SyncTable[] = ['patients', 'audiometries', 'settings', 'appointments', 'anamneses'];
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
            const ids = pendingRecords.map(r => r.id);
            await Promise.all(
              ids.map(id => db[table].update(id, { syncStatus: 'synced' }))
            );
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
    
    this.setStatus('syncing');
    try {
      // 1. First sync any pending deletions to ensure Supabase doesn't return them
      await this.syncDeletions();

      const pendingDeletionIds = new Set(this.getPendingDeletions().map(d => d.id));
      const tables: SyncTable[] = ['patients', 'audiometries', 'settings', 'appointments', 'anamneses'];
      
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
