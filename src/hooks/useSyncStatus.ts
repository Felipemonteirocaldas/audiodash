import { useState, useEffect } from 'react';
import { syncManager, type SyncStatus } from '@/lib/syncManager';

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(syncManager.lastError);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncManager.sync();
    };
    const handleOffline = () => setIsOnline(false);
    
    const handleSyncStatusChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncStatus(detail.status);
      setLastError(syncManager.lastError);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-status-change', handleSyncStatusChange);

    if (navigator.onLine) {
      syncManager.sync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-status-change', handleSyncStatusChange);
    };
  }, []);

  return { isOnline, syncStatus, lastError };
}
