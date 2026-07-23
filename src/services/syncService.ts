import { db } from '../db/db';
import { supabase } from '../lib/supabase';

export const syncDataToSupabase = async () => {
  if (!navigator.onLine) {
    console.log('Offline. Synchronization skipped.');
    return;
  }

  try {
    // 1. Sync Patients
    const pendingPatients = await db.patients.where('syncStatus').equals('pending').toArray();
    if (pendingPatients.length > 0) {
      const { error } = await supabase.from('patients').upsert(
        pendingPatients.map(p => ({ ...p, syncStatus: undefined }))
      );
      if (!error) {
        await db.patients.bulkPut(
          pendingPatients.map(p => ({ ...p, syncStatus: 'synced' }))
        );
        console.log(`Synced ${pendingPatients.length} patients.`);
      } else {
        console.error('Error syncing patients:', error);
      }
    }

    // 2. Sync Audiometries
    const pendingAudiometries = await db.audiometries.where('syncStatus').equals('pending').toArray();
    if (pendingAudiometries.length > 0) {
      const { error } = await supabase.from('audiometries').upsert(
        pendingAudiometries.map(a => ({ ...a, syncStatus: undefined }))
      );
      if (!error) {
        await db.audiometries.bulkPut(
          pendingAudiometries.map(a => ({ ...a, syncStatus: 'synced' }))
        );
        console.log(`Synced ${pendingAudiometries.length} audiometries.`);
      } else {
        console.error('Error syncing audiometries:', error);
      }
    }

    // 3. Sync Settings
    const pendingSettings = await db.settings.where('syncStatus').equals('pending').toArray();
    if (pendingSettings.length > 0) {
      const { error } = await supabase.from('settings').upsert(
        pendingSettings.map(s => ({ ...s, syncStatus: undefined }))
      );
      if (!error) {
        await db.settings.bulkPut(
          pendingSettings.map(s => ({ ...s, syncStatus: 'synced' }))
        );
        console.log(`Synced ${pendingSettings.length} settings.`);
      } else {
        console.error('Error syncing settings:', error);
      }
    }
  } catch (err) {
    console.error('Unexpected error during sync:', err);
  }
};

// Listener para sincronizar assim que a conexão voltar
window.addEventListener('online', syncDataToSupabase);
