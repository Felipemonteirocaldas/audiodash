import { db } from '@/db/db';
import { supabase } from './supabase';

class SyncManager {
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
    }
  }

  private async pushToOnlineDatabase(table: string, records: any[]) {
    console.log(`[SyncManager] Pushing ${records.length} records to table '${table}'...`, records);
    
    // Check if we have credentials
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('[SyncManager] Supabase URL or Anon Key not configured. Skipping real push.');
      return false; // Cannot push without credentials
    }

    const { error } = await supabase.from(table).upsert(records);
    
    if (error) {
      console.error(`[SyncManager] Error pushing to '${table}':`, error);
      return false;
    }
    
    console.log(`[SyncManager] Successfully pushed to '${table}'`);
    return true;
  }

  async sync() {
    if (!navigator.onLine) {
      console.log('[SyncManager] Offline, skipping sync.');
      return;
    }

    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    console.log('[SyncManager] Sync started...');
    
    // Dispatch event to update UI
    window.dispatchEvent(new Event('sync-started'));

    try {
      const tables = ['patients', 'audiometries', 'settings'] as const;

      for (const table of tables) {
        // Find all pending records
        const pendingRecords = await db[table].where('syncStatus').equals('pending').toArray();

        if (pendingRecords.length > 0) {
          const success = await this.pushToOnlineDatabase(table, pendingRecords);
          
          if (success) {
            // Update local records to 'synced'
            const ids = pendingRecords.map(r => r.id);
            await db[table].bulkUpdate(
              ids.map(id => ({ key: id, changes: { syncStatus: 'synced' } }))
            );
          }
        }
      }
      console.log('[SyncManager] Sync completed successfully.');
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new Event('sync-completed'));
    }
  }
}

export const syncManager = new SyncManager();
