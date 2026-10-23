import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { isReviewCurrent, localDate } from '@/lib/examIntegrity';
import { 
  Bell, 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  CheckCheck,
  Activity,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'appointment' | 'alert' | 'sync' | 'info';
  read: boolean;
  link?: string;
}

export function NotificationsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('audiodash_read_notifications');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem('audiodash_read_notifications', JSON.stringify(Array.from(readIds)));
  }, [readIds]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const { isOnline, syncStatus, lastError } = useSyncStatus();
  const todayStr = localDate();

  // 1. Fetch Today's Appointments
  const todayAppointments = useLiveQuery(async () => {
    return await db.appointments
      .where('date')
      .equals(todayStr)
      .and(app => app.status !== 'canceled')
      .toArray();
  }, [todayStr]) || [];

  // 2. Fetch Recent Exams with Altered Results
  const alteredExams = useLiveQuery(async () => {
    const exams = await db.audiometries.orderBy('examDate').reverse().limit(10).toArray();
    const filtered = [];
    for (const exam of exams) {
      // Usa a decisão estruturada e revisada, não palavras do texto livre ("não alterado" também contém "alterad").
      if (isReviewCurrent(exam) && exam.opinion?.clinicalStatus === 'altered') {
        const patient = await db.patients.get(exam.patientId);
        filtered.push({ ...exam, patientName: patient?.name || 'Paciente' });
      }
    }
    return filtered;
  }, []) || [];

  // 3. Fetch Sync Pending Count
  const pendingSyncCount = useLiveQuery(async () => {
    const counts = await Promise.all([db.patients, db.audiometries, db.anamneses, db.appointments, db.settings].map(table => table.where('syncStatus').equals('pending').count()));
    return counts.reduce((total, count) => total + count, 0);
  }, []) || 0;

  // Build notifications array dynamically
  const notifications: NotificationItem[] = [];

  // Add Appointment notifications
  todayAppointments.forEach(app => {
    const notifId = `app-${app.id}`;
    notifications.push({
      id: notifId,
      title: `Consulta Agendada (${app.time})`,
      description: `Paciente ${app.patientName} - ${app.type || 'tipo não informado'}`,
      time: `Hoje às ${app.time}`,
      type: 'appointment',
      read: readIds.has(notifId),
      link: '/agenda'
    });
  });

  // Add Altered Exam Alerts
  alteredExams.forEach(exam => {
    const notifId = `exam-${exam.id}`;
    notifications.push({
      id: notifId,
      title: `Alerta de Parecer Clínico`,
      description: `Exame de ${exam.patientName} apresentou laudo com alteração auditiva.`,
      time: `Exame em ${exam.examDate.split('-').reverse().join('/')}`,
      type: 'alert',
      read: readIds.has(notifId),
      link: `/exame/${exam.id}`
    });
  });

  // Add Sync notification
  if (pendingSyncCount > 0) {
    const notifId = `sync-pending`;
    notifications.push({
      id: notifId,
      title: `Pendências de Nuvem`,
      description: `Existem ${pendingSyncCount} registros salvos offline aguardando sincronização.`,
      time: `Agora`,
      type: 'sync',
      read: readIds.has(notifId)
    });
  } else if (!isOnline) {
    notifications.push({ id: 'sync-offline', title: `Sem conexão`, description: `Sem pendências locais, mas não foi possível confirmar a nuvem sem internet.`, time: `Agora`, type: 'info', read: readIds.has('sync-offline') });
  } else if (syncStatus === 'error') {
    notifications.push({ id: 'sync-error', title: `Falha na sincronização`, description: lastError || `A última tentativa de sincronizar com a nuvem falhou.`, time: `Agora`, type: 'sync', read: readIds.has('sync-error') });
  } else if (syncStatus === 'unconfigured') {
    notifications.push({ id: 'sync-unconfigured', title: `Nuvem não configurada`, description: `Os dados estão salvos apenas neste aparelho. Faça backup em Configurações.`, time: `Agora`, type: 'info', read: readIds.has('sync-unconfigured') });
  } else {
    notifications.push({ id: 'sync-ok', title: `Sem pendências de sincronização`, description: `Nenhum registro aguardando envio à nuvem.`, time: `Agora`, type: 'info', read: readIds.has('sync-ok') });
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setReadIds(prev => new Set(prev).add(item.id));
    if (item.link) {
      navigate(item.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all focus:outline-none"
        title="Central de Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover / Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#0071e3]" />
              <h3 className="font-bold text-sm text-slate-900">Notificações da Clínica</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-[#0071e3]">
                  {unreadCount} novas
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-slate-500 hover:text-[#0071e3] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200/50 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Lidas
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Nenhuma notificação no momento</p>
                <p className="text-[11px] text-slate-400">Sua agenda e exames estão em dia.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 flex items-start gap-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !item.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Icon Indicator */}
                  <div className="mt-0.5 shrink-0">
                    {item.type === 'appointment' && (
                      <div className="h-8 w-8 rounded-xl bg-blue-100 text-[#0071e3] flex items-center justify-center">
                        <Calendar className="h-4 w-4" />
                      </div>
                    )}
                    {item.type === 'alert' && (
                      <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    )}
                    {item.type === 'sync' && (
                      <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                        <Activity className="h-4 w-4" />
                      </div>
                    )}
                    {item.type === 'info' && (
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <UserCheck className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-xs font-semibold truncate ${!item.read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {item.link && (
                    <ChevronRight className="h-4 w-4 text-slate-300 self-center shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
            <button 
              onClick={() => {
                navigate('/agenda');
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-[#0071e3] hover:underline"
            >
              Ver toda a agenda de hoje →
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
