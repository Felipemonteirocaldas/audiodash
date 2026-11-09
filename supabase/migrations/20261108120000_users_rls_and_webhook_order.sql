-- Auditoria de 08/11/2026 (docs/PLANO-CORRECOES-AUDITORIA.md).
-- 1. Ordem dos eventos do webhook da Dodo: guarda o horário do último evento aplicado.
-- 2. public.users: nenhuma migração ativava RLS nem definia política. Desde 20261105000000 o banco libera escrita
--    pelo has_paid_access(), que lê esta tabela; se o usuário pudesse alterar a própria linha (is_admin,
--    subscription_status, subscription_end_date), ganharia escrita paga. O app só LÊ a própria linha
--    (AuthContext, Paywall); quem grava é o gatilho handle_new_user (security definer) e o webhook (service role),
--    que ignoram RLS.
-- ANTES DE RODAR: conferir no painel (Authentication > Policies > users) as políticas atuais. Esta migração
-- remove TODAS as políticas de public.users e deixa só a leitura da própria linha.
begin;

alter table public.users add column if not exists last_webhook_at timestamptz;

alter table public.users enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', p.policyname);
  end loop;
end $$;

create policy "own_row_select" on public.users for select to authenticated
  using ((select auth.uid()) = id);

-- Sem políticas de insert/update/delete para anon/authenticated: só service role e security definer gravam.
revoke insert, update, delete on public.users from anon, authenticated;

commit;

notify pgrst, 'reload schema';
