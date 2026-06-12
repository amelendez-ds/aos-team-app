-- Open registration with admin approval: new accounts are 'pending' until
-- the admin approves them; pending users only ever see /pending.

-- ---------------------------------------------------------------------------
-- profiles: status + email
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column status text not null default 'pending'
    check (status in ('pending', 'active')),
  add column email text;

-- Everyone already in the app is the existing team — activate them, or this
-- deploy would lock out every current user including the admin.
update public.profiles set status = 'active';

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

-- ---------------------------------------------------------------------------
-- Signup trigger: store email, gate status (owner email goes straight in).
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, status, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    case when new.email = 'alvaromegu90@gmail.com' then 'admin' else 'player' end,
    case when new.email = 'alvaromegu90@gmail.com' then 'active' else 'pending' end,
    new.email
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard: status joins role as admin-only columns. Without this a pending
-- user could PATCH their own row to status='active' via the REST API
-- (profiles_update_own permits own-row updates; only role was guarded).
-- ---------------------------------------------------------------------------
create or replace function private.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'only admins can change roles';
  end if;
  if new.status is distinct from old.status and not private.is_admin() then
    raise exception 'only admins can change account status';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reject: remove the auth user (cascades to profiles and everything below).
-- SECURITY DEFINER because clients have no access to the auth schema; the
-- admin check lives inside, and only pending accounts can ever be deleted.
-- ---------------------------------------------------------------------------
create or replace function public.reject_pending_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can reject signups';
  end if;
  if not exists (
    select 1 from public.profiles where id = uid and status = 'pending'
  ) then
    raise exception 'user is not a pending signup';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.reject_pending_user(uuid) from public;
grant execute on function public.reject_pending_user(uuid) to authenticated;
