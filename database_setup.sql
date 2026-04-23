-- ==============================================================================
-- SCRIPT SETUP DATABASE & ADMIN BSIB MAINTENANCE
-- Jalankan script ini di menu "SQL Editor" pada Supabase Dashboard Anda.
-- ==============================================================================

-- 1. Aktifkan ekstensi yang dibutuhkan (jika belum ada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat tabel 'profiles' jika belum ada
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  nama text NOT NULL,
  nrp text,
  jabatan text,
  role text DEFAULT 'User',
  site text,
  foto text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- 3. Setup Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Kebijakan agar siapa saja bisa melihat profil (dibutuhkan untuk menampilkan tabel User Management)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);

-- Kebijakan agar user dapat memperbarui datanya sendiri (atau insert)
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." 
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- 4. Buat Akun Admin Master (auth.users & public.profiles)
DO $$
DECLARE
  new_admin_id uuid := 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d'; -- ID Statis untuk Admin
BEGIN
  -- Hapus jika sudah ada (untuk menghindari error unique constraint saat menjalankan ulang)
  DELETE FROM auth.users WHERE id = new_admin_id OR email = 'admin@bsib.com';

  -- Masukkan ke auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_admin_id,
    'authenticated',
    'authenticated',
    'admin@bsib.com', -- Format email dummy untuk login username
    crypt('admin123', gen_salt('bf')), -- Password default
    current_timestamp,
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp,
    '',
    '',
    '',
    ''
  );

  -- Masukkan ke public.profiles
  INSERT INTO public.profiles (id, username, nama, nrp, jabatan, role, site)
  VALUES (
    new_admin_id,
    'admin', -- Username untuk login
    'Admin BSIB',
    'NRP-000',
    'Super Administrator',
    'Admin',
    'HO Balikpapan'
  );

END $$;

-- ==============================================================================
-- 5. Tabel Pemasukan Spare Part (spare_parts_in)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.spare_parts_in (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_user text NOT NULL,
  tanggal date NOT NULL,
  kategori text NOT NULL,
  nama_sparepart text NOT NULL,
  part_number text,
  jumlah integer NOT NULL CHECK (jumlah > 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS untuk spare_parts_in
ALTER TABLE public.spare_parts_in ENABLE ROW LEVEL SECURITY;

-- Admin & Mekanik bisa melihat semua data pemasukan (Tabel Riwayat)
DROP POLICY IF EXISTS "Spare parts viewable by everyone." ON public.spare_parts_in;
CREATE POLICY "Spare parts viewable by everyone." 
  ON public.spare_parts_in FOR SELECT USING (true);

-- User hanya bisa memasukkan data (Insert) atas namanya sendiri
DROP POLICY IF EXISTS "Users can insert spare parts." ON public.spare_parts_in;
CREATE POLICY "Users can insert spare parts." 
  ON public.spare_parts_in FOR INSERT WITH CHECK (auth.uid() = user_id);

