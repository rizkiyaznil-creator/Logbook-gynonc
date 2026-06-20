-- =====================================================================
-- 0009_auth_trigger.sql — Buat profil otomatis saat pengguna mendaftar
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'residen')
  );
  -- Bila peran residen, buat baris residents sekalian.
  if coalesce((new.raw_user_meta_data->>'role'), 'residen') = 'residen' then
    insert into public.residents (id) values (new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
