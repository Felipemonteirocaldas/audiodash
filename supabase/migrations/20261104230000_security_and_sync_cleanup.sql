-- Auditoria do banco em 04/11/2026 (SQL Editor, projeto audiodash). Ver docs/CONTINUIDADE.md.
-- Corrige acesso anônimo aos dados, organiza as políticas e deixa a sincronização por usuário consistente.
begin;

-- 1. Políticas: havia 12 políticas "Allow anonymous ..." com USING/CHECK true em patients, audiometries e settings
--    (qualquer pessoa com a chave pública lia e alterava dados de todos) e 3–4 políticas repetidas por tabela.
--    Fica uma política por tabela, só para usuários autenticados e só sobre as próprias linhas.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('patients', 'audiometries', 'anamneses', 'appointments', 'settings')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "owner_all" on public.patients for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner_all" on public.audiometries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner_all" on public.anamneses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner_all" on public.appointments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner_all" on public.settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 2. Dono padrão: se o app não mandar user_id, o banco usa o usuário da sessão.
--    (NOT NULL fica de fora: há 2 pacientes e 1 exame antigos sem dono, de antes do RLS; não foram apagados.)
alter table public.patients     alter column user_id set default auth.uid();
alter table public.audiometries alter column user_id set default auth.uid();
alter table public.anamneses    alter column user_id set default auth.uid();
alter table public.appointments alter column user_id set default auth.uid();
alter table public.settings     alter column user_id set default auth.uid();

-- 3. Configurações: o app grava sempre o id "settings_1". Com a chave só em id, o segundo usuário colidia com
--    a linha do primeiro e não sincronizava. A chave passa a ser (user_id, id): cada usuário tem a sua "settings_1".
alter table public.settings alter column user_id set not null;
alter table public.settings drop constraint settings_pkey;
alter table public.settings add primary key (user_id, id);

-- 4. Índices para o pull (where user_id = ...), para o RLS e para as buscas por paciente.
create index if not exists patients_user_id_idx      on public.patients (user_id);
create index if not exists audiometries_user_id_idx  on public.audiometries (user_id);
create index if not exists audiometries_patient_idx  on public.audiometries ("patientId");
create index if not exists anamneses_user_id_idx     on public.anamneses (user_id);
create index if not exists anamneses_patient_idx     on public.anamneses ("patientId");
create index if not exists appointments_user_id_idx  on public.appointments (user_id);

-- 5. Perfil de assinatura: 3 de 6 contas não tinham linha em public.users (criadas antes do gatilho).
insert into public.users (id, email, subscription_status)
select id, email, 'inactive' from auth.users
on conflict (id) do nothing;

-- Função do gatilho com search_path fixo (security definer sem search_path é alerta do Supabase).
alter function public.handle_new_user() set search_path = '';

commit;

-- 6. Storage (fora da transação acima: as tabelas de storage pertencem a outro papel e podem recusar a alteração).
--    O bucket "audiometry-reports" estava público, com envio/alteração/exclusão anônimos. Estava vazio e o app
--    não o usa desde a remoção do storageService. Fica privado e sem essas políticas.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'storage'
           and policyname in ('Allow public read access on bucket', 'Allow anonymous upload on bucket', 'Allow anonymous update on bucket', 'Allow anonymous delete on bucket')
  loop
    execute format('drop policy %I on storage.%I', p.policyname, p.tablename);
  end loop;
end $$;
update storage.buckets set public = false where id = 'audiometry-reports';

notify pgrst, 'reload schema';
