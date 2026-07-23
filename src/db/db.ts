import Dexie, { type EntityTable } from 'dexie';

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string; // YYYY-MM-DD
  gender: string;
  occupation: string;
  phone: string;
  notes: string;
  rg?: string;
  ssp?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
}

// Header Info
export interface ExamHeader {
  audiometer?: string;
  impedanciometer?: string;
  requestingPhysician?: string;
  speechTherapist?: string;
}

// Tonal Audiometry
export type TonalFrequency = '125' | '250' | '500' | '750' | '1000' | '1500' | '2000' | '3000' | '4000' | '6000' | '8000';
export type TonalPoint = {
  va?: number | 'NR';
  vo?: number | 'NR';
  maskedVa?: boolean;
  maskedVo?: boolean;
};
export type EarTonalData = Record<TonalFrequency, TonalPoint>;

// Masking
export interface MaskingData {
  va1?: string; 
  va2?: string;
  vo1?: string;
  vo2?: string;
}

// Logo-audiometry (Speech)
export interface SRTData {
  db?: number | string;
  masking?: string;
  unit?: string;
}

export interface IRFPoint {
  db?: number | string;
  percentage?: number | string;
  masking?: string;
}

export interface IRFData {
  mono?: IRFPoint;
  dis?: IRFPoint;
  tris?: IRFPoint;
}

export interface VoiceDetectionData {
  db?: number | string;
  masking?: string;
  unit?: string;
}

export interface LogoAudiometryData {
  srt: SRTData;
  irf: IRFData;
  voiceDetection: VoiceDetectionData;
}

// Tympanometry
export interface TympanometryData {
  peak?: string | number;
  compliance200?: string | number;
  volume?: string | number;
}

// Stapedial Reflex
export type ReflexFrequency = '500' | '1000' | '2000' | '4000';
export interface ReflexPoint {
  limiar?: string | number;
  contra?: string | number;
  dif?: string | number;
  ipsi?: string | number;
  decay?: string | number;
}
export type EarReflexData = Record<ReflexFrequency, ReflexPoint>;

export interface Audiometry {
  id: string;
  patientId: string;
  examDate: string; // YYYY-MM-DD
  
  header: ExamHeader;
  
  tonalData: {
    right: Partial<EarTonalData>;
    left: Partial<EarTonalData>;
  };
  
  tonalMasking: {
    right: MaskingData;
    left: MaskingData;
  };
  
  logoAudiometry: {
    right: LogoAudiometryData;
    left: LogoAudiometryData;
  };
  
  tympanometry: {
    right: TympanometryData;
    left: TympanometryData;
  };
  
  reflexes: {
    right: Partial<EarReflexData>;
    left: Partial<EarReflexData>;
    sondaOD?: string;
    sondaOE?: string;
  };

  resultAndConduct: string; // "Resultado / Conduta"
  
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
}

export interface Settings {
  id: string;
  clinicName: string;
  professionalName: string;
  crfaNumber: string;
  phone: string;
  address: string;
  logoUrl: string;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
}

const db = new Dexie('AudioDashDB_v3') as Dexie & {
  patients: EntityTable<Patient, 'id'>;
  audiometries: EntityTable<Audiometry, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

// Schema declaration
db.version(3).stores({
  patients: 'id, name, cpf, syncStatus',
  audiometries: 'id, patientId, examDate, syncStatus',
  settings: 'id, syncStatus'
});

export { db };
