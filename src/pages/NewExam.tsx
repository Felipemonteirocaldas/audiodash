import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Audiometry, EarTonalData } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { exportToDocx } from '@/lib/exportWord';
import { exportToExcelJs } from '@/lib/exportExcel';
import { exportToPdf } from '@/lib/exportPdf';
import { FileText, FileSpreadsheet, File, Save } from 'lucide-react';
import AudiogramSVG from '@/components/AudiogramSVG';

const FREQUENCIES = ['125', '250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];

const initialEarData = () => FREQUENCIES.reduce((acc, freq) => {
  acc[freq] = {};
  return acc;
}, {} as EarTonalData);

export default function NewExam() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  
  const selectedPatient = patients?.find(p => p.id === selectedPatientId);
  
  const [anamnesis, setAnamnesis] = useState({ queixa: '', zumbido: '', tontura: '', exposicaoRuido: '' });
  
  const [tonalData, setTonalData] = useState<{right: EarTonalData, left: EarTonalData}>({
    right: initialEarData(), left: initialEarData()
  });

  const [vocalData, setVocalData] = useState({
    right: { lrf: '', ldt: '', iprfMono: '', iprfDi: '' },
    left: { lrf: '', ldt: '', iprfMono: '', iprfDi: '' }
  });

  const [finalReport, setFinalReport] = useState('');

  const handleTonalChange = (ear: 'right' | 'left', freq: string, field: 'va' | 'vo', value: string) => {
    setTonalData(prev => ({
      ...prev,
      [ear]: {
        ...prev[ear],
        [freq]: {
          ...prev[ear][freq],
          [field]: value === 'NR' ? 'NR' : (value === '' ? undefined : parseInt(value))
        }
      }
    }));
  };

  const handleTonalMask = (ear: 'right' | 'left', freq: string, field: 'maskedVa' | 'maskedVo', value: boolean) => {
    setTonalData(prev => ({
      ...prev,
      [ear]: {
        ...prev[ear],
        [freq]: {
          ...prev[ear][freq],
          [field]: value
        }
      }
    }));
  };

  const calculatePTA = (data: EarTonalData, freqs: string[]) => {
    let sum = 0;
    let count = 0;
    for (const f of freqs) {
      if (data[f]?.va !== undefined && typeof data[f].va === 'number') {
        sum += data[f].va as number;
        count++;
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  };

  const getExamData = () => {
    if (!selectedPatientId) {
      alert('Selecione um paciente!');
      return null;
    }
    
    const pta = {
      right: {
        tritonal: calculatePTA(tonalData.right, ['500', '1000', '2000']),
        quadritonal: calculatePTA(tonalData.right, ['500', '1000', '2000', '4000'])
      },
      left: {
        tritonal: calculatePTA(tonalData.left, ['500', '1000', '2000']),
        quadritonal: calculatePTA(tonalData.left, ['500', '1000', '2000', '4000'])
      }
    };

    const exam = {
      patientId: selectedPatientId,
      examDate,
      anamnesis,
      tonalData,
      vocalData: {
        right: {
          lrf: Number(vocalData.right.lrf) || undefined,
          ldt: Number(vocalData.right.ldt) || undefined,
          iprfMono: Number(vocalData.right.iprfMono) || undefined,
          iprfDi: Number(vocalData.right.iprfDi) || undefined,
        },
        left: {
          lrf: Number(vocalData.left.lrf) || undefined,
          ldt: Number(vocalData.left.ldt) || undefined,
          iprfMono: Number(vocalData.left.iprfMono) || undefined,
          iprfDi: Number(vocalData.left.iprfDi) || undefined,
        }
      },
      pureToneAverage: pta,
      hearingLossDegree: { right: 'Pendente', left: 'Pendente' },
      finalReport,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending'
    } as Audiometry;

    return exam;
  };

  const handleSave = async () => {
    const exam = getExamData();
    if (!exam) return;

    try {
      await db.audiometries.add(exam);
      alert('Exame salvo com sucesso!');
      navigate('/');
    } catch (e) {
      alert('Erro ao salvar o exame.');
    }
  };

  const handleExport = async (type: 'pdf' | 'docx' | 'xlsx') => {
    const exam = getExamData();
    if (!exam || !selectedPatient) return alert('Selecione um paciente antes de exportar.');
    
    if (type === 'pdf') {
      await exportToPdf(exam, selectedPatient);
    } else if (type === 'docx') {
      await exportToDocx(exam, selectedPatient);
    } else if (type === 'xlsx') {
      await exportToExcelJs(exam, selectedPatient);
    }
  };

  const applyTemplate = (text: string) => setFinalReport(prev => prev ? `${prev}\n${text}` : text);

  const ActionButtons = () => (
    <div className="flex gap-2 items-center flex-wrap">
      <Button onClick={handleSave} className="gap-2">
        <Save className="w-4 h-4" />
        Salvar Exame
      </Button>
      <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
        <FileText className="w-4 h-4 text-red-500" />
        PDF
      </Button>
      <Button variant="outline" onClick={() => handleExport('docx')} className="gap-2">
        <File className="w-4 h-4 text-blue-500" />
        Word
      </Button>
      <Button variant="outline" onClick={() => handleExport('xlsx')} className="gap-2">
        <FileSpreadsheet className="w-4 h-4 text-green-500" />
        Excel
      </Button>
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
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
              >
                <option value="">Selecione o paciente...</option>
                {patients?.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.cpf})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data do Exame</label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anamnese Resumida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Queixa principal" value={anamnesis.queixa} onChange={e => setAnamnesis({...anamnesis, queixa: e.target.value})} />
            <Input placeholder="Zumbido" value={anamnesis.zumbido} onChange={e => setAnamnesis({...anamnesis, zumbido: e.target.value})} />
            <Input placeholder="Tontura" value={anamnesis.tontura} onChange={e => setAnamnesis({...anamnesis, tontura: e.target.value})} />
            <Input placeholder="Exposição a ruído" value={anamnesis.exposicaoRuido} onChange={e => setAnamnesis({...anamnesis, exposicaoRuido: e.target.value})} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tonal Form */}
        <Card className="lg:col-span-2 overflow-x-auto">
          <CardHeader>
            <CardTitle>Audiometria Tonal</CardTitle>
          </CardHeader>
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
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMask('right', freq, 'maskedVa', e.target.checked)} /></td>
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('right', freq, 'vo', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMask('right', freq, 'maskedVo', e.target.checked)} /></td>
                    
                    {/* Left Ear */}
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('left', freq, 'va', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMask('left', freq, 'maskedVa', e.target.checked)} /></td>
                    <td className="p-1 border-b"><Input className="w-16 h-8 text-xs p-1" placeholder="dB" onChange={e => handleTonalChange('left', freq, 'vo', e.target.value)} /></td>
                    <td className="p-1 border-b text-center"><input type="checkbox" onChange={e => handleTonalMask('left', freq, 'maskedVo', e.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">Dica: Digite "NR" para Sem Resposta.</p>
          </CardContent>
        </Card>

        {/* Audiogram View */}
        <Card className="lg:col-span-2 flex justify-center items-center p-6">
          <div className="w-full max-w-[600px]">
            <AudiogramSVG rightData={tonalData.right} leftData={tonalData.left} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logoaudiometria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm font-medium text-center">
              <div>Teste</div>
              <div className="text-red-500">OD</div>
              <div className="text-blue-500">OE</div>
              
              <div className="text-left py-2">LRF (dB)</div>
              <Input value={vocalData.right.lrf} onChange={e => setVocalData({...vocalData, right: {...vocalData.right, lrf: e.target.value}})} />
              <Input value={vocalData.left.lrf} onChange={e => setVocalData({...vocalData, left: {...vocalData.left, lrf: e.target.value}})} />
              
              <div className="text-left py-2">LDT (dB)</div>
              <Input value={vocalData.right.ldt} onChange={e => setVocalData({...vocalData, right: {...vocalData.right, ldt: e.target.value}})} />
              <Input value={vocalData.left.ldt} onChange={e => setVocalData({...vocalData, left: {...vocalData.left, ldt: e.target.value}})} />
              
              <div className="text-left py-2">IPRF Monossílabos (%)</div>
              <Input value={vocalData.right.iprfMono} onChange={e => setVocalData({...vocalData, right: {...vocalData.right, iprfMono: e.target.value}})} />
              <Input value={vocalData.left.iprfMono} onChange={e => setVocalData({...vocalData, left: {...vocalData.left, iprfMono: e.target.value}})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laudo e Parecer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate('Audiometria dentro dos padrões de normalidade em ambas as orelhas.')}>
                Normal Bilateral
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate('Perda auditiva neurossensorial.')}>
                Neurossensorial
              </Button>
            </div>
            <textarea 
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Digite o parecer final aqui..."
              value={finalReport}
              onChange={e => setFinalReport(e.target.value)}
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
