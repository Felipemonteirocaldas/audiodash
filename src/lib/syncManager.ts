import { db } from '@/db/db';
import { supabase, isConfigured } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'unconfigured';

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
   * Tests if the Supabase connection is reachable
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!isConfigured || !supabase) {
      return { ok: false, error: 'Supabase não está configurado. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env' };
    }

    try {
      // Try a lightweight query to test the connection
      const { error } = await supabase.from('patients').select('id', { count: 'exact', head: true });
      
      if (error) {
        // 42P01 = relation does not exist (table not created yet)
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

    // Remove campos exclusivos do banco local (IndexedDB) antes de enviar para nuvem
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
   * Main sync function — pushes all pending local records to Supabase
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
      const tables = ['patients', 'audiometries', 'settings', 'appointments', 'anamneses'] as const;
      let totalSynced = 0;
      let hadErrors = false;

      for (const table of tables) {
        const pendingRecords = await db[table].where('syncStatus').equals('pending').toArray();

        if (pendingRecords.length > 0) {
          const success = await this.pushToSupabase(table, pendingRecords);
          
          if (success) {
            // Mark records as synced locally
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
        // we'll only reach here if pushToSupabase returned false instead of throwing
        this.setStatus('error', 'Alguns registros não puderam ser sincronizados.');
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
   * This is typically called right after login.
   */
  async pullFromSupabase(userId: string): Promise<boolean> {
    if (!navigator.onLine || !isConfigured || !supabase) return false;
    
    this.setStatus('syncing');
    try {
      const tables = ['patients', 'audiometries', 'settings', 'appointments', 'anamneses'] as const;
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
        if (error) {
          console.error(`[SyncManager] Erro ao puxar '${table}':`, error.message);
          continue; // Skip this table but try others
        }
        
        if (data && data.length > 0) {
          const localRecords = data.map(d => ({ ...d, syncStatus: 'synced' }));
          await (db[table] as any).bulkPut(localRecords);
        }
      }
      this._lastSyncTime = Date.now();
      this.setStatus('success');
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
