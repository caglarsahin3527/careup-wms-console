# CareUp Mobil Depo Sistemi - Yapay Zekâ Geliştirme Günlüğü (AI Development Log)

Bu belge, **Pamukkale Üniversitesi Endüstri Mühendisliği Bölümü - CENG 409 Sistem Analizi ve Tasarımı** yönergesi Madde 9 gereğince hazırlanmıştır. Proje sürecinde yapay zekâ bir karar verici değil; seçenek üreten, alternatifleri kıyaslayan bir asistan olarak kullanılmış; tüm nihai kararlar ekip tarafından mühendislik gerekçeleriyle doğrulanarak alınmıştır.

---

## Karar Kayıtları (AI Decision Records)

### AI Karar No: 01
* **Tarih:** 22 Kasım 2026
* **Konu:** Takviye Edici Gıda Deposu İçin Veri Modeli ve Stok Takip Derinliği
* **Kullanılan İstem / Amaç:** e-careup.com ürün gamı için bir takviye edici gıda deposunda stok modellemesinin nasıl kurulması gerektiği ve alternatiflerin sorgulanması.
* **AI’nın Önerdiği Çıktı / Alternatifler:**
  * *Seçenek A:* Basit ürün-stok modeli (Ürün, Adet, Raf).
  * *Seçenek B:* İleri seviye parti/lot ve SKT (Son Kullanma Tarihi) bazlı ambar modeli (Ürün kartı altında bağımsız Lot, SKT, Karantina ve Konum takibi).
  * *Seçenek C:* Dengeli hibrit model (İşlem bazlı lot ve ay/yıl SKT kaydı).
* **Ekibin Kararı (Kabul/Değiştirme/Ret):** **Seçenek B kabul edildi.**
* **Kararın Mühendislik Doğrulaması:** Takviye edici gıda ürünleri (vitamin, mineral, omega-3, pastil) insan sağlığı ile doğrudan ilişkili olduğundan ve Tarım/Sağlık mevzuatına tabi bulunduğundan, geri çağırma (lot recall) ve miad yönetimi zorunludur. Basit stok modeli (Seçenek A) FEFO (First-Expired, First-Out) prensibini işletemez. Ekip, sistem analizinin gerçekçi olması ve kötü durum senaryolarının (miadı dolan ürünün çıkışının engellenmesi vb.) güvenli yönetilmesi amacıyla Seçenek B'yi benimsemiştir.

---

### AI Karar No: 02
* **Tarih:** 22 Kasım 2026
* **Konu:** Canlı Sistem Dağıtım ve Yazılım Mimarisi Seçimi
* **Kullanılan İstem / Amaç:** Mobil uyumlu web uygulaması için Next.js + Vercel mimarisinin incelenmesi ve alternatif mimarilerle (Vite SPA, Streamlit, Google Apps Script) kıyaslanması.
* **AI’nın Önerdiği Çıktı / Alternatifler:**
  * *Alternatif 1 (Next.js + Vercel + Supabase):* Fullstack React, Server Actions, güçlü mobil web arayüzü ve CI/CD entegrasyonu.
  * *Alternatif 2 (Vite SPA + Vercel):* İstemci taraflı React uygulaması.
  * *Alternatif 3 (Python / Streamlit):* Hızlı veri bilimi arayüzü, mobilde sınırlı ergonomi.
  * *Alternatif 4 (Google Apps Script / Sheets):* Kodsuz/düşük kodlu tablo yapısı, ölçekleme ve yetkilendirme yetersiz.
* **Ekibin Kararı (Kabul/Değiştirme/Ret):** **Alternatif 1 (Next.js + Supabase + Vercel) kabul edildi.**
* **Kararın Mühendislik Doğrulaması:** Yönergedeki "KIRMIZI ÇİZGİ: Veritabanı tam yetkili anahtarlarının istemciye sızdırılmaması" kuralı, Next.js Server Components ve Server Actions sayesinde istemciye kod gitmeden sunucuda güvenle işletilebilir. Ayrıca hocanın cep telefonundan tarayıcıyla açtığında yerel (native) bir mobil uygulama hissiyatı vermesi ve Vercel üzerinden GitHub commit'leriyle otomatik derlenmesi (CI/CD) tercih gerekçesidir.


---

