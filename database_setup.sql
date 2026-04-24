-- ==============================================================================
-- SCRIPT SETUP DATABASE BSIB MAINTENANCE (MASTER)
-- Jalankan script ini di menu "SQL Editor" pada Supabase Dashboard Anda.
-- ==============================================================================

-- 1. Aktifkan ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 13. RPC Functions for Bulk Upload (Atomicity)
-- ==============================================================================

-- Bulk Upload Spareparts
CREATE OR REPLACE FUNCTION public.bulk_upload_spareparts(
  payload jsonb,
  p_user_id uuid,
  p_nama_user text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_item jsonb;
  v_sp_id uuid;
BEGIN
  FOR row_item IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    -- 1. Get or create sparepart
    SELECT id INTO v_sp_id 
    FROM public.spareparts 
    WHERE nama_sparepart = (row_item->>'nama') 
      AND kategori = (row_item->>'kategori')
      AND (part_number IS NOT DISTINCT FROM (row_item->>'partNumber'));

    IF v_sp_id IS NULL THEN
      INSERT INTO public.spareparts (nama_sparepart, part_number, kategori, satuan, merk, stok)
      VALUES (
        (row_item->>'nama'),
        (row_item->>'partNumber'),
        (row_item->>'kategori'),
        (row_item->>'satuan'),
        COALESCE((row_item->>'merk'), '-'),
        0
      )
      RETURNING id INTO v_sp_id;
    END IF;

    -- 2. Insert history (this triggers the stock update)
    INSERT INTO public.sparepart_history (sparepart_id, user_id, nama_user, tipe, jumlah, tanggal, keterangan)
    VALUES (
      v_sp_id,
      p_user_id,
      p_nama_user,
      'IN',
      (row_item->>'jumlah')::integer,
      (row_item->>'tanggal')::date,
      COALESCE((row_item->>'keterangan'), 'Bulk Upload')
    );
  END LOOP;
END;
$$;

-- Bulk Upload Oil & Consumables
CREATE OR REPLACE FUNCTION public.bulk_upload_oil_consumables(
  payload jsonb,
  p_user_id uuid,
  p_nama_user text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_item jsonb;
  v_item_id uuid;
BEGIN
  FOR row_item IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    -- 1. Get or create item
    SELECT id INTO v_item_id 
    FROM public.oil_consumables 
    WHERE nama_barang = (row_item->>'nama') 
      AND kategori = (row_item->>'kategori');

    IF v_item_id IS NULL THEN
      INSERT INTO public.oil_consumables (nama_barang, kategori, satuan, merk, stok)
      VALUES (
        (row_item->>'nama'),
        (row_item->>'kategori'),
        (row_item->>'satuan'),
        COALESCE((row_item->>'merk'), '-'),
        0
      )
      RETURNING id INTO v_item_id;
    END IF;

    -- 2. Insert history (this triggers the stock update)
    INSERT INTO public.oil_consumable_history (oil_consumable_id, user_id, nama_user, tipe, jumlah, tanggal, keterangan)
    VALUES (
      v_item_id,
      p_user_id,
      p_nama_user,
      'IN',
      (row_item->>'jumlah')::integer,
      (row_item->>'tanggal')::date,
      COALESCE((row_item->>'keterangan'), 'Bulk Upload')
    );
  END LOOP;
END;
$$;

-- 2. Tabel Profiles
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

-- 3. Tabel Spare Parts
CREATE TABLE IF NOT EXISTS public.spareparts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_sparepart text NOT NULL,
  part_number text,
  merk text,
  kategori text NOT NULL,
  satuan text DEFAULT 'pcs',
  stok integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique index to prevent duplicate parts with same name, P/N, and category
CREATE UNIQUE INDEX IF NOT EXISTS spareparts_identity_idx ON public.spareparts (nama_sparepart, COALESCE(part_number, ''), kategori);

-- 4. Tabel Spare Part History
CREATE TABLE IF NOT EXISTS public.sparepart_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sparepart_id uuid REFERENCES public.spareparts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  nama_user text,
  tipe text NOT NULL, -- IN, OUT
  jumlah integer NOT NULL,
  tanggal date NOT NULL,
  keterangan text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Oil & General Consumables
CREATE TABLE IF NOT EXISTS public.oil_consumables (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_barang text NOT NULL,
  kategori text NOT NULL, -- Lube, General Consumable
  merk text,
  satuan text DEFAULT 'Liter',
  stok integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Oil & Consumable History
CREATE TABLE IF NOT EXISTS public.oil_consumable_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  oil_consumable_id uuid REFERENCES public.oil_consumables(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  nama_user text,
  tipe text NOT NULL, -- IN, OUT
  jumlah integer NOT NULL,
  tanggal date NOT NULL,
  keterangan text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Trigger untuk Update Stok Otomatis (Spareparts)
CREATE OR REPLACE FUNCTION update_sparepart_stok()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.tipe = 'IN') THEN
      UPDATE public.spareparts SET stok = stok + NEW.jumlah, updated_at = now() WHERE id = NEW.sparepart_id;
    ELSIF (NEW.tipe = 'OUT') THEN
      UPDATE public.spareparts SET stok = stok - NEW.jumlah, updated_at = now() WHERE id = NEW.sparepart_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hapus SEMUA trigger yang mungkin ada di tabel history (otomatis mendeteksi nama apapun)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_table = 'sparepart_history'
          AND trigger_schema = 'public'
    ) 
    LOOP
        EXECUTE 'DROP TRIGGER ' || r.trigger_name || ' ON public.' || r.event_object_table;
    END LOOP;
END $$;

CREATE TRIGGER tr_update_sparepart_stok
AFTER INSERT ON public.sparepart_history
FOR EACH ROW EXECUTE FUNCTION update_sparepart_stok();

-- 8. Trigger untuk Update Stok Otomatis (Oil & Consumables)
CREATE OR REPLACE FUNCTION update_oil_consumable_stok()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.tipe = 'IN') THEN
      UPDATE public.oil_consumables SET stok = stok + NEW.jumlah, updated_at = now() WHERE id = NEW.oil_consumable_id;
    ELSIF (NEW.tipe = 'OUT') THEN
      UPDATE public.oil_consumables SET stok = stok - NEW.jumlah, updated_at = now() WHERE id = NEW.oil_consumable_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hapus SEMUA trigger yang mungkin ada di tabel oil history
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_table = 'oil_consumable_history'
          AND trigger_schema = 'public'
    ) 
    LOOP
        EXECUTE 'DROP TRIGGER ' || r.trigger_name || ' ON public.' || r.event_object_table;
    END LOOP;
