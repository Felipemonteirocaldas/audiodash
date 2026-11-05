-- Security Advisor (04/11/2026): handle_new_user é SECURITY DEFINER e podia ser chamada pela API por anon/authenticated.
-- Ela só deve rodar pelo gatilho on_auth_user_created; o gatilho continua funcionando sem o EXECUTE desses papéis.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
