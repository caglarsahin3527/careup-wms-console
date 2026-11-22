---
name: CareUp Mobil Depo ve Stok Takip Sistemi - Aydınlık Tasarım Sistemi
description: Takviye edici gıda deposu operasyonları için geliştirilmiş; yüksek okunabilirlikli, aydınlık, ferah ve görev odaklı arayüz tasarım sistemi.
colors:
  bg-canvas: "#F3F6F8"
  surface-card: "#FFFFFF"
  surface-subtle: "#F8FAFC"
  surface-accent: "#F0FDFA"
  ink-primary: "#0F172A"
  ink-secondary: "#334155"
  ink-muted: "#64748B"
  border-structural: "#E2E8F0"
  border-strong: "#CBD5E1"
  brand-primary: "#0F766E"
  brand-primary-hover: "#115E59"
  brand-amber: "#D97706"
  state-ok: "#059669"
  state-ok-bg: "#ECFDF5"
  state-warn: "#D97706"
  state-warn-bg: "#FFFBEB"
  state-err: "#E11D48"
  state-err-bg: "#FFF1F2"
---

# Design System: CareUp Aydınlık Depo Operasyon Arayüzü

## 1. Tasarım Felsefesi (Bright Clinical & Warehouse Daylight)

Karanlık ve basık şablonlar yerine; takviye edici gıda ve sağlık ürünleri deposunun hijyenik, düzenli ve aydınlık ortamını yansıtan **"Clinical Daylight"** görsel dili benimsenmiştir. Depo içi parlak LED aydınlatma altında yansıma yapmayan açık arduvaz zemin (`#F3F6F8`), net beyaz operasyon kartları (`#FFFFFF`), botanik zümrüt/teal (`#0F766E`) ana marka vurgusu ve vitamin kehribarı (`#D97706`) uyarı tonları kullanılmıştır.

## 2. Renk Paleti

- **Ana Zemin (`#F3F6F8`)**: Göz yormayan, beyaz kartların sınırlarını net biçimde ortaya çıkaran ferah açık zemin.
- **Kart Yüzeyleri (`#FFFFFF`)**: `1px solid #E2E8F0` yapısal kenarlık ve yumuşak derinlik katmanı ile ayrışan içerik alanları.
- **Birincil Marka Vurgusu (`#0F766E` - CareUp Teal)**: Aktif işlem butonları, FEFO öncelik rozetleri ve marka kimliği.
- **İkincil Operasyon Vurguları**:
  - *Mal Kabul (Mavi - `#2563EB`)*
  - *FEFO Sevkiyat (Zümrüt - `#059669`)*
  - *Raf Transferi (İndigo/Mor - `#4F46E5`)*
  - *Sayım & Düzeltme (Kehribar - `#D97706`)*
  - *Admin Yönetim Paneli (Koyu Arduvaz / İndigo - `#1E293B`)*
- **Anlamsal Durum Renkleri**:
  - *Başarılı / Uygun (`#ECFDF5` zemin, `#059669` metin)*
  - *Kritik Stok / Miad Uyarısı (`#FFFBEB` zemin, `#B45309` metin)*
  - *Yetkisiz İşlem / Kural Engeli (`#FFF1F2` zemin, `#BE123C` metin)*

## 3. Gerçekçi Kullanıcı Deneyimi (Zero-Simulator Principle)

- Arayüzde son kullanıcıya (Depo Çalışanı, Depo Sorumlusu veya Admin) yönelik olmayan yapay "test simülatörü" veya akademik soru pencereleri bulunmaz.
- Tüm iş kuralları (yetersiz bakiye, SKT < 30 gün sevkiyat kısıtı, karantina yönlendirmesi, rol yetki kontrolü, geri alma onay doğrulaması) kullanıcı ilgili işlemi yaparken form ve ekran akışı içerisinde doğal geri bildirimlerle çalışır.

## 4. Rol Bazlı Ekran Kurgusu

1. **Üst Operasyon Barı (Header)**: Marka kimliği, hızlı envanter kataloğu erişimi, ağ/senkronizasyon durumu ve güvenli oturum kapatma kontrolü. (Kullanıcı rolleri veritabanı/oturum bazlı sabit olup üst bardan rol geçiş anahtarı kaldırılmıştır; Admin rolü sabittir).
2. **Operasyonel Özet & Görev Kartları**: Depodaki toplam ürün çeşidi, kritik stoktaki ürünler, miadı yaklaşan partiler ve aktif raf sayısı üst bilgi şeridinde özetlenir; altında görev odaklı modül kartları yer alır.
3. **Admin Yönetim Paneli**: Yalnızca `Admin` rolünde tam yetkiyle çalışan; yeni ürün kartı açma, kritik stok eşiği güncelleme, raf/ambar konumu tanımlama ve personel-rol yönetimi sekmelerini barındıran yönetim merkezi.
