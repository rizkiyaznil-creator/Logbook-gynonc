# Panduan Setup Supabase (langkah demi langkah)

Untuk pemula — tidak perlu menginstal apa pun selain menyalin-tempel.

## 1. Buat proyek Supabase
1. Buka **https://supabase.com** → **Sign in** (bisa pakai akun GitHub/Google).
2. **New project** → isi:
   - **Name**: `logbook-gynonc`
   - **Database Password**: buat sandi kuat, **simpan baik-baik**.
   - **Region**: pilih **Southeast Asia (Singapore)** (terdekat dari Indonesia).
3. Klik **Create new project**, tunggu ±2 menit hingga siap.

## 2. Jalankan skema + data (sekali tempel)
1. Di sidebar kiri pilih **SQL Editor** → **New query**.
2. Buka file **`supabase/full_setup.sql`** dari repo ini, salin **seluruh** isinya.
3. Tempel ke editor → klik **Run** (atau Ctrl/Cmd+Enter).
4. Harusnya muncul **Success**. (Satu NOTICE "trigger ... does not exist, skipping" itu normal.)

> Verifikasi cepat: jalankan `select count(*) from procedures;` → harus **57**.

## 3. Ambil kunci API
1. Sidebar → **Project Settings** (ikon gerigi) → **API**.
2. Salin dua nilai:
   - **Project URL** → untuk `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Buat akun pengguna pertama
**Authentication** → **Users** → **Add user** → **Create new user** (isi email + password, centang *Auto Confirm*).

Saat user dibuat, sistem otomatis membuat profil dengan peran **residen**.

### Mengubah peran (supervisor / penguji / KPS)
Buat usernya dulu (langkah di atas), lalu di **SQL Editor** jalankan salah satu:
```sql
-- jadikan supervisor (DPJP)
update profiles set role = 'supervisor' where email = 'dpjp@rs.id';
delete from residents where id = (select id from profiles where email = 'dpjp@rs.id');

-- jadikan penguji
update profiles set role = 'penguji' where email = 'penguji@rs.id';
delete from residents where id = (select id from profiles where email = 'penguji@rs.id');

-- jadikan KPS / admin prodi
update profiles set role = 'kps' where email = 'kps@rs.id';
delete from residents where id = (select id from profiles where email = 'kps@rs.id');
```

### Menghubungkan supervisor dengan residen bimbingannya
```sql
insert into supervisor_assignments (resident_id, supervisor_id, utama)
select r.id, s.id, true
from profiles r, profiles s
where r.email = 'residen@rs.id' and s.email = 'dpjp@rs.id';
```
> Penting: supervisor hanya bisa memverifikasi entri residen yang **ditugaskan** padanya.

## 5. Jalankan aplikasi
```bash
cp .env.example .env.local      # lalu isi URL & anon key dari langkah 3
npm install
npm run dev
```
Buka **http://localhost:3000** → login dengan akun yang dibuat.

## 6. (Opsional) Deploy ke Vercel
1. Push repo ke GitHub (sudah).
2. Di **vercel.com** → **Add New Project** → import repo ini.
3. Tambahkan dua Environment Variables (URL & anon key) → **Deploy**.

## Jika skema berubah di kemudian hari
Setelah mengedit `data/*.json` atau migrasi:
```bash
npm run seed:gen     # regenerasi seed.sql
```
Lalu regenerasi `full_setup.sql` (gabungan migrasi + seed) bila perlu, atau jalankan
hanya migrasi baru di SQL Editor.
