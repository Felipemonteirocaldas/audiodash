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
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
}

export type TonalPoint = {
  va?: number | 'NR';
  vo?: number | 'NR';
  maskedVa?: boolean;
  maskedVo?: boolean;
};

export type EarTonalData = Record<string, TonalPoint>; // e.g., '125': { va: 10, ... }

export interface Audiometry {
  id: string;
  patientId: string;
  examDate: string; // YYYY-MM-DD
  anamnesis: {
    queixa: string;
    zumbido: string;
    tontura: string;
    exposicaoRuido: string;
  };
  tonalData: {
    right: EarTonalData;
    left: EarTonalData;
  };
  vocalData: {
    right: { lrf?: number; ldt?: number; iprfMono?: number; iprfDi?: number };
    left: { lrf?: number; ldt?: number; iprfMono?: number; iprfDi?: number };
  };
  pureToneAverage: {
    right: { tritonal?: number; quadritonal?: number };
    left: { tritonal?: number; quadritonal?: number };
  };
  hearingLossDegree: {
    right: string;
    left: string;
  };
  finalReport: string;
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

const db = new Dexie('AudioDashDB_v2') as Dexie & {
  patients: EntityTable<Patient, 'id'>;
  audiometries: EntityTable<Audiometry, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

// Schema declaration
db.version(2).stores({
  patients: 'id, name, cpf, syncStatus',
  audiometries: 'id, patientId, examDate, syncStatus',
  settings: 'id, syncStatus'
});

export { db };
