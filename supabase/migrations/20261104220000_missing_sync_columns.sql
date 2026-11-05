-- Colunas que o app envia e que faltavam no Supabase (conferido em 04/11/2026 consultando cada coluna pela API).
-- Sem elas, o upsert falha com PGRST204 e os registros ficam só no navegador (syncStatus = 'pending').
-- Os nomes seguem o padrão camelCase das demais colunas. Objetos do exame vão como jsonb, como header/tonalData.

alter table public.audiometries add column if not exists "examPurpose" text;
alter table public.audiometries add column if not exists "examCategory" text;
alter table public.audiometries add column if not exists "freeField" jsonb;
alter table public.audiometries add column if not exists meatoscopy jsonb;
alter table public.audiometries add column if not exists complementary jsonb;
alter table public.audiometries add column if not exists opinion jsonb;

alter table public.appointments add column if not exists phone text;

-- Mesma coluna de 20261021190000_patients_archived_at.sql, que não tinha sido aplicada.
alter table public.patients add column if not exists "archivedAt" bigint;

-- Recarrega o cache de esquema do PostgREST para as colunas valerem sem reiniciar.
notify pgrst, 'reload schema';
