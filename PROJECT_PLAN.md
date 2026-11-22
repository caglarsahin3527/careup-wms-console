# CareUp Mobil Depo ve Stok Takip Sistemi - Proje Yol Haritası & Uygulama Planı

Bu belge, **Pamukkale Üniversitesi Endüstri Mühendisliği Bölümü - Sistem Analizi ve Tasarımı (CENG 409)** dersi dönem projesi kapsamında; e-careup.com takviye edici gıda ürün portföyüne dayalı mobil depo yönetim sisteminin analiz, tasarım, rol mimarisi ve uygulama adımlarını tanımlar.

---

## 1. Proje Özeti ve Temel İlkeler
* **Tema:** Takviye Edici Gıda Depo ve Stok Yönetimi (CareUp)
* **Öne Çıkan Mühendislik Kriterleri:** Parti/Lot Takibi, Son Kullanma Tarihi (SKT) Kontrolü, FEFO (First-Expired, First-Out) Prensibi, 3 Kademeli Rol Bazlı Yetkilendirme (`Depo Çalışanı`, `Depo Sorumlusu`, `Admin`).
* **Kullanıcı Odaklı Gerçekçilik İlkesi:** Sistem arayüzünde son kullanıcıyı ilgilendirmeyen akademik sınav/simülasyon butonları yer almaz. Tüm iş kuralları (negatif stok engeli, SKT < 30 gün sevkiyat engeli, mükerrer gönderim kilidi, yetkisiz işlem engeli, onaylı geri alma) doğrudan operasyon formlarının ve gerçek iş süreçlerinin içinde doğal olarak çalışır.

---

## 2. Rol Mimarisi ve Yetki Sınırları (RBAC)

| İşlev / Süreç Modülü | Depo Çalışanı | Depo Sorumlusu | Admin (Sistem Yöneticisi) |
| :--- | :---: | :---: | :---: |
| **Barkod & Stok Konum Sorgulama** | Yetkili | Yetkili | Yetkili |
| **Stok Girişi (Parti & SKT ile Mal Kabul)** | Yetkili | Yetkili | Yetkili |
| **Stok Çıkışı (FEFO Sevkiyat)** | Yetkili | Yetkili | Yetkili |
| **Depo / Raf & Karantina Transferi** | Yetkili | Yetkili | Yetkili |
| **Sayım & Stok Farkı Düzeltme** | Yetkisiz (Engellenir) | Yetkili (Zorunlu Not ile) | Yetkili |
| **Hareket Geçmişi İnceleme** | Yetkili | Yetkili | Yetkili |
| **Ters Kayıt (İşlem Geri Alma / Rollback)** | Yetkisiz (Tam Ekran Engel) | Yetkili (Onay Doğrulamalı) | Yetkili (Onay Doğrulamalı) |
| **Yeni Ürün Kartı & Kritik Eşik Tanımlama** | Yetkisiz | Yetkisiz | **Yetkili (Admin Paneli)** |
| **Ambar & Raf Konumu Yapılandırma** | Yetkisiz | Yetkisiz | **Yetkili (Admin Paneli)** |
| **Personel & Sistem Kuralları Yönetimi** | Yetkisiz | Yetkisiz | **Yetkili (Admin Paneli)** |

---

## 3. Fazlar ve İşlem Adımları

### Faz 1: Problem, Paydaş ve İş Kuralları Analizi
- [x] 1.1 Paydaş ve 3 kademeli kullanıcı rolleri analizi (`Depo Çalışanı`, `Depo Sorumlusu`, `Admin`).
- [x] 1.2 İşlevsel ve işlevsel olmayan gereksinimlerin (FR / NFR) belirlenmesi.
- [x] 1.3 Takviye edici gıdaya özgü iş kurallarının (FEFO, SKT < 30 gün blokajı, Karantina, Negatif Stok Engeli) operasyon süreçlerine gömülmesi.

### Faz 2: Mühendislik Modellemesi ve Veri Yapısı
- [x] 2.1 Ürün (`Product`), Parti (`Batch`), Stok Hareketi (`Transaction`), Raf Konumu (`ShelfLocation`) ve Kullanıcı (`WarehouseUser`) veri modellerinin oluşturulması.
- [x] 2.2 Uçtan uca Süreç Akışı (Barkod Okuma -> Parti Seçimi -> Kural Denetimi -> Stok & Denetim İzi Güncelleme).

### Faz 3: Aydınlık ve Özgün UX / UI Tasarımı
- [x] 3.1 Depo aydınlatmasına uygun, göz yormayan aydınlık klinik/endüstriyel arayüz (`Ferah Beyaz & Açık Arduvaz Zemin`, `Botanik Teal`, `Vitamin Amber` vurgular).
- [x] 3.2 Görev odaklı işlem ekranları (Sorgulama, Mal Kabul, FEFO Sevkiyat, Raf Transferi, Sayım Düzeltme, Hareket Geçmişi).
- [x] 3.3 Admin Yönetim Paneli (Ürün Kataloğu CRUD, Raf/Konum Tanımlama, Personel ve Kural Yönetimi).

### Faz 4: Rol Kısıtlamaları ve Geri Alma Doğrulama Sistemi
- [x] 4.1 Depo Çalışanı geri alma talep ettiğinde diğer bileşenleri gizleyen tam ekran Yetkisiz Erişim koruması.
- [x] 4.2 Depo Sorumlusu ve Admin için işlem özeti ve stok etkisi içeren *"İşlemi onaylıyor musunuz?"* doğrulama sistemi.

---

## 4. İzlenebilirlik Matrisi

| Gereksinim Kodu | İlgili Süreç | Veri Varlığı | Ekran / Arayüz | Yetkili Roller |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01 (FEFO & SKT Çıkış)** | Sevkiyat Çıkışı | `Product.batches` | Stok Çıkış Ekranı | Çalışan, Sorumlu, Admin |
| **REQ-02 (Sayım Eşitleme)** | Fiziksel Sayım | `Batch`, `Transaction` | Sayım & Düzeltme Ekranı | Sorumlu, Admin |
| **REQ-03 (Onaylı Geri Alma)** | Denetim & İptal | `Transaction` (`TERS_KAYIT`) | Hareket Geçmişi & Onay Modalı | Sorumlu, Admin |
| **REQ-04 (Ana Veri & Katalog)** | Sistem Yönetimi | `Product`, `Shelf`, `User` | Admin Yönetim Paneli | Yalnızca Admin |
