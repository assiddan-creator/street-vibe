-- Street Vibe — billing column. Run once in the Supabase SQL editor, after
-- supabase/schema.sql. Safe to re-run.
alter table public.users add column if not exists ls_customer_id text;
create index if not exists users_ls_customer_id_idx on public.users (ls_customer_id);
