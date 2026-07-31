import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Calendar as CalendarIcon, Clock, Plus, User, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    time: '08:00',
    type: 'Audiometria Ocupacional',
    notes: ''
  });
  const [showDropdown, setShowDropdown] = useState(false);

  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const appointments = useLiveQuery(
    () => db.appointments
      .where('date')
      .equals(selectedDate)
      .sortBy('time'),
    [selectedDate]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.time || !formData.type) return;

    try {
      await db.appointments.add({
        id: crypto.randomUUID(),
        date: selectedDate,
        patientName: formData.patientName,
        patientId: formData.patientId || undefined,
        time: formData.time,
        type: formData.type,
        status: 'scheduled',
        notes: formData.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending'
      });
      setShowModal(false);
      setFormData({ patientName: '', patientId: '', time: '08:00', type: 'Audiometria Ocupacional', notes: '' });
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento.');
    }
  };

  const updateStatus = async (id: string, status: 'scheduled' | 'completed' | 'canceled') => {
    try {
      await db.appointments.update(id, { status, syncStatus: 'pending', updatedAt: Date.now() });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-indigo-600" />
            Agenda
          </h1>
          <p className="text-slate-500 mt-1 capitalize">{formatDisplayDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 bg-white"
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Novo Agendamento</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {appointments === undefined ? (
          <div className="p-8 text-center text-slate-500">Carregando agenda...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <CalendarIcon className="w-16 h-16 mb-4 opacity-20 text-indigo-900" />
            <h3 className="text-lg font-medium text-slate-600">Nenhum agendamento</h3>
            <p className="mt-1">Não há pacientes marcados para esta data.</p>
            <button onClick={() => setShowModal(true)} className="mt-6 text-indigo-600 font-medium hover:underline">
              Criar o primeiro agendamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((app) => (
              <div key={app.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 sm:gap-6 group">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Hora</span>
                    <span className="font-bold text-indigo-700 leading-none">{app.time}</span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800">{app.patientName}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {app.type}</div>
                      {app.status === 'scheduled' && <div className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded text-xs">Agendado</div>}
                      {app.status === 'completed' && <div className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Concluído</div>}
                      {app.status === 'canceled' && <div className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded text-xs flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancelado</div>}
                    </div>
                    {app.notes && (
                      <p className="mt-3 text-sm text-slate-600 bg-slate-100/50 p-3 rounded-lg italic">
                        "{app.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center sm:items-start gap-2 justify-end opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {app.status !== 'completed' && (
                    <button 
                      onClick={() => updateStatus(app.id, 'completed')}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Marcar como Concluído"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                  {app.status !== 'canceled' && (
                    <button 
                      onClick={() => updateStatus(app.id, 'canceled')}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo Agendamento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Novo Agendamento</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={e => {
                      setFormData({...formData, patientName: e.target.value, patientId: ''});
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Busque ou digite o nome..."
                  />
                </div>
                
                {/* Autocomplete Dropdown */}
                {showDropdown && formData.patientName && patients && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {patients.filter(p => p.name.toLowerCase().includes(formData.patientName.toLowerCase())).length > 0 ? (
                      patients
                        .filter(p => p.name.toLowerCase().includes(formData.patientName.toLowerCase()))
                        .map(patient => (
                          <div
                            key={patient.id}
                            onClick={() => {
                              setFormData({ ...formData, patientName: patient.name, patientId: patient.id });
                              setShowDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex flex-col"
                          >
                            <span className="font-medium text-slate-800">{patient.name}</span>
                            <span className="text-xs text-slate-500">CPF: {patient.cpf || 'Não informado'}</span>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                  <div className="relative">
                    <Clock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option>Audiometria Ocupacional</option>
                    <option>Audiometria Clínica</option>
                    <option>Retorno PCA</option>
                    <option>Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={3}
                  placeholder="Ex: Primeira consulta, trazer exames anteriores..."
                ></textarea>
              </div>

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
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
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
