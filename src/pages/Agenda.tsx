import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Appointment } from '@/db/db';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Trash2,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addDays,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isSameMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CalendarSync from '@/components/CalendarSync';
import { getAppointmentColor } from '@/lib/calendarIntegration';
import {
  syncAppointmentCreated,
  syncAppointmentUpdated,
  syncAppointmentDeleted,
} from '@/lib/calendarSyncService';
import { customConfirm } from '@/lib/dialogs';
import { useAuth } from '@/contexts/AuthContext';

// ─── Constants ──────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 → 20:00
const EXAM_TYPES = [
  'Audiometria Ocupacional',
  'Audiometria Clínica',
  'Retorno PCA',
  'Outro',
];

type ViewMode = 'day' | 'week';

// ─── Mini Calendar Component ────────────────────────────────────────────────

function MiniCalendar({
  selectedDate,
  onSelect,
  appointmentDates,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  appointmentDates: Set<string>;
}) {
  const [viewMonth, setViewMonth] = useState(selectedDate);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 0 }
  );

  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-700 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {weeks.map((weekStart, wi) => {
        const days = eachDayOfInterval({
          start: weekStart,
          end: addDays(weekStart, 6),
        });
        return (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {days.map((day, di) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const inMonth = isSameMonth(day, viewMonth);
              const hasAppointments = appointmentDates.has(dateStr);

              return (
                <button
                  key={di}
                  onClick={() => onSelect(day)}
                  className={`
                    relative w-8 h-8 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-center
                    ${!inMonth ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'}
                    ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200' : ''}
                    ${isTodayDate && !isSelected ? 'ring-1.5 ring-indigo-300 text-indigo-600 font-bold' : ''}
                  `}
                >
                  {day.getDate()}
                  {hasAppointments && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Quick nav */}
      <button
        onClick={() => {
          const today = new Date();
          setViewMonth(today);
          onSelect(today);
        }}
        className="w-full mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        Ir para Hoje
      </button>
    </div>
  );
}

// ─── Day Timeline View ──────────────────────────────────────────────────────

function DayTimelineView({
  appointments,
  onStatusChange,
  onDelete,
}: {
  appointments: Appointment[];
  onStatusChange: (id: string, status: 'scheduled' | 'completed' | 'canceled') => void;
  onDelete: (id: string) => void;
}) {


  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Current time indicator */}
      {(() => {
        const now = new Date();
        const currentH = now.getHours();
        if (currentH >= 7 && currentH <= 20) {
          const pos = currentH - 7 + now.getMinutes() / 60;
          return (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${pos * 72 + 12}px` }}
            >
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-200 -ml-1" />
                <div className="flex-1 h-[2px] bg-gradient-to-r from-red-500/80 to-red-500/0" />
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Hour rows */}
      {HOURS.map((hour) => {
        const hourApps = appointments.filter((a) => {
          const [h] = a.time.split(':').map(Number);
          return h === hour;
        });

        return (
          <div
            key={hour}
            className="flex border-b border-slate-50 last:border-b-0 min-h-[72px] group/row hover:bg-slate-50/50 transition-colors"
          >
            {/* Time label */}
            <div className="w-16 sm:w-20 shrink-0 py-3 px-2 sm:px-4 text-right">
              <span className="text-xs font-medium text-slate-400">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>

            {/* Events area */}
            <div className="flex-1 py-1.5 pr-3 flex flex-col gap-1.5 border-l border-slate-100">
              {hourApps.length === 0 && (
                <div className="h-full" />
              )}
              {hourApps.map((app) => {
                const color = getAppointmentColor(app.type);
                const isCanceled = app.status === 'canceled';
                const isCompleted = app.status === 'completed';

                return (
                  <div
                    key={app.id}
                    className={`
                      relative ml-2 p-3 rounded-xl border transition-all duration-200
                      ${color.bgLight} ${color.border}
                      ${isCanceled ? 'opacity-50' : 'hover:shadow-md hover:shadow-slate-100'}
                      group/card
                    `}
                  >
                    {/* Color accent bar */}
                    <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${color.dot}`} />

                    <div className="flex items-start justify-between gap-2 pl-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-semibold text-sm text-slate-800 truncate ${
                              isCanceled ? 'line-through' : ''
                            }`}
                          >
                            {app.patientName}
                          </h4>
                          {isCompleted && (
                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Concluído
                            </span>
                          )}
                          {isCanceled && (
                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                              <XCircle className="w-3 h-3" /> Cancelado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {app.time}
                          </span>
                          <span className={`flex items-center gap-1 ${color.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                            {app.type}
                          </span>
                        </div>

                        {app.notes && (
                          <p className="mt-1.5 text-xs text-slate-400 truncate italic">
                            {app.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100/50">
                        <CalendarSync appointment={app} compact />
                        {!isCompleted && (
                          <button
                            onClick={() => onStatusChange(app.id, 'completed')}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Concluir</span>
                          </button>
                        )}
                        {!isCanceled && (
                          <button
                            onClick={() => onStatusChange(app.id, 'canceled')}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Cancelar</span>
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(app.id)}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  allAppointments,
  selectedDate,
  onSelectDate,
  onStatusChange,
}: {
  weekStart: Date;
  allAppointments: Appointment[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onStatusChange: (id: string, status: 'scheduled' | 'completed' | 'canceled') => void;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {days.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayApps = allAppointments.filter((a) => a.date === dateStr);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={`
                py-3 text-center transition-all duration-150 border-r border-slate-50 last:border-r-0
                ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
              `}
            >
              <div className="text-[10px] font-medium text-slate-400 uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div
                className={`
                  w-8 h-8 mx-auto mt-1 rounded-lg flex items-center justify-center text-sm font-bold
                  ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : ''}
                  ${isTodayDate && !isSelected ? 'ring-1.5 ring-indigo-300 text-indigo-600' : 'text-slate-700'}
                `}
              >
                {day.getDate()}
              </div>
              {dayApps.length > 0 && (
                <div className="mt-1 text-[10px] font-medium text-indigo-500">
                  {dayApps.length} evento{dayApps.length > 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Week content — condensed day list */}
      <div className="divide-y divide-slate-50">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayApps = allAppointments.filter((a) => a.date === dateStr);
          if (dayApps.length === 0) return null;

          return (
            <div key={i} className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  {format(day, 'EEEE', { locale: ptBR })}
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-slate-400">
                  {format(day, 'd MMM', { locale: ptBR })}
                </span>
              </div>
              <div className="space-y-1.5">
                {dayApps
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((app) => {
                    const color = getAppointmentColor(app.type);
                    const isCanceled = app.status === 'canceled';

                    return (
                      <div
                        key={app.id}
                        className={`
                          flex items-center gap-3 p-2.5 rounded-xl border transition-all group/wcard
                          ${color.bgLight} ${color.border}
                          ${isCanceled ? 'opacity-50' : 'hover:shadow-sm'}
                        `}
                      >
                        <div className={`w-1 h-8 rounded-full ${color.dot} shrink-0`} />
                        <span className="text-sm font-mono font-medium text-slate-500 shrink-0">
                          {app.time}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold text-slate-800 truncate block ${isCanceled ? 'line-through' : ''}`}>
                            {app.patientName}
                          </span>
                          <span className={`text-xs ${color.text}`}>{app.type}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/wcard:opacity-100 transition-opacity">
                          <CalendarSync appointment={app} compact />
                          {app.status !== 'completed' && (
                            <button
                              onClick={() => onStatusChange(app.id, 'completed')}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded-md transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {app.status !== 'canceled' && (
                            <button
                              onClick={() => onStatusChange(app.id, 'canceled')}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}

        {/* Empty week */}
        {days.every((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          return !allAppointments.some((a) => a.date === dateStr);
        }) && (
          <div className="p-12 text-center text-slate-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-slate-500">Semana livre</p>
            <p className="text-sm mt-1">Nenhum agendamento nesta semana.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── MAIN AGENDA COMPONENT ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export default function Agenda() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    time: '08:00',
    type: 'Audiometria Ocupacional',
    notes: '',
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.prefillPatient) {
      const { id, name } = location.state.prefillPatient;
      setFormData(prev => ({ ...prev, patientId: id, patientName: name }));
      setShowModal(true);
      
      // Limpar o state para não reabrir o modal
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const patients = useLiveQuery(() => db.patients.toArray(), []);

  // Selected day's appointments
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = useLiveQuery(
    () =>
      db.appointments
        .where('date')
        .equals(selectedDateStr)
        .sortBy('time'),
    [selectedDateStr]
  );

  // Week range for week view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const weekAppointments = useLiveQuery(
    () =>
      db.appointments
        .where('date')
        .between(weekStartStr, weekEndStr, true, true)
        .toArray(),
    [weekStartStr, weekEndStr]
  );

  // All appointment dates for mini calendar dots
  const allAppointments = useLiveQuery(() => db.appointments.toArray(), []);
  const appointmentDates = useMemo(() => {
    const set = new Set<string>();
    allAppointments?.forEach((a) => set.add(a.date));
    return set;
  }, [allAppointments]);

  // Stats for the day
  const dayStats = useMemo(() => {
    if (!dayAppointments) return { total: 0, completed: 0, canceled: 0, scheduled: 0 };
    return {
      total: dayAppointments.length,
      completed: dayAppointments.filter((a) => a.status === 'completed').length,
      canceled: dayAppointments.filter((a) => a.status === 'canceled').length,
      scheduled: dayAppointments.filter((a) => a.status === 'scheduled').length,
    };
  }, [dayAppointments]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const showSyncToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.time || !formData.type) return;

    try {
      const newAppointment: Appointment = {
        id: crypto.randomUUID(),
        date: selectedDateStr,
        patientName: formData.patientName,
        patientId: formData.patientId || undefined,
        time: formData.time,
        type: formData.type,
        status: 'scheduled',
        notes: formData.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending',
        user_id: user?.id,
      };

      await db.appointments.add(newAppointment);
      syncManager.sync();

      // Auto-sync to connected calendars
      const result = await syncAppointmentCreated(newAppointment);
      if (result.google === 'synced' || result.microsoft === 'synced') {
        const providers = [
          result.google === 'synced' ? 'Google' : '',
          result.microsoft === 'synced' ? 'Outlook' : '',
        ].filter(Boolean).join(' e ');
        showSyncToast(`✓ Sincronizado com ${providers}`);
      }

      setShowModal(false);
      setFormData({
        patientName: '',
        patientId: '',
        time: '08:00',
        type: 'Audiometria Ocupacional',
        notes: '',
      });
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
    }
  };

  const updateStatus = async (id: string, status: 'scheduled' | 'completed' | 'canceled') => {
    await db.appointments.update(id, { status, syncStatus: 'pending', updatedAt: Date.now() });
    // Sync status change to external calendars
    const app = await db.appointments.get(id);
    if (app) {
      const result = await syncAppointmentUpdated(app);
      if (result.google === 'synced' || result.microsoft === 'synced') {
        showSyncToast('✓ Status atualizado nos calendários');
      }
    }
  };

  const deleteAppointment = async (id: string) => {
    const proceed = await customConfirm('Tem certeza que deseja excluir este agendamento?');
    if (proceed) {
      // Sync deletion to external calendars first
      await syncAppointmentDeleted(id);
      await db.appointments.delete(id);
      showSyncToast('✓ Removido dos calendários conectados');
    }
  };

  const navigateDay = (dir: number) => {
    setSelectedDate((d) => addDays(d, dir));
  };

  const navigateWeek = (dir: number) => {
    setSelectedDate((d) => (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-12">
      {/* ─── Sync Toast ──────────────────────────────────────────────────── */}
      {syncToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
          {syncToast}
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            Agenda
          </h1>
          <p className="text-slate-500 mt-1 capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewMode === 'day'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewMode === 'week'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Semana
            </button>
          </div>

          {/* Calendar Sync (bulk export) */}
          <CalendarSync
            appointments={viewMode === 'day' ? dayAppointments || [] : weekAppointments || []}
            exportLabel={viewMode === 'day' ? selectedDateStr : `semana-${weekStartStr}`}
          />

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => (viewMode === 'day' ? navigateDay(-1) : navigateWeek(-1))}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => (viewMode === 'day' ? navigateDay(1) : navigateWeek(1))}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* ─── Day Stats (day view only) ───────────────────────────────────── */}
      {viewMode === 'day' && dayStats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: dayStats.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
            { label: 'Agendados', value: dayStats.scheduled, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Concluídos', value: dayStats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Cancelados', value: dayStats.canceled, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`px-4 py-3 rounded-xl border ${stat.bg} transition-colors`}
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Main Content Grid ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar — Mini Calendar */}
        <div className="w-full lg:w-64 shrink-0 order-2 lg:order-1">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={(d) => setSelectedDate(d)}
            appointmentDates={appointmentDates}
          />

          {/* Legend */}
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Tipos de Exame
            </h4>
            <div className="space-y-2">
              {EXAM_TYPES.map((type) => {
                const color = getAppointmentColor(type);
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                    <span className="text-xs text-slate-600">{type}</span>
                  </div>
                );
              })}
            </div>
          </div>


        </div>

        {/* Main View */}
        <div className="flex-1 min-w-0 order-1 lg:order-2">
          {viewMode === 'day' ? (
            dayAppointments === undefined ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="animate-pulse text-slate-400">Carregando agenda...</div>
              </div>
            ) : dayAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                  <CalendarIcon className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Dia livre</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs text-center">
                  Nenhum paciente agendado para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Criar agendamento
                </button>
              </div>
            ) : (
              <DayTimelineView
                appointments={dayAppointments}
                onStatusChange={updateStatus}
                onDelete={deleteAppointment}
              />
            )
          ) : (
            <WeekView
              weekStart={weekStart}
              allAppointments={weekAppointments || []}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onStatusChange={updateStatus}
            />
          )}
        </div>
      </div>

      {/* ─── New Appointment Modal ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Novo Agendamento</h2>
                  <p className="text-sm text-slate-500">
                    {format(selectedDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Patient name with autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do Paciente
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={(e) => {
                      setFormData({ ...formData, patientName: e.target.value, patientId: '' });
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    placeholder="Busque ou digite o nome..."
                  />
                </div>

                {/* Autocomplete */}
                {showDropdown && formData.patientName && patients && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {patients.filter((p) =>
                      p.name.toLowerCase().includes(formData.patientName.toLowerCase())
                    ).length > 0 ? (
                      patients
                        .filter((p) =>
                          p.name.toLowerCase().includes(formData.patientName.toLowerCase())
                        )
                        .map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                patientName: patient.name,
                                patientId: patient.id,
                              });
                              setShowDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex flex-col"
                          >
                            <span className="font-medium text-slate-800">{patient.name}</span>
                            <span className="text-xs text-slate-500">
                              CPF: {patient.cpf || 'Não informado'}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 italic">
                        Nenhum paciente encontrado. Será agendado como paciente avulso.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Time + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                  <div className="relative">
                    <Clock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-shadow"
                  rows={3}
                  placeholder="Ex: Primeira consulta, trazer exames anteriores..."
                />
              </div>

              {/* Color preview */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span
                  className={`w-3 h-3 rounded-full ${getAppointmentColor(formData.type).dot}`}
                />
                Cor: {formData.type}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-sm"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
