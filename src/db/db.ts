import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Senha (hash ou plain text simples para Dexie local)
  createdAt: number;
  subscriptionStatus?: 'active' | 'inactive' | 'past_due' | 'canceled' | null;
  stripeCustomerId?: string | null;
}

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
  user_id?: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientId?: string; // Optional link to a registered patient
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string; // Type of exam/consultation
  status: 'scheduled' | 'completed' | 'canceled';
  notes?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
  user_id?: string;
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

// Meatoscopy (Inspeção)
export interface Meatoscopy {
  right: 'normal' | 'cerumen' | 'foreign_body' | 'perforation' | 'other' | '';
  left: 'normal' | 'cerumen' | 'foreign_body' | 'perforation' | 'other' | '';
  rightDescription?: string;
  leftDescription?: string;
  referToENT?: boolean;
}

// Complementary Tests
export interface ComplementaryTests {
  weber?: string;
  toneDecay?: string;
}

// Audiological Opinion (Parecer)
export interface AudiologicalOpinion {
  clinical?: string; // e.g., Normal, Alterado
  lossTypeRight?: string; // Tipo de Perda OD
  lossTypeLeft?: string; // Tipo de Perda OE
  lossDegreeRight?: string; // Grau de Perda OD
  lossDegreeLeft?: string; // Grau de Perda OE
  hearingReduction?: string; // Redução da Audição
  configurationRight?: string; // Configuração OD
  configurationLeft?: string; // Configuração OE
  opinionText?: string;
}

// Anamnesis
export interface Anamnesis {
  id: string;
  patientId: string;
  examDate: string;
  
  // Occupational
  company?: string;
  role?: string;
  sector?: string;
  dailyHours?: string;
  timeAtCompany?: string;
  noiseExposure?: 'sim' | 'nao' | '';
  chemicalExposure?: 'sim' | 'nao' | '';
  ppe?: 'concha' | 'plug' | 'outro' | 'nenhum' | '';
  ppeTime?: string;
  
  // Clinical
  tinnitus?: 'sim' | 'nao' | '';
  dizziness?: 'sim' | 'nao' | '';
  earache?: 'sim' | 'nao' | '';
  hearingDifficulty?: 'sim' | 'nao' | '';
  familyHistory?: 'sim' | 'nao' | '';
  surgery?: string;
  diabetes?: 'sim' | 'nao' | '';
  hypertension?: 'sim' | 'nao' | '';
  
  notes?: string;

  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
  user_id?: string;
}

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

  examPurpose?: 'referencial' | 'sequencial' | 'outro';
  examCategory?: 'clinico' | 'ocupacional';
  freeField?: Partial<EarTonalData>;

  meatoscopy?: Meatoscopy;
  complementary?: ComplementaryTests;
  opinion?: AudiologicalOpinion;

  resultAndConduct: string; // "Resultado / Conduta"
  
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
  user_id?: string;
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
  user_id?: string;
}

const db = new Dexie('AudioDashDB_v6') as Dexie & {
  users: EntityTable<User, 'id'>;
  patients: EntityTable<Patient, 'id'>;
  audiometries: EntityTable<Audiometry, 'id'>;
  anamneses: EntityTable<Anamnesis, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  appointments: EntityTable<Appointment, 'id'>;
};

// Schema declaration
db.version(7).stores({
  users: 'id, email',
  patients: 'id, user_id, name, cpf, syncStatus',
  audiometries: 'id, user_id, patientId, examDate, syncStatus',
  anamneses: 'id, user_id, patientId, examDate, syncStatus',
  settings: 'id, user_id, syncStatus',
  appointments: 'id, user_id, date, status, syncStatus'
});

export { db };
