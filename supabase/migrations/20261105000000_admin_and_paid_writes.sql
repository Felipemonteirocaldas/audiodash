-- Conta mestre no banco (antes era um e-mail fixo no código) e escrita só com assinatura válida.
-- Leitura continua livre para o dono: o pull não pode receber vazio de quem está sem assinatura,
-- porque ele apaga localmente o que já estava sincronizado e não veio da nuvem.
begin;

alter table public.users add column if not exists is_admin boolean not null default false;
update public.users set is_admin = true
where id in (select id from auth.users where lower(email) = 'blckdogbrasil@gmail.com');

-- Mesma regra de hasPaidAccess em src/lib/settingsStatus.ts. SECURITY INVOKER: lê só a própria linha (RLS de users).
create or replace function public.has_paid_access() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((
    select u.is_admin or (u.subscription_status in ('active', 'canceled') and u.subscription_end_date > now())
    from public.users u where u.id = (select auth.uid())
  ), false)
$$;
revoke execute on function public.has_paid_access() from public, anon;
grant execute on function public.has_paid_access() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['patients', 'audiometries', 'anamneses', 'appointments', 'settings'] loop
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner_insert_paid" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and (select public.has_paid_access()))', t);
    execute format('create policy "owner_update_paid" on public.%I for update to authenticated using ((select auth.uid()) = user_id and (select public.has_paid_access())) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner_delete_paid" on public.%I for delete to authenticated using ((select auth.uid()) = user_id and (select public.has_paid_access()))', t);
  end loop;
end $$;

commit;
