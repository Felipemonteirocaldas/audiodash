import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import Fuse from 'fuse.js';
import { Search, User, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allPatients = useLiveQuery(() => db.patients.toArray(), []);
  const allExams = useLiveQuery(() => db.audiometries.toArray(), []);

  // Prepare searchable items (mixing patients and exams)
  const searchableItems = useMemo(() => {
    const items: any[] = [];
    if (allPatients) {
      allPatients.forEach(p => items.push({ type: 'patient', item: p }));
    }
    if (allExams) {
      // Find patient name for exams to make them searchable by name too
      allExams.forEach(e => {
        const p = allPatients?.find(p => p.id === e.patientId);
        items.push({ 
          type: 'exam', 
          item: e, 
          patientName: p?.name || 'Desconhecido',
          cpf: p?.cpf || ''
        });
      });
    }
    return items;
  }, [allPatients, allExams]);

  const fuse = useMemo(() => new Fuse(searchableItems, {
    keys: [
      { name: 'item.name', weight: 2 },
      { name: 'item.cpf', weight: 1.5 },
      { name: 'patientName', weight: 1.5 },
      { name: 'item.examDate', weight: 1 },
      { name: 'item.examCategory', weight: 0.5 },
    ],
    threshold: 0.3,
    ignoreLocation: true
  }), [searchableItems]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return fuse.search(searchTerm).slice(0, 8).map(r => r.item);
  }, [searchTerm, fuse]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: any) => {
    setIsOpen(false);
    setSearchTerm('');
    if (result.type === 'patient') {
      navigate(`/evolucao/${result.item.id}`);
    } else if (result.type === 'exam') {
      navigate(`/exame/${result.item.id}`);
    }
  };

  return (
    <div className="relative w-80" ref={searchRef}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
      <input 
        type="text" 
        placeholder="Buscar paciente, exame..." 
        value={searchTerm}
        onChange={e => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/80 border-0 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all shadow-sm"
      />

      {isOpen && searchTerm.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          <div className="max-h-[300px] overflow-y-auto p-2">
            {searchResults.length > 0 ? (
              searchResults.map((result: any, i: number) => (
                <div 
                  key={i}
                  className="px-3 py-2.5 hover:bg-slate-50 cursor-pointer rounded-lg text-slate-800 flex items-center gap-3 transition-colors"
                  onClick={() => handleSelect(result)}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${result.type === 'patient' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {result.type === 'patient' ? <User className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {result.type === 'patient' ? (
                      <>
                        <div className="font-semibold text-sm truncate">{result.item.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">Paciente {result.item.cpf ? `• ${result.item.cpf}` : ''}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-sm truncate">{result.patientName}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Exame: {result.item.examDate.split('-').reverse().join('/')} • {result.item.examCategory}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
