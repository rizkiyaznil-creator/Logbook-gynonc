-- =====================================================================
-- 0016_avatar.sql — Foto profil (opsional)
-- =====================================================================

-- URL foto profil; null = pakai inisial nama.
alter table profiles add column avatar_url text;

-- Bucket penyimpanan avatar (public read agar mudah ditampilkan via CDN).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Path objek memakai konvensi "<uid>/...": tiap user hanya boleh menulis
-- ke foldernya sendiri. Membaca bersifat publik (bucket public).
create policy "avatar_baca_publik" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatar_unggah_sendiri" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_ubah_sendiri" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_hapus_sendiri" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
