-- Arquivamento de pacientes (Res. CFFa 777/2025, art. 8º): o paciente deixa de aparecer nas listas,
-- mas o prontuário (exames, anamneses) continua guardado e sincronizado.
-- O app envia o campo com o nome "archivedAt" (camelCase, como as demais colunas da tabela).
alter table public.patients add column if not exists "archivedAt" bigint;
