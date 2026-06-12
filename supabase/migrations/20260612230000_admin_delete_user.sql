-- Admin can delete any member (not just pending signups). Most child rows
-- cascade off profiles, but three references don't and must be handled or
-- the delete fails: events.created_by (not null — reassign to the acting
-- admin), pairings.our_player_id (delete the rows), games.last_edited_by
-- (nullable — null it out).
create or replace function public.admin_delete_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can delete members';
  end if;
  if uid = (select auth.uid()) then
    raise exception 'admins cannot delete their own account';
  end if;

  update public.events set created_by = (select auth.uid())
  where created_by = uid;
  update public.games set last_edited_by = null
  where last_edited_by = uid;
  delete from public.pairings where our_player_id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
