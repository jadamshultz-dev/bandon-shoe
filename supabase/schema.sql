-- Halcyon Days Bandon Shoe — Supabase schema (no sign-in version)
-- Players open the app and pick their name. Everyone can read the trip data.
-- Players can change their own RSVPs and basic profile details.
-- Everything else (results, pairings, handicaps, settings…) goes through
-- admin_write / admin_delete, which check a PIN that only the admins (Marc, Josh, Mike)
-- and Mike (caddie coordinator) know.
--
-- Run this once in the Supabase SQL editor, then run supabase/seed.sql,
-- then set the two PINs at the bottom of this file.

do $$
declare t text;
begin
  foreach t in array array['players','tee_times','results','settings','courses','restaurants','rooms','rides','rsvps','announcements','dinners']
  loop
    execute format('create table if not exists public.%I (
      id text primary key,
      data jsonb not null default ''{}''::jsonb,
      updated_at timestamptz not null default now(),
      updated_by text
    )', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I replica identity full', t);
    execute format('drop policy if exists read_all on public.%I', t);
    execute format('create policy read_all on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text,
  table_name text not null,
  row_id text not null,
  before jsonb,
  after jsonb
);
alter table public.audit_log enable row level security;
drop policy if exists read_all on public.audit_log;
create policy read_all on public.audit_log for select to anon, authenticated using (true);

-- PINs live here. RLS is on with no policies, so the app can never read this table.
create table if not exists public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;

-- ---------- what players can do directly ----------
drop policy if exists rsvp_write on public.rsvps;
create policy rsvp_write on public.rsvps for all to anon, authenticated using (true) with check (true);

drop policy if exists profile_update on public.players;
create policy profile_update on public.players for update to anon, authenticated using (true) with check (true);

-- Direct profile edits can't touch role, team, captaincy, name, initials or Handicap Index.
create or replace function public.guard_player_update() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.privileged', true), '') <> 'admin' then
    if (new.data -> 'role') is distinct from (old.data -> 'role')
      or (new.data -> 'team') is distinct from (old.data -> 'team')
      or (new.data -> 'captain') is distinct from (old.data -> 'captain')
      or (new.data -> 'name') is distinct from (old.data -> 'name')
      or (new.data -> 'initials') is distinct from (old.data -> 'initials')
      or (new.data -> 'index') is distinct from (old.data -> 'index') then
      raise exception 'Only an admin (Marc, Josh, Mike) can change name, team, role or Handicap Index';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_player_update on public.players;
create trigger guard_player_update before update on public.players
  for each row execute function public.guard_player_update();

-- ---------- PIN-checked writes for Marc, Josh and Mike ----------
create or replace function public.pin_role(p_pin text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from app_secrets where key = 'admin_pin' and value = p_pin) then 'admin'
    when exists (select 1 from app_secrets where key = 'caddie_pin' and value = p_pin) then 'caddie'
  end
$$;
revoke all on function public.pin_role(text) from public, anon, authenticated;

create or replace function public.check_pin(p_pin text) returns text
language plpgsql security definer set search_path = public as $$
begin
  perform pg_sleep(0.5); -- slows down guessing
  return public.pin_role(p_pin);
end $$;

create or replace function public.admin_write(p_pin text, p_actor text, p_table text, p_id text, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.pin_role(p_pin); cur jsonb;
begin
  if r is null then perform pg_sleep(0.5); raise exception 'Wrong PIN'; end if;
  if p_table not in ('players','tee_times','results','settings','courses','restaurants','rooms','rides','rsvps','announcements','dinners') then
    raise exception 'Unknown table %', p_table;
  end if;
  if r = 'caddie' then
    if p_table <> 'tee_times' then raise exception 'The caddie PIN can only change caddie assignments'; end if;
    select data into cur from tee_times where id = p_id;
    if cur is null or (p_data - 'caddies') is distinct from (cur - 'caddies') then
      raise exception 'The caddie PIN can only change caddie assignments';
    end if;
  end if;
  perform set_config('app.actor', coalesce(p_actor, r), true);
  perform set_config('app.privileged', r, true);
  execute format('insert into public.%I (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', p_table)
    using p_id, p_data;
end $$;

create or replace function public.admin_delete(p_pin text, p_actor text, p_table text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.pin_role(p_pin) is distinct from 'admin' then perform pg_sleep(0.5); raise exception 'Wrong PIN'; end if;
  if p_table not in ('players','tee_times','results','settings','courses','restaurants','rooms','rides','rsvps','announcements','dinners') then
    raise exception 'Unknown table %', p_table;
  end if;
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.privileged', 'admin', true);
  execute format('delete from public.%I where id = $1', p_table) using p_id;
end $$;

-- ---------- audit trail on every table ----------
create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text := nullif(current_setting('app.actor', true), '');
begin
  if tg_op in ('INSERT', 'UPDATE') then
    new.updated_at := now();
    new.updated_by := coalesce(who, new.updated_by);
  end if;
  insert into audit_log (actor, table_name, row_id, before, after)
  values (coalesce(who, case when tg_op = 'DELETE' then old.updated_by else new.updated_by end),
          tg_table_name, coalesce(new.id, old.id),
          case when tg_op = 'INSERT' then null else old.data end,
          case when tg_op = 'DELETE' then null else new.data end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['players','tee_times','results','settings','courses','restaurants','rooms','rides','rsvps','announcements','dinners']
  loop
    execute format('drop trigger if exists audit_%I on public.%I', t, t);
    execute format('create trigger audit_%I before insert or update or delete on public.%I for each row execute function public.write_audit()', t, t);
  end loop;
end $$;

-- ---------- realtime ----------
do $$
declare t text;
begin
  foreach t in array array['players','tee_times','results','settings','courses','restaurants','rooms','rides','rsvps','announcements','dinners']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- set the PINs (change these before you share the link) ----------
-- Use 6 or more characters. Marc, Josh and Mike share the admin PIN. The caddie PIN is spare (no one has the caddie role now).
insert into public.app_secrets (key, value) values ('admin_pin', 'CHANGE-ME-ADMIN'), ('caddie_pin', 'CHANGE-ME-CADDIE')
on conflict (key) do nothing;
-- To change one later:  update public.app_secrets set value = 'new-pin' where key = 'admin_pin';
