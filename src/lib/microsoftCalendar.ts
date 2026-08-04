/**
 * Microsoft Outlook Calendar Integration
 * 
 * Uses MSAL.js (Microsoft Authentication Library) for OAuth
 * and Microsoft Graph API for calendar event CRUD.
 * 
 * Requires: VITE_MICROSOFT_CLIENT_ID in .env
 */

import { Appointment } from '@/db/db';

const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
const SCOPES = ['Calendars.ReadWrite'];
const GRAPH_API = 'https://graph.microsoft.com/v1.0';
const TOKEN_KEY = 'audiodash_microsoft_token';
const CONNECTED_KEY = 'audiodash_microsoft_connected';

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

// ─── MSAL Instance ──────────────────────────────────────────────────────────

let msalInstance: any = null;
let msalLoadPromise: Promise<any> | null = null;

async function getMsalInstance(): Promise<any> {
  if (msalInstance) return msalInstance;
  if (msalLoadPromise) return msalLoadPromise;

  msalLoadPromise = (async () => {
    // Dynamic import to avoid bundling if not used
    const msal = await import('@azure/msal-browser');

    const config = {
      auth: {
        clientId: CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage' as const,
        storeAuthStateInCookie: false,
      },
    };

    msalInstance = new msal.PublicClientApplication(config);
    await msalInstance.initialize();
    return msalInstance;
  })();

  return msalLoadPromise;
}

// ─── OAuth Flow ─────────────────────────────────────────────────────────────

export async function connectMicrosoftCalendar(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error('VITE_MICROSOFT_CLIENT_ID não configurado no .env');
  }

  const instance = await getMsalInstance();

  try {
    const loginResponse = await instance.loginPopup({
      scopes: SCOPES,
      prompt: 'select_account',
    });

    // Get token with calendar scope
    const tokenResponse = await instance.acquireTokenSilent({
      scopes: SCOPES,
      account: loginResponse.account,
    });

    storeToken(tokenResponse.accessToken, 3600);
    return tokenResponse.accessToken;
  } catch (error: any) {
    // If silent fails, try popup
    if (error.name === 'InteractionRequiredAuthError') {
      const tokenResponse = await instance.acquireTokenPopup({
        scopes: SCOPES,
      });
      storeToken(tokenResponse.accessToken, 3600);
      return tokenResponse.accessToken;
    }
    throw error;
  }
}

export async function disconnectMicrosoftCalendar() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONNECTED_KEY);

  try {
    const instance = await getMsalInstance();
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      await instance.logoutPopup({
        account: accounts[0],
        postLogoutRedirectUri: window.location.origin,
      });
    }
  } catch {
    // Silent fail on logout
  }
}

export function isMicrosoftConnected(): boolean {
  return localStorage.getItem(CONNECTED_KEY) === 'true' && getStoredToken() !== null;
}

export function isMicrosoftConfigured(): boolean {
  return !!CLIENT_ID;
}

// ─── Re-auth ────────────────────────────────────────────────────────────────

async function getValidToken(): Promise<string | null> {
  const stored = getStoredToken();
  if (stored) return stored.access_token;

  if (!CLIENT_ID || !localStorage.getItem(CONNECTED_KEY)) return null;

  try {
    const instance = await getMsalInstance();
    const accounts = instance.getAllAccounts();
    if (accounts.length === 0) {
      localStorage.removeItem(CONNECTED_KEY);
      return null;
    }

    const tokenResponse = await instance.acquireTokenSilent({
      scopes: SCOPES,
      account: accounts[0],
    });

    storeToken(tokenResponse.accessToken, 3600);
    return tokenResponse.accessToken;
  } catch {
    localStorage.removeItem(CONNECTED_KEY);
    return null;
  }
}

// ─── Graph API Calls ────────────────────────────────────────────────────────

function appointmentToOutlookEvent(appointment: Appointment) {
  const endTime = (() => {
    const [h, m] = appointment.time.split(':').map(Number);
    return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    subject: `${appointment.type} - ${appointment.patientName}`,
    body: {
      contentType: 'Text',
      content: appointment.notes || `Agendamento AudioDash\nTipo: ${appointment.type}`,
    },
    start: {
      dateTime: `${appointment.date}T${appointment.time}:00`,
      timeZone: tz,
    },
    end: {
      dateTime: `${appointment.date}T${endTime}:00`,
      timeZone: tz,
    },
    isReminderOn: true,
    reminderMinutesBeforeStart: 30,
    singleValueExtendedProperties: [
      {
        id: 'String {66f5a359-4659-4830-9070-00047ec6ac6e} Name audiodash_id',
        value: appointment.id,
      },
    ],
  };
}

/**
 * Create an event in Outlook Calendar.
 * Returns the Outlook event ID or null.
 */
export async function syncToOutlook(appointment: Appointment): Promise<string | null> {
  const token = await getValidToken();
  if (!token) return null;

  try {
    const event = appointmentToOutlookEvent(appointment);
    const response = await fetch(`${GRAPH_API}/me/calendar/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('[Microsoft Calendar] Create failed:', await response.text());
      return null;
    }

    const data = await response.json();
    console.log('[Microsoft Calendar] Event created:', data.id);
    return data.id;
  } catch (error) {
    console.error('[Microsoft Calendar] Sync error:', error);
    return null;
  }
}

/**
 * Update an existing Outlook event.
 */
export async function updateOutlookEvent(
  outlookEventId: string,
  appointment: Appointment
): Promise<boolean> {
  const token = await getValidToken();
  if (!token) return false;

  try {
    const event = appointmentToOutlookEvent(appointment);
    const response = await fetch(
      `${GRAPH_API}/me/calendar/events/${outlookEventId}`,
      {
        method: 'PATCH',
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
 * Delete an Outlook event.
 */
export async function deleteOutlookEvent(outlookEventId: string): Promise<boolean> {
  const token = await getValidToken();
  if (!token) return false;

  try {
    const response = await fetch(
      `${GRAPH_API}/me/calendar/events/${outlookEventId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}