### AI Karar No: 03
* **Tarih:** 22 Kasım 2026
* **Konu:** Arayüz (UI/UX) Tasarımı, Takviye Edici Gıda Teması ve Bağımsız Yerel Prototipleme
* **Kullanılan İstem / Amaç:** e-careup.com ürün portföyüne uygun, genel AI şablonlarından uzak, veritabanı kurulumu öncesinde yerel olarak test edilebilecek Next.js arayüz taslağının oluşturulması.
* **AI’nın Önerdiği Çıktı / Alternatifler:**
  * *Alternatif A:* Standart mor-mavi gradyanlı SaaS kartları ve düz tablo görünümü.
  * *Alternatif B (Bespoke Healthcare WMS):* e-careup botanik zümrüt yeşili (`#064e3b`) ve narenciye vitamin sarısı (`#d97706`) ile yüksek görünürlüklü FEFO rota bandı, kamera barkod simülatörü, 7 soruluk istisna inceleme modalı ve LocalStorage tabanlı kalıcı bellek mimarisi.
* **Ekibin Kararı (Kabul/Değiştirme/Ret):** **Alternatif B kabul edildi.**
* **Kararın Mühendislik Doğrulaması:** Depo ortamında parlak tavan aydınlatması altında personelin ilk bakışta en yakın miadlı partiyi (FEFO) seçebilmesi için yüksek kontrastlı yönlendirme bandı zorunludur. Ayrıca harici bir veritabanı servisine (Supabase vb.) bağımlı olmadan bilgisayarda doğrudan `npm run dev` ile çalışabilmesi ve `localStorage` sayesinde sayfa yenilense dahi stok hareketlerini kaybetmemesi geliştirme ve test hızını maksimize etmiştir.


---

### AI Karar No: 04
* **Tarih:** 22 Kasım 2026
* **Konu:** Arayüz Akışının Sadeleştirilmesi ve Adım Adım (Görev Odaklı) Ekran Kurgusu
* **Kullanılan İstem / Amaç:** Tüm tabloların ve formların tek ekranda sıkışık durduğu karmaşık yapı yerine; önce yapılacak işlemin seçildiği, ardından kamera/barkod okuma ve sadece o işleme ait formun açıldığı sade bir akışa geçilmesi ve rol adının "Depo Çalışanı" olarak güncellenmesi.
* **AI’nın Önerdiği Çıktı / Alternatifler:**
  * *Alternatif A (Tek Ekran Yoğun Konsol):* Ürün listesi, 4 sekmeli form ve hareket geçmişinin aynı anda tek ekranda gösterilmesi.
  * *Alternatif B (Adım Adım Görev Seçimli Akış):* Ana ekranda 6 büyük işlem kartı (`Barkod & Stok Sorgula`, `Stok Girişi`, `Stok Çıkışı`, `Raf Transferi`, `Sayım & Düzeltme`, `Hareket Geçmişi`) sunulması; kullanıcı bir işlemi seçtiğinde sadece o işleme ait barkod tarayıcı ve işlem formunun geniş, ferah bir ekranda açılması.
* **Ekibin Kararı (Kabul/Değiştirme/Ret):** **Alternatif A reddedildi, Alternatif B kabul edildi.** Ayrıca "Saha Operatörü" terimi depo terminolojisine daha uygun olan **"Depo Çalışanı"** olarak değiştirildi.
* **Kararın Mühendislik Doğrulaması:** Mobil cihazla çalışan bir depo çalışanı için tek ekranda çok fazla veri ve tablo bulunması bilişsel yükü artırmakta ve yazıları iç içe geçirmektedir. Görev odaklı (Task-First) yönlendirme ile kullanıcının önce "Ne yapacağım?" sorusunu seçip ardından "Hangi ürün?" ve "Kaç adet?" adımlarını tamamlaması hata riskini düşürmüş ve ergonomiyi iyileştirmiştir.

---

