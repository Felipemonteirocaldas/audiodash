/**
 * Calendar Sync Orchestrator
 * 
 * Central service that manages sync across all connected calendar providers.
 * When appointments are created/updated/deleted in AudioDash,
 * this service automatically propagates changes to Google and Microsoft.
 */

import { Appointment } from '@/db/db';
import {
  isGoogleConnected,
  disconnectGoogleCalendar,
  syncToGoogle,
  updateGoogleEvent,
  deleteGoogleEvent,
} from './googleCalendar';
import {
  isMicrosoftConnected,
  forgetMicrosoftLocally,
  syncToOutlook,
  updateOutlookEvent,
  deleteOutlookEvent,
} from './microsoftCalendar';

// ─── External Event ID Mapping ──────────────────────────────────────────────

// Maps AudioDash appointment IDs → external calendar event IDs
// Stored in localStorage for persistence

const MAPPING_KEY = 'audiodash_calendar_mappings';

interface CalendarMapping {
  googleEventId?: string;
  microsoftEventId?: string;
}

function getMappings(): Record<string, CalendarMapping> {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_KEY) || '{}');
  } catch {
    return {};
  }
}

function setMapping(appointmentId: string, mapping: Partial<CalendarMapping>) {
  const all = getMappings();
  all[appointmentId] = { ...all[appointmentId], ...mapping };
  localStorage.setItem(MAPPING_KEY, JSON.stringify(all));
}

function removeMapping(appointmentId: string) {
  const all = getMappings();
  delete all[appointmentId];
  localStorage.setItem(MAPPING_KEY, JSON.stringify(all));
}

function getMapping(appointmentId: string): CalendarMapping | undefined {
  return getMappings()[appointmentId];
}

/**
 * Logout do AudioDash: desconecta Google e Microsoft neste navegador e apaga o mapeamento.
 * Sem isso, a próxima conta no mesmo computador enviaria agendamentos para o calendário da anterior.
 */
export function forgetCalendarConnections() {
  disconnectGoogleCalendar();
  forgetMicrosoftLocally();
  localStorage.removeItem(MAPPING_KEY);
}

// ─── Sync Operations ────────────────────────────────────────────────────────

export interface SyncResult {
  google: 'synced' | 'failed' | 'skipped';
  microsoft: 'synced' | 'failed' | 'skipped';
}

/**
 * Sync a new appointment to all connected calendars.
 * Call this after creating an appointment in AudioDash.
 */
export async function syncAppointmentCreated(appointment: Appointment): Promise<SyncResult> {
  const result: SyncResult = { google: 'skipped', microsoft: 'skipped' };

  // Google Calendar
  if (isGoogleConnected()) {
    try {
      const googleId = await syncToGoogle(appointment);
      if (googleId) {
        setMapping(appointment.id, { googleEventId: googleId });
        result.google = 'synced';
      } else {
        result.google = 'failed';
      }
    } catch {
      result.google = 'failed';
    }
  }

  // Microsoft Outlook
  if (isMicrosoftConnected()) {
    try {
      const msId = await syncToOutlook(appointment);
      if (msId) {
        setMapping(appointment.id, { microsoftEventId: msId });
        result.microsoft = 'synced';
      } else {
        result.microsoft = 'failed';
      }
    } catch {
      result.microsoft = 'failed';
    }
  }

  return result;
}

/**
 * Sync an appointment update to all connected calendars.
 */
export async function syncAppointmentUpdated(appointment: Appointment): Promise<SyncResult> {
  const result: SyncResult = { google: 'skipped', microsoft: 'skipped' };
  const mapping = getMapping(appointment.id);

  // Google Calendar
  if (isGoogleConnected()) {
    try {
      if (mapping?.googleEventId) {
        const ok = await updateGoogleEvent(mapping.googleEventId, appointment);
        result.google = ok ? 'synced' : 'failed';
      } else {
        // No mapping exists — create as new
        const googleId = await syncToGoogle(appointment);
        if (googleId) {
          setMapping(appointment.id, { googleEventId: googleId });
          result.google = 'synced';
        } else {
          result.google = 'failed';
        }
      }
    } catch {
      result.google = 'failed';
    }
  }

  // Microsoft Outlook
  if (isMicrosoftConnected()) {
    try {
      if (mapping?.microsoftEventId) {
        const ok = await updateOutlookEvent(mapping.microsoftEventId, appointment);
        result.microsoft = ok ? 'synced' : 'failed';
      } else {
        const msId = await syncToOutlook(appointment);
        if (msId) {
          setMapping(appointment.id, { microsoftEventId: msId });
          result.microsoft = 'synced';
        } else {
          result.microsoft = 'failed';
        }
      }
    } catch {
      result.microsoft = 'failed';
    }
  }

  return result;
}

/**
 * Sync an appointment deletion to all connected calendars.
 */
export async function syncAppointmentDeleted(appointmentId: string): Promise<SyncResult> {
  const result: SyncResult = { google: 'skipped', microsoft: 'skipped' };
  const mapping = getMapping(appointmentId);

  if (!mapping) return result;

  // Google Calendar
  if (isGoogleConnected() && mapping.googleEventId) {
    try {
      const ok = await deleteGoogleEvent(mapping.googleEventId);
      result.google = ok ? 'synced' : 'failed';
    } catch {
      result.google = 'failed';
    }
  }

  // Microsoft Outlook
  if (isMicrosoftConnected() && mapping.microsoftEventId) {
    try {
      const ok = await deleteOutlookEvent(mapping.microsoftEventId);
      result.microsoft = ok ? 'synced' : 'failed';
    } catch {
      result.microsoft = 'failed';
    }
  }

  // Só esquece o vínculo se nada falhou; com falha, o evento ainda existe lá fora e pode ser removido depois.
  if (result.google !== 'failed' && result.microsoft !== 'failed') removeMapping(appointmentId);
  return result;
}

/**
 * Check if any calendar provider is connected.
 */
export function hasAnyCalendarConnected(): boolean {
  return isGoogleConnected() || isMicrosoftConnected();
}
