import { supabase } from '../lib/supabase';

/**
 * Faz o upload de um arquivo (por exemplo, um PDF) para o bucket de armazenamento.
 * @param file O arquivo a ser enviado (Blob ou File)
 * @param fileName O nome do arquivo no storage (ex: 'paciente_uuid/exame_uuid.pdf')
 * @returns A URL pública do arquivo ou null em caso de erro
 */
export const uploadReportToStorage = async (file: Blob | File, fileName: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('audiometry-reports')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // Sobrescreve se já existir
      });

    if (error) {
      console.error('Erro ao fazer upload do relatório:', error);
      return null;
    }

    // Retorna a URL pública
    const { data: publicUrlData } = supabase.storage
      .from('audiometry-reports')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Erro inesperado no upload:', err);
    return null;
  }
};
