// @ts-nocheck
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Audiometry, TonalFrequency, ReflexFrequency } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { exportToDocx } from '@/lib/exportWord';
import { exportToExcelJs } from '@/lib/exportExcel';
import { exportToPdf } from '@/lib/exportPdf';
import { FileText, FileSpreadsheet, File, Save } from 'lucide-react';
import AudiogramSVG from '@/components/AudiogramSVG';
import TympanogramSVG from '@/components/TympanogramSVG';

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const REFLEX_FREQS: ReflexFrequency[] = ['500', '1000', '2000', '4000'];

export default function NewExam() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedPatient = patients?.find(p => p.id === selectedPatientId);
  
  // Calculate age if birthDate is present
  const patientAge = selectedPatient?.birthDate 
    ? Math.floor((new Date().getTime() - new Date(selectedPatient.birthDate).getTime()) / 3.15576e+10) 
    : '';
  
  const [exam, setExam] = useState<Partial<Audiometry>>({
    header: { audiometer: '', impedanciometer: '', requestingPhysician: '', speechTherapist: '' },
    tonalData: { right: {}, left: {} },
    tonalMasking: { right: {}, left: {} },
    logoAudiometry: { 
      right: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} },
      left: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} } 
    },
    tympanometry: { right: {}, left: {} },
    reflexes: { right: {}, left: {}, sondaOD: '', sondaOE: '' },
    resultAndConduct: '',
  });

  type DrawingTool = 'OD_VA' | 'OD_VO' | 'OE_VA' | 'OE_VO' | null;
  const [activeTool, setActiveTool] = useState<DrawingTool>('OD_VA');
  const [isMasked, setIsMasked] = useState(false);
  const [isNR, setIsNR] = useState(false);
  
  type TympanogramTool = 'OD' | 'OE' | null;
  const [activeTympTool, setActiveTympTool] = useState<TympanogramTool>('OD');

  const handleAudiogramClick = (freq: string, db: number) => {
    if (!activeTool) return;
    const isRight = activeTool.startsWith('OD');
    const isVA = activeTool.endsWith('VA');
    const ear = isRight ? 'right' : 'left';
    
    const currentPoint = exam.tonalData?.[ear]?.[freq as TonalFrequency];
    let valToSet: string | number | undefined = isNR ? 'NR' : db;
    let maskedToSet = isMasked;

    if (currentPoint) {
       const fieldToCheck = isVA ? currentPoint.va : currentPoint.vo;
       const maskField = isVA ? currentPoint.maskedVa : currentPoint.maskedVo;
       if (fieldToCheck === valToSet && maskField === maskedToSet) {
          valToSet = undefined;
          maskedToSet = false;
       }
    }

    handleTonalChange(ear, freq as TonalFrequency, isVA ? 'va' : 'vo', valToSet !== undefined ? valToSet.toString() : '');
    handleTonalMaskingPoint(ear, freq as TonalFrequency, isVA ? 'maskedVa' : 'maskedVo', maskedToSet);
  };

  const handleTympanogramClick = (pressure: number, compliance: number) => {
    if (!activeTympTool) return;
    const ear = activeTympTool === 'OD' ? 'right' : 'left';
    
    setExam(prev => ({
      ...prev,
      tympanometry: {
        ...(prev.tympanometry || {}),
        [ear]: {
          ...(prev.tympanometry?.[ear] || {}),
          peak: pressure.toString(),
          compliance200: compliance.toString()
        }
      }
    }));
  };

  const clearTymp = (ear: 'right' | 'left') => {
    setExam(prev => ({
      ...prev,
      tympanometry: {
        ...(prev.tympanometry || {}),
        [ear]: {
          ...(prev.tympanometry?.[ear] || {}),
          peak: '',
          compliance200: ''
        }
      }
    }));
  };

  const clearAudiogram = (ear: 'right' | 'left', field: 'va' | 'vo') => {
    setExam(prev => {
      const earData = { ...prev.tonalData?.[ear] };
      FREQUENCIES.forEach(freq => {
        if (earData[freq as TonalFrequency]) {
          earData[freq as TonalFrequency] = { 
            ...earData[freq as TonalFrequency], 
            [field]: undefined, 
            [field === 'va' ? 'maskedVa' : 'maskedVo']: false 
          };
        }
      });
      return {
        ...prev,
        tonalData: {
          ...(prev.tonalData || {}),
          [ear]: earData
        }
      };
    });
  };

  const handleTonalChange = (ear: 'right' | 'left', freq: TonalFrequency, field: 'va' | 'vo', value: string) => {
    setExam(prev => ({
      ...prev,
      tonalData: {
        ...(prev.tonalData || { right: {}, left: {} }),
        [ear]: {
          ...(prev.tonalData?.[ear] || {}),
          [freq]: {
            ...(prev.tonalData?.[ear]?.[freq] || {}),
            [field]: value === 'NR' ? 'NR' : (value === '' ? undefined : parseInt(value))
          }
        }
      }
    }));
  };

  const handleTonalMaskingPoint = (ear: 'right' | 'left', freq: TonalFrequency, field: 'maskedVa' | 'maskedVo', value: boolean) => {
    setExam(prev => ({
      ...prev,
      tonalData: {
        ...(prev.tonalData || { right: {}, left: {} }),
        [ear]: {
          ...(prev.tonalData?.[ear] || {}),
          [freq]: {
            ...(prev.tonalData?.[ear]?.[freq] || {}),
            [field]: value
          }
        }
      }
    }));
  };

  const getExamData = (): Audiometry | null => {
    if (!selectedPatientId) {
      alert('Selecione um paciente!');
      return null;
    }
    return {
      ...exam,
      id: crypto.randomUUID(),
      patientId: selectedPatientId,
      examDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending'
    } as Audiometry;
  };

  const handleSave = async () => {
    const examData = getExamData();
    if (!examData) return;
    try {
      await db.audiometries.add(examData);
      alert('Exame salvo com sucesso!');
      navigate('/');
    } catch (e) {
      alert('Erro ao salvar o exame.');
    }
  };

  const handleExport = async (type: 'pdf' | 'docx' | 'xlsx') => {
    const examData = getExamData();
    if (!examData || !selectedPatient) return alert('Selecione um paciente antes de exportar.');
    if (type === 'pdf') await exportToPdf(examData, selectedPatient);
    else if (type === 'docx') await exportToDocx(examData, selectedPatient);
    else if (type === 'xlsx') await exportToExcelJs(examData, selectedPatient);
  };

  const ActionButtons = () => (
    <div className="flex gap-2 items-center flex-wrap">
      <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Salvar Exame</Button>
      <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2"><FileText className="w-4 h-4 text-red-500" /> PDF</Button>
      <Button variant="outline" onClick={() => handleExport('docx')} className="gap-2"><File className="w-4 h-4 text-blue-500" /> Word</Button>
      <Button variant="outline" onClick={() => handleExport('xlsx')} className="gap-2"><FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Novo Exame</h1>
        <ActionButtons />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dados Básicos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
              >
                <option value="">Selecione o paciente...</option>
                {patients?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.cpf})</option>)}
              </select>
              {selectedPatient && (
                <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                  {patientAge !== '' && <span>Idade: {patientAge} anos</span>}
                  {selectedPatient.rg && <span>RG: {selectedPatient.rg} {selectedPatient.ssp}</span>}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data do Exame</label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Equipamentos e Profissionais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Audiômetro" value={exam.header?.audiometer || ''} onChange={e => setExam({...exam, header: {...exam.header, audiometer: e.target.value}})} />
            <Input placeholder="Impedanciômetro" value={exam.header?.impedanciometer || ''} onChange={e => setExam({...exam, header: {...exam.header, impedanciometer: e.target.value}})} />
            <Input placeholder="Médico Solicitante" value={exam.header?.requestingPhysician || ''} onChange={e => setExam({...exam, header: {...exam.header, requestingPhysician: e.target.value}})} />
            <Input placeholder="Fonoaudiólogo(a)" value={exam.header?.speechTherapist || ''} onChange={e => setExam({...exam, header: {...exam.header, speechTherapist: e.target.value}})} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2 overflow-x-auto">
          <CardHeader><CardTitle>Audiometria Tonal</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="p-2 border-b">Frequência (Hz)</th>
                  <th className="p-2 border-b text-red-500 font-bold" colSpan={4}>OD (Direita)</th>
                  <th className="p-2 border-b text-blue-500 font-bold" colSpan={4}>OE (Esquerda)</th>
                </tr>
                <tr>
                  <th className="p-2 border-b"></th>
                  <th className="p-2 border-b text-xs" title="Via Aérea">VA</th>
                  <th className="p-2 border-b text-xs" title="VA com Mascaramento">M-VA</th>
                  <th className="p-2 border-b text-xs" title="Via Óssea">VO</th>
                  <th className="p-2 border-b text-xs" title="VO com Mascaramento">M-VO</th>
                  
                  <th className="p-2 border-b text-xs" title="Via Aérea">VA</th>
                  <th className="p-2 border-b text-xs" title="VA com Mascaramento">M-VA</th>
                  <th className="p-2 border-b text-xs" title="Via Óssea">VO</th>
                  <th className="p-2 border-b text-xs" title="VO com Mascaramento">M-VO</th>
                </tr>
              </thead>
              <tbody>
                {FREQUENCIES.map(freq => (
                  <tr key={freq}>
                    <td className="p-2 border-b font-medium">{freq}</td>
                    
                    {/* Right Ear */}
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('right', freq, 'va', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMaskingPoint('right', freq, 'maskedVa', e.target.checked)} /></td>
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('right', freq, 'vo', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMaskingPoint('right', freq, 'maskedVo', e.target.checked)} /></td>
                    
                    {/* Left Ear */}
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('left', freq, 'va', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMaskingPoint('left', freq, 'maskedVa', e.target.checked)} /></td>
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('left', freq, 'vo', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMaskingPoint('left', freq, 'maskedVo', e.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Audiogram View */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Audiograma Interativo</CardTitle>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 items-center">
                <Button size="sm" variant={activeTool === 'OD_VA' ? 'default' : 'outline'} onClick={() => setActiveTool('OD_VA')} className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200">VA Dir</Button>
                <Button variant="ghost" size="sm" className="h-4 text-[10px] px-1 text-red-500" onClick={() => clearAudiogram('right', 'va')}>Limpar</Button>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <Button size="sm" variant={activeTool === 'OD_VO' ? 'default' : 'outline'} onClick={() => setActiveTool('OD_VO')} className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200">VO Dir</Button>
                <Button variant="ghost" size="sm" className="h-4 text-[10px] px-1 text-red-500" onClick={() => clearAudiogram('right', 'vo')}>Limpar</Button>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <Button size="sm" variant={activeTool === 'OE_VA' ? 'default' : 'outline'} onClick={() => setActiveTool('OE_VA')} className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200">VA Esq</Button>
                <Button variant="ghost" size="sm" className="h-4 text-[10px] px-1 text-blue-500" onClick={() => clearAudiogram('left', 'va')}>Limpar</Button>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <Button size="sm" variant={activeTool === 'OE_VO' ? 'default' : 'outline'} onClick={() => setActiveTool('OE_VO')} className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200">VO Esq</Button>
                <Button variant="ghost" size="sm" className="h-4 text-[10px] px-1 text-blue-500" onClick={() => clearAudiogram('left', 'vo')}>Limpar</Button>
              </div>
              <div className="w-px h-8 bg-border mx-2 self-start mt-1"></div>
              <div className="flex gap-2 items-start">
                <Button size="sm" variant={isMasked ? 'default' : 'outline'} onClick={() => setIsMasked(!isMasked)} className={isMasked ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300" : ""}>
                  Mascarado
                </Button>
                <Button size="sm" variant={isNR ? 'default' : 'outline'} onClick={() => setIsNR(!isNR)} className={isNR ? "bg-slate-700 text-white hover:bg-slate-800" : ""}>
                  Sem Resposta
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center items-center p-6">
            <div className="w-full max-w-[600px]">
              {/* @ts-ignore */}
              <AudiogramSVG rightData={exam.tonalData?.right || {}} leftData={exam.tonalData?.left || {}} onPointClick={handleAudiogramClick} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Mascaramento Geral</CardTitle></CardHeader>
          <CardContent>
             <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th></th>
                  <th className="p-2 border-b" colSpan={2}>VA</th>
                  <th className="p-2 border-b" colSpan={2}>VO</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b font-medium text-red-500">OD</td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" placeholder="Ex: 100 dBNB" value={exam.tonalMasking?.right?.va1 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, right: {...exam.tonalMasking?.right, va1: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tonalMasking?.right?.va2 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, right: {...exam.tonalMasking?.right, va2: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" placeholder="Ex: 100 dBNB" value={exam.tonalMasking?.right?.vo1 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, right: {...exam.tonalMasking?.right, vo1: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tonalMasking?.right?.vo2 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, right: {...exam.tonalMasking?.right, vo2: e.target.value}}})} /></td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium text-blue-500">OE</td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" placeholder="Ex: 85 dBNB" value={exam.tonalMasking?.left?.va1 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, left: {...exam.tonalMasking?.left, va1: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tonalMasking?.left?.va2 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, left: {...exam.tonalMasking?.left, va2: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" placeholder="Ex: 85 dBNB" value={exam.tonalMasking?.left?.vo1 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, left: {...exam.tonalMasking?.left, vo1: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tonalMasking?.left?.vo2 || ''} onChange={e => setExam({...exam, tonalMasking: {...exam.tonalMasking, left: {...exam.tonalMasking?.left, vo2: e.target.value}}})} /></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Timpanograma</CardTitle>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 items-center">
                <Button size="sm" variant={activeTympTool === 'OD' ? 'default' : 'outline'} onClick={() => setActiveTympTool('OD')} className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 w-12">OD</Button>
                <Button variant="ghost" size="sm" className="h-4 text-[10px] px-1 text-red-500" onClick={() => clearTymp('right')}>Limpar</Button>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <Button size="sm" variant={activeTympTool === 'OE' ? 'default' : 'outline'} onClick={() => setActiveTympTool('OE')} className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200 w-12">OE</Button>
                <Button variant="ghost" size="sm" className="h-4 text-[10px] px-1 text-blue-500" onClick={() => clearTymp('left')}>Limpar</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center border p-4 bg-white rounded-md">
              <TympanogramSVG rightData={exam.tympanometry?.right} leftData={exam.tympanometry?.left} onPointClick={handleTympanogramClick} />
            </div>
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th></th>
                  <th className="p-2 border-b text-red-500">OD</th>
                  <th className="p-2 border-b text-blue-500">OE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b font-medium">Pressão do Pico (daPa)</td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tympanometry?.right?.peak || ''} onChange={e => setExam({...exam, tympanometry: {...exam.tympanometry, right: {...exam.tympanometry?.right, peak: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tympanometry?.left?.peak || ''} onChange={e => setExam({...exam, tympanometry: {...exam.tympanometry, left: {...exam.tympanometry?.left, peak: e.target.value}}})} /></td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium">Complacência (ml)</td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tympanometry?.right?.compliance200 || ''} onChange={e => setExam({...exam, tympanometry: {...exam.tympanometry, right: {...exam.tympanometry?.right, compliance200: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tympanometry?.left?.compliance200 || ''} onChange={e => setExam({...exam, tympanometry: {...exam.tympanometry, left: {...exam.tympanometry?.left, compliance200: e.target.value}}})} /></td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium">Volume Equivalente (ml)</td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tympanometry?.right?.volume || ''} onChange={e => setExam({...exam, tympanometry: {...exam.tympanometry, right: {...exam.tympanometry?.right, volume: e.target.value}}})} /></td>
                  <td className="p-1 border-b"><Input className="h-8 text-xs p-1" value={exam.tympanometry?.left?.volume || ''} onChange={e => setExam({...exam, tympanometry: {...exam.tympanometry, left: {...exam.tympanometry?.left, volume: e.target.value}}})} /></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logoaudiometria */}
        <Card className="lg:col-span-2 overflow-x-auto">
          <CardHeader><CardTitle>Logoaudiometria</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            
            {/* SRT */}
            <div>
              <h3 className="font-bold mb-2">SRT</h3>
              <table className="w-full text-sm text-left border">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 border">Ouvido</th>
                    <th className="p-2 border">dB</th>
                    <th className="p-2 border">Mascaramento</th>
                    <th className="p-2 border">Unid.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border font-medium text-red-500">OD</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.srt?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, srt: {...exam.logoAudiometry?.right?.srt, db: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.srt?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, srt: {...exam.logoAudiometry?.right?.srt, masking: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.srt?.unit || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, srt: {...exam.logoAudiometry?.right?.srt, unit: e.target.value}}}})} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border font-medium text-blue-500">OE</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.srt?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, srt: {...exam.logoAudiometry?.left?.srt, db: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.srt?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, srt: {...exam.logoAudiometry?.left?.srt, masking: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.srt?.unit || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, srt: {...exam.logoAudiometry?.left?.srt, unit: e.target.value}}}})} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Índice de Reconhecimento de Fala */}
            <div>
              <h3 className="font-bold mb-2">Índice de Reconhecimento de Fala</h3>
              <table className="w-full text-sm text-left border">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 border" colSpan={2}>Ouvido / Sílaba</th>
                    <th className="p-2 border">dB</th>
                    <th className="p-2 border">%</th>
                    <th className="p-2 border">Mascaramento</th>
                  </tr>
                </thead>
                <tbody>
                  {/* OD */}
                  <tr>
                    <td className="p-2 border font-medium text-red-500" rowSpan={3}>OD</td>
                    <td className="p-2 border">Mono</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.mono?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, mono: {...exam.logoAudiometry?.right?.irf?.mono, db: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.mono?.percentage || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, mono: {...exam.logoAudiometry?.right?.irf?.mono, percentage: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.mono?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, mono: {...exam.logoAudiometry?.right?.irf?.mono, masking: e.target.value}}}}})} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Dis</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.dis?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, dis: {...exam.logoAudiometry?.right?.irf?.dis, db: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.dis?.percentage || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, dis: {...exam.logoAudiometry?.right?.irf?.dis, percentage: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.dis?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, dis: {...exam.logoAudiometry?.right?.irf?.dis, masking: e.target.value}}}}})} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Tris</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.tris?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, tris: {...exam.logoAudiometry?.right?.irf?.tris, db: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.tris?.percentage || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, tris: {...exam.logoAudiometry?.right?.irf?.tris, percentage: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.irf?.tris?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, irf: {...exam.logoAudiometry?.right?.irf, tris: {...exam.logoAudiometry?.right?.irf?.tris, masking: e.target.value}}}}})} /></td>
                  </tr>
                  {/* OE */}
                  <tr>
                    <td className="p-2 border font-medium text-blue-500" rowSpan={3}>OE</td>
                    <td className="p-2 border">Mono</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.mono?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, mono: {...exam.logoAudiometry?.left?.irf?.mono, db: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.mono?.percentage || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, mono: {...exam.logoAudiometry?.left?.irf?.mono, percentage: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.mono?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, mono: {...exam.logoAudiometry?.left?.irf?.mono, masking: e.target.value}}}}})} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Dis</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.dis?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, dis: {...exam.logoAudiometry?.left?.irf?.dis, db: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.dis?.percentage || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, dis: {...exam.logoAudiometry?.left?.irf?.dis, percentage: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.dis?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, dis: {...exam.logoAudiometry?.left?.irf?.dis, masking: e.target.value}}}}})} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Tris</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.tris?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, tris: {...exam.logoAudiometry?.left?.irf?.tris, db: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.tris?.percentage || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, tris: {...exam.logoAudiometry?.left?.irf?.tris, percentage: e.target.value}}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.irf?.tris?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, irf: {...exam.logoAudiometry?.left?.irf, tris: {...exam.logoAudiometry?.left?.irf?.tris, masking: e.target.value}}}}})} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Detecção de Voz */}
            <div>
              <h3 className="font-bold mb-2">Detecção de Voz</h3>
              <table className="w-full text-sm text-left border">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 border">Ouvido</th>
                    <th className="p-2 border">dB</th>
                    <th className="p-2 border">Mascaramento</th>
                    <th className="p-2 border">Unid.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border font-medium text-red-500">OD</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.voiceDetection?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, voiceDetection: {...exam.logoAudiometry?.right?.voiceDetection, db: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.voiceDetection?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, voiceDetection: {...exam.logoAudiometry?.right?.voiceDetection, masking: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.right?.voiceDetection?.unit || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, right: {...exam.logoAudiometry?.right, voiceDetection: {...exam.logoAudiometry?.right?.voiceDetection, unit: e.target.value}}}})} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border font-medium text-blue-500">OE</td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.voiceDetection?.db || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, voiceDetection: {...exam.logoAudiometry?.left?.voiceDetection, db: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.voiceDetection?.masking || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, voiceDetection: {...exam.logoAudiometry?.left?.voiceDetection, masking: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1" value={exam.logoAudiometry?.left?.voiceDetection?.unit || ''} onChange={e => setExam({...exam, logoAudiometry: {...exam.logoAudiometry, left: {...exam.logoAudiometry?.left, voiceDetection: {...exam.logoAudiometry?.left?.voiceDetection, unit: e.target.value}}}})} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

          </CardContent>
        </Card>

        {/* Reflexo Estapediano */}
        <Card className="lg:col-span-2 overflow-x-auto">
          <CardHeader><CardTitle>Reflexo Estapediano</CardTitle></CardHeader>
          <CardContent>
             <table className="w-full text-sm text-left border">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 border" rowSpan={2}>Hz</th>
                  <th className="p-2 border text-red-500 font-bold text-center" colSpan={5}>Ouvido Direito</th>
                  <th className="p-2 border text-blue-500 font-bold text-center" colSpan={5}>Ouvido Esquerdo</th>
                </tr>
                <tr className="bg-muted">
                  <th className="p-2 border text-xs">Limiar</th>
                  <th className="p-2 border text-xs">Ref. Contra</th>
                  <th className="p-2 border text-xs">Dif</th>
                  <th className="p-2 border text-xs">Ref. Ipsi</th>
                  <th className="p-2 border text-xs">Decay</th>
                  
                  <th className="p-2 border text-xs">Limiar</th>
                  <th className="p-2 border text-xs">Ref. Contra</th>
                  <th className="p-2 border text-xs">Dif</th>
                  <th className="p-2 border text-xs">Ref. Ipsi</th>
                  <th className="p-2 border text-xs">Decay</th>
                </tr>
              </thead>
              <tbody>
                {REFLEX_FREQS.map(freq => (
                  <tr key={`reflex-${freq}`}>
                    <td className="p-2 border font-medium">{freq}</td>
                    
                    {/* OD */}
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-16" value={exam.reflexes?.right?.[freq]?.limiar || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, right: {...exam.reflexes?.right, [freq]: {...exam.reflexes?.right?.[freq], limiar: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-20" value={exam.reflexes?.right?.[freq]?.contra || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, right: {...exam.reflexes?.right, [freq]: {...exam.reflexes?.right?.[freq], contra: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-12" value={exam.reflexes?.right?.[freq]?.dif || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, right: {...exam.reflexes?.right, [freq]: {...exam.reflexes?.right?.[freq], dif: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-20" value={exam.reflexes?.right?.[freq]?.ipsi || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, right: {...exam.reflexes?.right, [freq]: {...exam.reflexes?.right?.[freq], ipsi: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-16" value={exam.reflexes?.right?.[freq]?.decay || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, right: {...exam.reflexes?.right, [freq]: {...exam.reflexes?.right?.[freq], decay: e.target.value}}}})} /></td>
                    
                    {/* OE */}
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-16" value={exam.reflexes?.left?.[freq]?.limiar || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, left: {...exam.reflexes?.left, [freq]: {...exam.reflexes?.left?.[freq], limiar: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-20" value={exam.reflexes?.left?.[freq]?.contra || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, left: {...exam.reflexes?.left, [freq]: {...exam.reflexes?.left?.[freq], contra: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-12" value={exam.reflexes?.left?.[freq]?.dif || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, left: {...exam.reflexes?.left, [freq]: {...exam.reflexes?.left?.[freq], dif: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-20" value={exam.reflexes?.left?.[freq]?.ipsi || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, left: {...exam.reflexes?.left, [freq]: {...exam.reflexes?.left?.[freq], ipsi: e.target.value}}}})} /></td>
                    <td className="p-1 border"><Input className="h-8 text-xs p-1 w-16" value={exam.reflexes?.left?.[freq]?.decay || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, left: {...exam.reflexes?.left, [freq]: {...exam.reflexes?.left?.[freq], decay: e.target.value}}}})} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="p-2 border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">Sonda no Esquerdo:</span>
                      <Input className="h-8 text-xs flex-1" value={exam.reflexes?.sondaOE || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, sondaOE: e.target.value}})} />
                    </div>
                  </td>
                  <td colSpan={5} className="p-2 border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">Sonda no Direito:</span>
                      <Input className="h-8 text-xs flex-1" value={exam.reflexes?.sondaOD || ''} onChange={e => setExam({...exam, reflexes: {...exam.reflexes, sondaOD: e.target.value}})} />
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Resultado / Conduta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <textarea 
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Digite o parecer final aqui..."
              value={exam.resultAndConduct || ''}
              onChange={e => setExam({...exam, resultAndConduct: e.target.value})}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 pb-8">
        <ActionButtons />
      </div>

    </div>
  );
}