### AI Karar No: 05
* **Tarih:** 22 Kasım 2026
* **Konu:** Hareket Geçmişinde RBAC Yetkilendirme ve Geri Alma (Rollback) İçin Çift Kademeli Doğrulama Sistemi
* **Kullanılan İstem / Amaç:** Depo sorumlusu ve depo çalışanı ekranlarında hareket geçmişi ve geri alma kısmında geri alma talep edilirse; eğer depo çalışanıysa yetkisiz olduğu ekranının gelmesi ve diğer kısımların ekranda yazmaması, eğer depo sorumlusuysa "işlemi onaylıyor musunuz?" gibi bir doğrulama sistemi kurulması.
* **AI’nın Önerdiği Çıktı / Alternatifler:**
  * *Alternatif A:* Basit bir `window.confirm` JavaScript alert'i ve tarayıcı uyarısı verilmesi.
  * *Alternatif B (Bespoke RBAC & Modal Doğrulama):* Depo Çalışanı geri alma talep ettiğinde hareket listesini gizleyerek ekranda yalnızca "403 Yetkisiz İşlem" uyarı panelinin gösterilmesi; Depo Sorumlusu talep ettiğinde ise hedef işlem özeti, stok miktarı etkisi ve ters kayıt (reversal) önizlemesini içeren modal onay sistemi açılması.
* **Ekibin Kararı (Kabul/Değiştirme/Ret):** **Alternatif B kabul edildi.**
* **Kararın Mühendislik Doğrulaması:** Takviye edici gıda ambarında geçmiş stok hareketini tersine çevirmek yasal ve fiziksel bakiye açısından kritik bir denetim müdahalesidir. Çalışanların geriye dönük stok iptali yapması engellenmeli ve yetkisizlik durumu ekranda hiçbir dikkat dağıtıcı unsur kalmadan ("diğer kısımların ekranda yazmaması") net şekilde tebliğ edilmelidir. Yetkili amir (Depo Sorumlusu) içinse kazara çift tıklama veya dalgınlıkla ters kayıt atılmaması adına açık işlem detayını ve stok etkisini gösteren onay mekanizması işletilmelidir.

---

### AI Karar No: 06
* **Tarih:** 22 Kasım 2026
* **Konu:** Gerçekçi Kullanıcı Süreçlerine Geçiş, Aydınlık Özgün Tema ve Admin (Sistem Yöneticisi) Rolünün Eklenmesi
* **Kullanılan İstem / Amaç:** Son kullanıcıyla ilgisi olmayan "kötü durum senaryoları simülatörü" gibi yapay akademik kutuların kaldırılarak iş kurallarının gerçek kullanım akışına yedirilmesi; karanlık kopya tema yerine aydınlık ve özgün bir tasarıma geçilmesi; ayrıca 3. rol olarak `Admin` rolünün ve yönetim ekranlarının tanımlanması.
* **AI’nın Önerdiği Çıktı / Alternatifler:**
  * *Alternatif A:* Mevcut koyu temayı koruyup sadece renk tonlarını açmak ve simülatör butonlarını gizli bir menüye taşımak.
  * *Alternatif B (Tam Süreç Odaklı Aydınlık Mimari & 3 Kademeli RBAC):* Yapay simülatör ve 7 soruluk akademik pop-up'ların tamamen kaldırılıp tüm kural denetimlerinin (negatif stok, SKT < 30 gün engeli ve karantina yönlendirmesi, çift tıklama kilidi, yetki engeli) gerçek işlem formları içinde doğal uyarılarla işletilmesi; sağlık/takviye gıda deposuna uygun ferah aydınlık tema (`#F3F6F8` zemin, `#FFFFFF` kartlar, botanik teal `#0F766E` vurgular) tasarlanması ve `Admin` rolü için Ürün Kataloğu CRUD, Raf/Konum Yönetimi ve Personel/Kural Yönetimi içeren özel yönetim paneli inşa edilmesi.
* **Ekibin Kararı (Kabul/Değiştirme/Ret):** **Alternatif B kabul edildi.**
* **Kararın Mühendislik Doğrulaması:** Gerçek bir depo çalışanı veya sorumlusunun ekranında "Kötü Durum Senaryosu 1-7" gibi ders yönergesi maddelerinin bulunması kullanılabilirlik ve gerçekçilik ilkelerine aykırıdır. İş kuralları kullanıcı hatalı bir veri girdiğinde (örneğin 18 adet stok varken 30 adet çıkış istediğinde veya miadı geçmiş ürünü sevk etmeye çalıştığında) gerçek zamanlı olarak devreye girmelidir. Ayrıca sistemde yeni ürün kartı açma, raf tanımlama ve kritik stok eşiği belirleme işlemleri saha personelinin değil, `Admin` (Sistem Yöneticisi) rolünün sorumluluğundadır. Aydınlık tema ise depo içi aydınlatma altında kontrastı ve okunabilirliği artırmıştır.
