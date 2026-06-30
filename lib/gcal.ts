import { format, addDays, parseISO } from 'date-fns';
import { Task } from '@/types/task';

// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string | undefined }) => void };
        };
      };
    };
  }
}

const SCOPES = 'https://www.googleapis.com/auth/calendar';
const STORAGE_KEY = 'gcal_was_connected';
let _accessToken: string | null = null;

export function isGCalConnected(): boolean {
  return _accessToken !== null;
}

export function wasGCalConnected(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
}

export function connectGCal(
  onSuccess: () => void,
  onError: (msg: string) => void,
  silent = false
): void {
  const clientId = process.env.NEXT_PUBLIC_GCAL_CLIENT_ID;
  if (!clientId) {
    onError('NEXT_PUBLIC_GCAL_CLIENT_ID が .env.local に設定されていません');
    return;
  }
  if (!window.google) {
    onError('Google Identity Services が読み込まれていません');
    return;
  }
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: resp => {
      if (resp.access_token) {
        _accessToken = resp.access_token;
        localStorage.setItem(STORAGE_KEY, '1');
        onSuccess();
      } else {
        if (!silent) onError(resp.error ?? '認証に失敗しました');
      }
    },
  });
  tokenClient.requestAccessToken({ prompt: silent ? '' : undefined });
}

export function disconnectGCal(): void {
  _accessToken = null;
  localStorage.removeItem(STORAGE_KEY);
}

interface GCalEvent {
  summary: string;
  description?: string;
  start: { date: string };
  end: { date: string };
}

function taskToEvent(task: Pick<Task, 'title' | 'startDate' | 'endDate' | 'notes'>): GCalEvent {
  return {
    summary: task.title,
    description: task.notes || undefined,
    start: { date: task.startDate },
    // Google Calendar end date is exclusive for all-day events
    end: { date: format(addDays(parseISO(task.endDate), 1), 'yyyy-MM-dd') },
  };
}

export interface GCalCalendar {
  id: string;
  summary: string;
}

export async function listCalendars(): Promise<GCalCalendar[]> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${_accessToken}` } }
  );
  if (!res.ok) throw new Error(`GCal list calendars failed: ${res.status}`);
  const data = await res.json();
  return (data.items as { id: string; summary: string }[]).map(c => ({
    id: c.id,
    summary: c.summary,
  }));
}

export interface GCalEventItem {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

export async function listEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GCalEventItem[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${_accessToken}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GCal list events failed: ${res.status} - ${body}`);
  }
  const data = await res.json();
  return data.items as GCalEventItem[];
}

export async function createGCalEvent(task: Task, calendarId = 'primary'): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${_accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskToEvent(task)),
    }
  );
  if (!res.ok) throw new Error(`GCal create failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

export async function updateGCalEvent(eventId: string, task: Task, calendarId = 'primary'): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${_accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskToEvent(task)),
    }
  );
  if (!res.ok) throw new Error(`GCal update failed: ${res.status}`);
}

export async function deleteGCalEvent(eventId: string, calendarId = 'primary'): Promise<void> {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${_accessToken}` },
    }
  );
}
