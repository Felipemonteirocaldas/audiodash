import { Audiometry, Patient } from '@/db/db';
import { customAlert } from '@/lib/dialogs';

export const exportToDocx = async (exam: Audiometry, patient: Patient) => {
  await customAlert('Exportação para Word está temporariamente desativada devido à atualização da estrutura do exame.');
};
