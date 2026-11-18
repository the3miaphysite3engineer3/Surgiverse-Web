-- 0001_web_support.sql
-- Additive support for the SurgiVerse web app on top of the Unity-era schema.
-- Safe to re-run: every statement is guarded / idempotent.

-- ---------------------------------------------------------------------------
-- 1. surgeries: fields the web app reads/writes
--    (procedureName: legacy attempts match by name; professorName: PDF report;
--     legacyId: Firestore doc id kept for the one-time data migration)
-- ---------------------------------------------------------------------------
alter table public.surgeries add column if not exists "procedureName" text not null default '';
alter table public.surgeries add column if not exists "professorName" text;
alter table public.surgeries add column if not exists "legacyId" text;

-- NULLs are distinct in Postgres, so multiple un-migrated rows are fine.
create unique index if not exists surgeries_legacy_id_key
  on public.surgeries ("legacyId");

-- ---------------------------------------------------------------------------
-- 2. attempts: fields the web app reads (error list, bleeding events in the
--    PDF report). Written historically by the Unity client into Firestore.
-- ---------------------------------------------------------------------------
alter table public.attempts add column if not exists errors jsonb not null default '[]';
alter table public.attempts add column if not exists "bleedingEventsCount" integer;

-- ---------------------------------------------------------------------------
-- 3. attempt_messages: OpenRouter reasoning details (AIAssistant persists them)
-- ---------------------------------------------------------------------------
alter table public.attempt_messages add column if not exists reasoning_details jsonb;

-- ---------------------------------------------------------------------------
-- 4. Realtime: the AI chat transcript subscribes to new attempt_messages rows.
--    RLS on the table is enforced for postgres_changes subscribers.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attempt_messages'
  ) then
    alter publication supabase_realtime add table public.attempt_messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Auto-create the users row on signup.
--    Names arrive via signUp() user metadata (firstName / lastName); runs as
--    security definer so it bypasses RLS. admin.createUser also fires this,
--    which covers the Firebase data migration.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users ("uid", email, "firstName", "lastName")
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'firstName', new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'lastName',  new.raw_user_meta_data->>'last_name',  '')
  )
  on conflict ("uid") do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
