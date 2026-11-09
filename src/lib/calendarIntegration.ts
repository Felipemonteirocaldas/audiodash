import { Appointment } from '@/db/db';

/**
 * Calendar Integration Utilities
 * Generates .ics files, Google Calendar URLs, and Outlook URLs
 */

// ─── Dados enviados a calendários de terceiros ──────────────────────────────

/**
 * Título para Google/Outlook: tipo do atendimento e só as iniciais do paciente. Nome completo e observações
 * clínicas não saem do sistema (LGPD, minimização de dado de saúde enviado a terceiro).
 */
export function externalEventTitle(appointment: Pick<Appointment, 'type' | 'patientName'>): string {
  const initials = (appointment.patientName || '')
    .split(/\s+/).filter(Boolean).map(part => `${part[0].toUpperCase()}.`).join('');
  return initials ? `${appointment.type} — ${initials}` : appointment.type;
}

export const EXTERNAL_EVENT_DESCRIPTION = 'Agendamento AudioDash. Detalhes do atendimento ficam no sistema.';

// ─── ICS File Generation ────────────────────────────────────────────────────

function formatICSDate(dateStr: string, timeStr: string): string {
  // Convert "2026-08-04" + "08:30" → "20260804T083000"
  const clean = dateStr.replace(/-/g, '');
  const time = timeStr.replace(/:/g, '') + '00';
  return `${clean}T${time}`;
}

function addOneHour(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const newH = Math.min(h + 1, 23);
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n');
}

export function generateICSContent(appointment: Appointment): string {
  const dtStart = formatICSDate(appointment.date, appointment.time);
  const dtEnd = formatICSDate(appointment.date, addOneHour(appointment.time));
  const uid = `${appointment.id}@audiodash`;
  const summary = escapeICS(`${appointment.type} - ${appointment.patientName}`);
  const description = appointment.notes ? escapeICS(appointment.notes) : '';
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AudioDash//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    `STATUS:${appointment.status === 'canceled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete AudioDash',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function generateMultiICS(appointments: Appointment[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const events = appointments.map((app) => {
    const dtStart = formatICSDate(app.date, app.time);
    const dtEnd = formatICSDate(app.date, addOneHour(app.time));
    const summary = escapeICS(`${app.type} - ${app.patientName}`);
    const description = app.notes ? escapeICS(app.notes) : '';
    
    return [
      'BEGIN:VEVENT',
      `UID:${app.id}@audiodash`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      `STATUS:${app.status === 'canceled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete AudioDash',
      'END:VALARM',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AudioDash//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─── Download .ics ──────────────────────────────────────────────────────────

export function downloadICS(appointment: Appointment) {
  const content = generateICSContent(appointment);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audiodash-${appointment.patientName.replace(/\s+/g, '_')}-${appointment.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMultiICS(appointments: Appointment[], label: string) {
  const content = generateMultiICS(appointments);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audiodash-agenda-${label}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Google Calendar URL ────────────────────────────────────────────────────

export function generateGoogleCalendarURL(appointment: Appointment): string {
  const dtStart = formatICSDate(appointment.date, appointment.time);
  const dtEnd = formatICSDate(appointment.date, addOneHour(appointment.time));
  const title = encodeURIComponent(externalEventTitle(appointment));
  const details = encodeURIComponent(EXTERNAL_EVENT_DESCRIPTION);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&sf=true&output=xml`;
}

// ─── Microsoft Outlook URL ──────────────────────────────────────────────────

export function generateOutlookURL(appointment: Appointment): string {
  const startDate = `${appointment.date}T${appointment.time}:00`;
  const endTime = addOneHour(appointment.time);
  const endDate = `${appointment.date}T${endTime}:00`;
  const subject = encodeURIComponent(externalEventTitle(appointment));
  const body = encodeURIComponent(EXTERNAL_EVENT_DESCRIPTION);

  return `https://outlook.live.com/calendar/0/action/compose?subject=${subject}&startdt=${startDate}&enddt=${endDate}&body=${body}`;
}

// ─── Type Colors ────────────────────────────────────────────────────────────

export type AppointmentColor = {
  bg: string;
  bgLight: string;
  border: string;
  text: string;
  dot: string;
};

const typeColors: Record<string, AppointmentColor> = {
  'Audiometria Ocupacional': {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  'Audiometria Clínica': {
    bg: 'bg-violet-500',
    bgLight: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
  },
  'Retorno PCA': {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
};

const defaultColor: AppointmentColor = {
  bg: 'bg-slate-500',
  bgLight: 'bg-slate-50',
  border: 'border-slate-200',
  text: 'text-slate-700',
  dot: 'bg-slate-500',
};

export function getAppointmentColor(type: string): AppointmentColor {
  return typeColors[type] || defaultColor;
}
