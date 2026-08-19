-- Phase 1 follow-up (wishlist fix): every new auth user gets a `customers` row.
--
-- `customers` was only created synchronously by the signup/profile/influencer
-- routes, so users signing in via Google OAuth or magic link had NO customers
-- row -> `wishlist_items.customer_id` FK violations -> add-to-wishlist 500 and
-- a heart that never lit up. This trigger closes that gap for all future
-- sign-ins (a lazy ensure also runs in the wishlist route for existing users).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customers (id, full_name, email, phone, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger functions do not check EXECUTE at fire time; still, restrict direct
-- calls. The function is security definer and owned by the table owner, so it
-- bypasses customers RLS (owner bypass) while the insert is limited to the
-- caller's own auth.uid()-matched id in practice.
revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();