END $$;

CREATE TRIGGER tr_update_oil_consumable_stok
AFTER INSERT ON public.oil_consumable_history
FOR EACH ROW EXECUTE FUNCTION update_oil_consumable_stok();

-- 9. Setup Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own profile." ON public.profiles;
CREATE POLICY "Users can manage own profile." ON public.profiles FOR ALL USING (auth.uid() = id);

ALTER TABLE public.spareparts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Spareparts viewable by everyone." ON public.spareparts;
CREATE POLICY "Spareparts viewable by everyone." ON public.spareparts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage spareparts." ON public.spareparts;
CREATE POLICY "Admin can manage spareparts." ON public.spareparts FOR ALL USING (true);

ALTER TABLE public.sparepart_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sparepart history viewable by everyone." ON public.sparepart_history;
CREATE POLICY "Sparepart history viewable by everyone." ON public.sparepart_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert history." ON public.sparepart_history;
CREATE POLICY "Authenticated users can insert history." ON public.sparepart_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.oil_consumables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Oil consumables viewable by everyone." ON public.oil_consumables;
CREATE POLICY "Oil consumables viewable by everyone." ON public.oil_consumables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage oil consumables." ON public.oil_consumables;
CREATE POLICY "Admin can manage oil consumables." ON public.oil_consumables FOR ALL USING (true);

ALTER TABLE public.oil_consumable_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Oil history viewable by everyone." ON public.oil_consumable_history;
CREATE POLICY "Oil history viewable by everyone." ON public.oil_consumable_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert oil history." ON public.oil_consumable_history;
CREATE POLICY "Authenticated users can insert oil history." ON public.oil_consumable_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ==============================================================================
-- 10. Tabel Units (Manajemen Unit / Alat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.units (
  id text PRIMARY KEY, -- Nomor Lambung, e.g. AFT-016
  type text NOT NULL,  -- Kategori: Excavator, MMU, ANFO Truck, dll
  pabrikan text NOT NULL,
  model text NOT NULL,
  current_hm integer DEFAULT 0,
  site text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Units viewable by everyone." ON public.units;
CREATE POLICY "Units viewable by everyone." ON public.units FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage units." ON public.units;
CREATE POLICY "Admin can manage units." ON public.units FOR ALL USING (true);

-- ==============================================================================
-- 11. Tabel Reports (Laporan Perbaikan / Weekly Service)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
  type text NOT NULL, -- weekly, service, pump
  sub_type text,
  date_start date,
  date_end date,
  ma_percent numeric,
  activities text,
  remarks text,
  checklist jsonb,
  user_id uuid REFERENCES auth.users(id),
  nama_user text,
  status text DEFAULT 'Final',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports viewable by everyone." ON public.reports;
CREATE POLICY "Reports viewable by everyone." ON public.reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage reports." ON public.reports;
CREATE POLICY "Authenticated users can manage reports." ON public.reports FOR ALL USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 12. Tabel Service History & Detail
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.service_records (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  unit_id text NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  service_type text NOT NULL, -- Periodic Service, Repair, etc.
  hm_service integer NOT NULL,
  tanggal date NOT NULL,
  keterangan text,
  user_id uuid REFERENCES auth.users(id),
  nama_user text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_parts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id uuid REFERENCES public.service_records(id) ON DELETE CASCADE,
  sparepart_id uuid REFERENCES public.spareparts(id),
  jumlah integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_oils (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id uuid REFERENCES public.service_records(id) ON DELETE CASCADE,
  oil_consumable_id uuid REFERENCES public.oil_consumables(id),
  jumlah integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Service Records
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service records viewable by everyone." ON public.service_records;
CREATE POLICY "Service records viewable by everyone." ON public.service_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage service records." ON public.service_records;
CREATE POLICY "Admin can manage service records." ON public.service_records FOR ALL USING (true);

ALTER TABLE public.service_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service parts viewable by everyone." ON public.service_parts;
CREATE POLICY "Service parts viewable by everyone." ON public.service_parts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage service parts." ON public.service_parts;
CREATE POLICY "Admin can manage service parts." ON public.service_parts FOR ALL USING (true);

ALTER TABLE public.service_oils ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service oils viewable by everyone." ON public.service_oils;
CREATE POLICY "Service oils viewable by everyone." ON public.service_oils FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage service oils." ON public.service_oils;
CREATE POLICY "Admin can manage service oils." ON public.service_oils FOR ALL USING (true);
