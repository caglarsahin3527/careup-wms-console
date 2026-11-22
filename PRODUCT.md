# Product: CareUp Mobil Depo ve Stok Takip Sistemi

## Platform

Web (Mobil-Öncelikli Responsive Web Uygulaması — Next.js, TypeScript, Tailwind CSS)

## Users & Role Hierarchy (3-Kademeli RBAC)

- **Depo Çalışanı (Saha Operatörü)**: Depo koridorlarında el terminali, telefon veya tablet ile çalışan operasyon personeli. Barkod/ürün sorgulama, mal kabul (*Stok Girişi*), FEFO kurallı sevkiyat (*Stok Çıkışı*) ve raflar arası veya karantinaya ürün taşıma (*Depo / Raf Transferi*) işlemlerini yürütür. Hareket geçmişini görüntüleyebilir ancak geriye dönük işlem iptali (*Ters Kayıt / Geri Alma*), fiziksel sayım stok düzeltmesi ve sistem tanımlamaları yapamaz.
- **Depo Sorumlusu (Ambar Yöneticisi)**: Saha operasyonlarını ve kritik stok/miad eşiklerini denetleyen sorumlu. Depo çalışanının tüm yetkilerine ek olarak; fiziksel sayım farklarını onaylayıp stok eşitleme (*Sayım & Stok Düzeltme*) ve hatalı stok hareketlerini doğrulama onayıyla geri alma (*Ters Kayıt / Rollback*) yetkisine sahiptir.
- **Admin (Sistem Yöneticisi)**: Sistemin ana veri (*Master Data*), depo altyapısı ve kullanıcı yetki matrisini yöneten üst düzey yönetici rolü. Yeni ürün kartı tanımlama, kritik stok eşiklerini güncelleme, ambar ve raf adreslerini (*Konum/Raf Tanımları*) yapılandırma, personel-rol atamalarını yönetme ve sistem iş kurallarını (SKT blokaj süresi vb.) belirleme yetkilerine sahiptir.

## Product Purpose

Takviye edici gıda ürünleri (vitamin, mineral, omega-3, bitkisel ekstraktlar) depolayan CareUp ambarı için geliştirilmiş; parti/lot numarası, son kullanma tarihi (SKT), FEFO (*First-Expired, First-Out*) sevkiyat önceliği ve rol bazlı yetki sınırlarını gerçekçi saha süreçleriyle işleten mobil uyumlu depo yönetim sistemi.

## Operating Context

Aydınlık depo içi LED aydınlatma koşullarında yüksek okunabilirlik sağlayan ferah ve yalın arayüz; `Bölge -> Raf -> Göz` hiyerarşisi (`RAF-A1-02-01` vb.), parti/lot ve SKT takibi, birimler (`Kutu`, `Şişe`) ve kesintili kablosuz ağ senkronizasyon desteği.

## Core Capabilities & Business Rules

- **3 Kademeli Rol Bazlı Yetkilendirme (RBAC)**: `Depo Çalışanı`, `Depo Sorumlusu` ve `Admin` rolleri arasında net görev ayrımı.
- **Barkod & Parti (Lot/SKT) Sorgulama**: Kamera simülasyonu veya manuel barkod/SKU arama ile ürünün hangi rafta, hangi partide kaç adet bulunduğunun ve kalan raf ömrünün anlık görüntülenmesi.
- **Operasyonel İş Akışları ve Doğal Kural Denetimi**:
  - *Stok Girişi (Mal Kabul)*: Parti numarası, SKT ve hedef raf seçimiyle stok kabulü.
  - *Stok Çıkışı (FEFO Sevkiyat)*: SKT'si en yakın partinin otomatik önceliklendirilmesi; mevcut bakiyeyi aşan (negatif stok) çıkışların ve miadına 30 günden az kalmış ürünlerin sevkiyat çıkışının form içinde gerçekçi uyarılarla engellenmesi.
  - *Depo / Raf Transferi*: Raflar arası taşıma ve miadı yaklaşan/hasarlı partilerin `KARANTINA` bölgesine aktarımı.
  - *Sayım & Stok Düzeltme*: Yalnızca Depo Sorumlusu ve Admin yetkisiyle, zorunlu fark açıklaması girilerek fiziksel sayım eşitlemesi.
- **Hareket Geçmişi ve Doğrulamalı Geri Alma (Rollback)**:
  - Depo Çalışanı geri alma talep ettiğinde diğer ekran bileşenleri gizlenerek tam ekran yetkisiz işlem uyarısı gösterilir.
  - Depo Sorumlusu veya Admin geri alma talep ettiğinde işlem özeti, stok etkisi ve gerekçe alanı içeren *"İşlemi onaylıyor musunuz?"* doğrulama penceresi açılır.
- **Admin Yönetim Paneli**:
  - Ürün kataloğuna yeni ürün kartı ekleme, kritik stok limiti düzenleme.
  - Depo raf/konum tanımlama ve düzenleme.
  - Personel listesi, rol atamaları ve operasyonel kural parametreleri yönetimi.
