-- =============================================================================
-- CAREUP MOBİL DEPO VE STOK TAKİP SİSTEMİ - RESMİ VERİTABANI ŞEMASI (TEMİZ / BOŞ)
-- Pamukkale Üniversitesi Endüstri Mühendisliği - Sistem Analizi ve Tasarımı
-- =============================================================================
-- Bu betik hiçbir yapay/örnek veri içermez. Tüm tablolar uygun sütun, kısıt ve
-- indeksleriyle boş olarak oluşturulur.
-- Admin kullanıcısının depo personeli ve depo sorumlusuna giriş (log-in)
-- hesapları oluşturması ve yönetmesi için gerekli SECURITY DEFINER fonksiyonları
-- ve Row Level Security (RLS) politikaları tek parça halinde tanımlanmıştır.
-- =============================================================================

BEGIN;

-- Gerekli şifreleme ve UUID eklentileri
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. MEVCUT TABLOLARI TEMİZLE (Sıfırdan ve temiz kurulum için)
DROP FUNCTION IF EXISTS public.admin_create_staff_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reset_staff_password(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_staff(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;

DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.shelf_locations CASCADE;
DROP TABLE IF EXISTS public.warehouse_users CASCADE;
DROP TABLE IF EXISTS public.system_rules CASCADE;

-- =============================================================================
-- 1. TABLOLARIN OLUŞTURULMASI (DDL & İŞ KURALLARI KISITLARI)
-- =============================================================================

-- 1.1 Sistem İş Kuralları Tablosu
CREATE TABLE public.system_rules (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_expiry_days_for_exit INT NOT NULL DEFAULT 30 CHECK (min_expiry_days_for_exit >= 1),
  enforce_fefo_priority BOOLEAN NOT NULL DEFAULT true,
  require_count_note BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Ambar ve Raf Konumları Tablosu
CREATE TABLE public.shelf_locations (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('A1', 'B2', 'C1', 'KARANTINA')),
  label TEXT NOT NULL,
  temperature_rule TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Depo Personeli ve Rolleri Tablosu (3 Kademeli RBAC & Supabase Auth Bağlantısı)
CREATE TABLE public.warehouse_users (
  id TEXT PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin')),
  assigned_zone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Ürün Ana Verisi (Master Data / Katalog) Tablosu
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  form TEXT NOT NULL CHECK (form IN ('Tablet', 'Softjel', 'Pastil', 'Sıvı/Damla')),
  unit TEXT NOT NULL CHECK (unit IN ('Kutu', 'Şişe')),
  units_per_carton INT NOT NULL DEFAULT 24 CHECK (units_per_carton > 0),
  category TEXT NOT NULL CHECK (category IN ('Vitamin & Mineral', 'Omega & Yağ Asitleri', 'Pastil & Bitkisel', 'Bağışıklık')),
  min_critical_stock INT NOT NULL DEFAULT 30 CHECK (min_critical_stock >= 0),
  zone TEXT NOT NULL CHECK (zone IN ('A1', 'B2', 'C1', 'KARANTINA')),
  storage_condition TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Parti (Lot) ve Son Kullanma Tarihi (SKT) Stok Tablosu
-- İŞ KURALI: quantity >= 0 kısıtı ile veritabanı seviyesinde negatif stok engellenir!
CREATE TABLE public.batches (
  batch_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  shelf_location TEXT NOT NULL,
  is_quarantine BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, lot_number)
);

-- 1.6 Stok Hareketleri ve Denetim İzi (Audit Trail & Rollback) Tablosu
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('STOK_GİRİŞİ', 'STOK_ÇIKIŞI', 'TRANSFER', 'SAYIM_DÜZELTME', 'TERS_KAYIT')),
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  lot_number TEXT NOT NULL,
  amount INT NOT NULL CHECK (amount >= 0),
  unit TEXT NOT NULL,
  source_shelf TEXT NOT NULL,
  target_shelf TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin')),
  note TEXT NOT NULL DEFAULT '',
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. KULLANICI ROLÜ TESPİTİ VE YETKİLENDİRME (RBAC) FONKSİYONLARI
-- =============================================================================

-- 2.1 Aktif kullanıcının sistemdeki rolünü güvenli şekilde çözen fonksiyon
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_header_role TEXT;
  v_total_users INT;
BEGIN
  -- Sistemde henüz hiç kullanıcı tanımlanmamışsa ilk kurulum için 'Admin' kabul edilir
  SELECT COUNT(*) INTO v_total_users FROM public.warehouse_users;
  IF v_total_users = 0 THEN
    RETURN 'Admin';
  END IF;

  -- 1. Supabase Auth ile oturum açılmışsa kullanıcının tablodaki rolünü al
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role
    FROM public.warehouse_users
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 2. İstemciden gelen rol başlığını doğrula
  BEGIN
    v_header_role := current_setting('request.headers', true)::json->>'x-careup-role';
  EXCEPTION WHEN OTHERS THEN
    v_header_role := NULL;
  END;

  IF v_header_role IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin') THEN
    RETURN v_header_role;
  END IF;

  RETURN 'Depo Çalışanı';
END;
$$;

-- =============================================================================
-- 3. ADMİN İÇİN PERSONEL GİRİŞ (LOG-IN) HESABI YÖNETİMİ (SECURITY DEFINER)
-- Admin, secret key gerekmeksizin uygulama içinden personellere e-posta/şifre
-- atayabilir, şifrelerini güncelleyebilir veya personeli silebilir.
-- =============================================================================

-- 3.1 Admin: Depo Personeli / Sorumlusu İçin Supabase Log-in Hesabı Oluşturma
CREATE OR REPLACE FUNCTION public.admin_create_staff_account(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_employee_code TEXT,
  p_role TEXT,
  p_assigned_zone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role TEXT;
  v_new_user_id UUID;
  v_encrypted_pw TEXT;
  v_custom_id TEXT;
BEGIN
  -- Çağıranın Admin yetkisini kontrol et
  v_caller_role := public.get_current_user_role();
  IF v_caller_role <> 'Admin' THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Yalnızca Admin rolü yeni personel giriş hesabı oluşturabilir.';
  END IF;

  -- Rol doğrulaması
  IF p_role NOT IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin') THEN
    RAISE EXCEPTION 'Geçersiz rol: %. Rol yalnızca "Depo Çalışanı", "Depo Sorumlusu" veya "Admin" olabilir.', p_role;
  END IF;

  -- E-posta ve Sicil Kodu benzersizlik kontrolü
  IF EXISTS (SELECT 1 FROM public.warehouse_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Bu e-posta adresi (%) zaten kayıtlı.', p_email;
  END IF;
  IF EXISTS (SELECT 1 FROM public.warehouse_users WHERE employee_code = p_employee_code) THEN
    RAISE EXCEPTION 'Bu sicil kodu (%) zaten kullanımda.', p_employee_code;
  END IF;

  -- Şifreyi bcrypt ile hash'le ve yeni UUID üret
  v_new_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));
  v_custom_id := 'usr-' || substr(md5(v_new_user_id::text), 1, 8);

  -- auth.users tablosuna hazır doğrulanmış kullanıcıyı ekle
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', p_name, 'employee_code', p_employee_code, 'role', p_role),
    NOW(),
    NOW()
  );

  -- auth.identities tablosuna kimlik eşlemesini ekle
  BEGIN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_new_user_id::text,
      v_new_user_id,
      jsonb_build_object('sub', v_new_user_id::text, 'email', p_email),
      'email',
      p_email,
      NOW(),
      NOW(),
      NOW()
    );
  EXCEPTION WHEN undefined_column THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_new_user_id::text,
      v_new_user_id,
      jsonb_build_object('sub', v_new_user_id::text, 'email', p_email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END;

  -- public.warehouse_users tablosuna ilişkilendirerek kaydet
  INSERT INTO public.warehouse_users (
    id,
    auth_user_id,
    name,
    employee_code,
    email,
    role,
    assigned_zone,
    is_active
  ) VALUES (
    v_custom_id,
    v_new_user_id,
    p_name,
    p_employee_code,
    p_email,
    p_role,
    p_assigned_zone,
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_custom_id,
    'auth_user_id', v_new_user_id,
    'email', p_email,
    'role', p_role,
    'name', p_name,
    'employee_code', p_employee_code
  );
END;
$$;

-- 3.2 Admin: Personelin Şifresini Proje İçinden Sıfırlama / Güncelleme
CREATE OR REPLACE FUNCTION public.admin_reset_staff_password(
  p_auth_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF public.get_current_user_role() <> 'Admin' THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Yalnızca Admin personelin şifresini güncelleyebilir.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = p_auth_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı: %', p_auth_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Kullanıcı şifresi başarıyla güncellendi.');
END;
$$;

-- 3.3 Admin: Personel Hesabını Silme (Auth + Profil)
CREATE OR REPLACE FUNCTION public.admin_delete_staff(
  p_warehouse_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  IF public.get_current_user_role() <> 'Admin' THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Yalnızca Admin personel hesabını silebilir.';
  END IF;

  SELECT auth_user_id INTO v_auth_id
  FROM public.warehouse_users
  WHERE id = p_warehouse_user_id;

  -- Profil kaydını sil
  DELETE FROM public.warehouse_users WHERE id = p_warehouse_user_id;

  -- Eğer bağlı auth kullanıcısı varsa onu da sil
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Personel ve log-in hesabı silindi.');
END;
$$;

-- 3.4 Admin: Personel Rolünü Hızlı Güncelleme
CREATE OR REPLACE FUNCTION public.set_user_role(
  p_employee_code TEXT,
  p_new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  IF public.get_current_user_role() <> 'Admin' THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Yalnızca Admin rol değişikliği yapabilir.';
  END IF;

  IF p_new_role NOT IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin') THEN
    RAISE EXCEPTION 'Geçersiz rol: %. Yalnızca "Depo Çalışanı", "Depo Sorumlusu" veya "Admin" seçilebilir.', p_new_role;
  END IF;

  UPDATE public.warehouse_users
  SET role = p_new_role
  WHERE employee_code = p_employee_code
  RETURNING auth_user_id INTO v_auth_id;

  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', p_new_role)
    WHERE id = v_auth_id;
  END IF;
END;
$$;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- =============================================================================

ALTER TABLE public.system_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4.1 OKUMA (SELECT) POLİTİKALARI: Tüm yetkili depo personeli tabloları okuyabilir
CREATE POLICY "Tum_Roller_Okuma_SystemRules" ON public.system_rules FOR SELECT USING (true);
CREATE POLICY "Tum_Roller_Okuma_Shelves" ON public.shelf_locations FOR SELECT USING (true);
CREATE POLICY "Tum_Roller_Okuma_Users" ON public.warehouse_users FOR SELECT USING (true);
CREATE POLICY "Tum_Roller_Okuma_Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Tum_Roller_Okuma_Batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Tum_Roller_Okuma_Transactions" ON public.transactions FOR SELECT USING (true);

-- 4.2 ADMİN YETKİ POLİTİKALARI (Ürün Kataloğu, Raf, Personel ve Kural Yönetimi)
CREATE POLICY "Admin_Tam_Yetki_Products" ON public.products
  FOR ALL USING (public.get_current_user_role() = 'Admin')
  WITH CHECK (public.get_current_user_role() = 'Admin');

CREATE POLICY "Admin_Tam_Yetki_Shelves" ON public.shelf_locations
  FOR ALL USING (public.get_current_user_role() = 'Admin')
  WITH CHECK (public.get_current_user_role() = 'Admin');

CREATE POLICY "Admin_Tam_Yetki_Users" ON public.warehouse_users
  FOR ALL USING (public.get_current_user_role() = 'Admin')
  WITH CHECK (public.get_current_user_role() = 'Admin');

CREATE POLICY "Admin_Tam_Yetki_Rules" ON public.system_rules
  FOR ALL USING (public.get_current_user_role() = 'Admin')
  WITH CHECK (public.get_current_user_role() = 'Admin');

-- 4.3 STOK PARTİLERİ (BATCHES) OPERASYON POLİTİKALARI
CREATE POLICY "Operasyon_Yetkisi_Batches_Insert" ON public.batches
  FOR INSERT WITH CHECK (public.get_current_user_role() IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin'));

CREATE POLICY "Operasyon_Yetkisi_Batches_Update" ON public.batches
  FOR UPDATE USING (public.get_current_user_role() IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin'))
  WITH CHECK (public.get_current_user_role() IN ('Depo Çalışanı', 'Depo Sorumlusu', 'Admin'));

CREATE POLICY "Admin_Yetkisi_Batches_Delete" ON public.batches
  FOR DELETE USING (public.get_current_user_role() = 'Admin');

-- 4.4 STOK HAREKETLERİ (TRANSACTIONS) ROL KISITLARI
-- Depo Çalışanı: STOK_GİRİŞİ, STOK_ÇIKIŞI, TRANSFER ekleyebilir.
-- Depo Sorumlusu & Admin: SAYIM_DÜZELTME ve TERS_KAYIT (Geri Alma) yetkisine sahiptir.
CREATE POLICY "Rol_Bazli_Transaction_Ekleme" ON public.transactions
  FOR INSERT WITH CHECK (
    (type IN ('STOK_GİRİŞİ', 'STOK_ÇIKIŞI', 'TRANSFER'))
    OR
    (type IN ('SAYIM_DÜZELTME', 'TERS_KAYIT') AND user_role IN ('Depo Sorumlusu', 'Admin'))
  );

CREATE POLICY "Sorumlu_Ve_Admin_Geri_Alma_Update" ON public.transactions
  FOR UPDATE USING (public.get_current_user_role() IN ('Depo Sorumlusu', 'Admin'))
  WITH CHECK (public.get_current_user_role() IN ('Depo Sorumlusu', 'Admin'));

COMMIT;
