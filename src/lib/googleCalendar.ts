/**
 * Google Calendar OAuth + API Integration
 * 
 * Uses Google Identity Services (GIS) for authentication
 * and Google Calendar REST API for event CRUD.
 * 
 * Requires: VITE_GOOGLE_CLIENT_ID in .env
 */

import { Appointment } from '@/db/db';
import { externalEventTitle, EXTERNAL_EVENT_DESCRIPTION } from './calendarIntegration';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TOKEN_KEY = 'audiodash_google_token';
const CONNECTED_KEY = 'audiodash_google_connected';

// ─── Token Management ───────────────────────────────────────────────────────

interface StoredToken {
  access_token: string;
  expires_at: number;
}

function getStoredToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as StoredToken;
    // Check if expired (with 5 min buffer)
    if (Date.now() > token.expires_at - 300000) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function storeToken(access_token: string, expires_in: number) {
  const token: StoredToken = {
    access_token,
    expires_at: Date.now() + expires_in * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  localStorage.setItem(CONNECTED_KEY, 'true');
}

// ─── GIS Script Loader ─────────────────────────────────────────────────────

let gisLoaded = false;
let gisLoadPromise: Promise<void> | null = null;

function loadGISScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      gisLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

// ─── OAuth Flow ─────────────────────────────────────────────────────────────

export async function connectGoogleCalendar(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID não configurado no .env');
  }

  await loadGISScript();

  return new Promise((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        storeToken(response.access_token, response.expires_in);
        resolve(response.access_token);
      },
      error_callback: (error: any) => {
        reject(new Error(error.message || 'Erro na autenticação Google'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function disconnectGoogleCalendar() {
  const token = getStoredToken();
  if (token) {
    // Revoke token
    fetch(`https://oauth2.googleapis.com/revoke?token=${token.access_token}`, {
      method: 'POST',
    }).catch(() => {});
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONNECTED_KEY);
}

export function isGoogleConnected(): boolean {
  return localStorage.getItem(CONNECTED_KEY) === 'true' && getStoredToken() !== null;
}

export function isGoogleConfigured(): boolean {
  return !!CLIENT_ID;
}

// ─── Re-auth if token expired ───────────────────────────────────────────────

async function getValidToken(): Promise<string | null> {
  const stored = getStoredToken();
  if (stored) return stored.access_token;

  // Token expired — try silent re-auth
  if (!CLIENT_ID || !localStorage.getItem(CONNECTED_KEY)) return null;

  try {
    const token = await connectGoogleCalendar();
    return token;
  } catch {
    // If re-auth fails, mark as disconnected
    localStorage.removeItem(CONNECTED_KEY);
    return null;
  }
}

// ─── Calendar API Calls ─────────────────────────────────────────────────────

function appointmentToGoogleEvent(appointment: Appointment) {
  const endTime = (() => {
    const [h, m] = appointment.time.split(':').map(Number);
    return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  return {
    summary: externalEventTitle(appointment),
    description: EXTERNAL_EVENT_DESCRIPTION,
    start: {
      dateTime: `${appointment.date}T${appointment.time}:00`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: `${appointment.date}T${endTime}:00`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
      ],
    },
    extendedProperties: {
      private: {
        audiodash_id: appointment.id,
      },
    },
  };
}

/**
 * Create an event in Google Calendar.
 * Returns the Google event ID or null if not connected.
 */
export async function syncToGoogle(appointment: Appointment): Promise<string | null> {
  const token = await getValidToken();
  if (!token) return null;

  try {
    const event = appointmentToGoogleEvent(appointment);
    const response = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[Google Calendar] Create event failed:', error);
      return null;
    }

    const data = await response.json();
    console.log('[Google Calendar] Event created:', data.id);
    return data.id;
  } catch (error) {
    console.error('[Google Calendar] Sync error:', error);
    return null;
  }
}

/**
 * Update an existing event in Google Calendar.
 */
export async function updateGoogleEvent(
  googleEventId: string,
  appointment: Appointment
): Promise<boolean> {
  const token = await getValidToken();
  if (!token) return false;

  try {
    const event = appointmentToGoogleEvent(appointment);
    const response = await fetch(
      `${CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete an event from Google Calendar.
 */
export async function deleteGoogleEvent(googleEventId: string): Promise<boolean> {
  const token = await getValidToken();
  if (!token) return false;

  try {
    const response = await fetch(
      `${CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.ok || response.status === 404; // 404 = already deleted
  } catch {
    return false;
  }
}

/**
 * Fetch events from Google Calendar for a date range.
 * Used to import events into AudioDash.
 */
export async function fetchGoogleEvents(
  startDate: string,
  endDate: string
): Promise<any[] | null> {
  const token = await getValidToken();
  if (!token) return null;

  try {
    const timeMin = `${startDate}T00:00:00Z`;
    const timeMax = `${endDate}T23:59:59Z`;

    const response = await fetch(
      `${CALENDAR_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.items || [];
  } catch {
    return null;
  }
}
