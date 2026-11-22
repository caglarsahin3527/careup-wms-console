'use client';

import React from 'react';
import { X, ShieldAlert } from 'lucide-react';

export interface ExceptionScenarioData {
  id: string;
  code: string;
  title: string;
  badge: string;
  trigger: string;
  systemKnowledge: string;
  userSees: string;
  actionTaken: 'ENGELLEME' | 'UYARI VE YÖNLENDİRME' | 'İŞLEM KİLİDİ';
  dataRecorded: string;
  notified: string;
  safeRecovery: string;
}

const SCENARIO_DATABASE: Record<string, ExceptionScenarioData> = {
  SCENARIO_NEGATIVE_STOCK: {
    id: 'SCENARIO_NEGATIVE_STOCK',
    code: 'KURAL-01',
    title: 'Mevcut Stoktan Fazla Çıkış Talebi (Negatif Stok Koruması)',
    badge: 'Bakiye Bütünlüğü',
    trigger:
      'Depo çalışanı, seçili partinin mevcut 18 kutuluk bakiyesinden daha fazla (örn. 30 kutu) stok çıkışı girmeye çalıştı.',
    systemKnowledge:
      'Sistem seçili partinin anlık kullanılabilir miktarını (18 Kutu) doğrulamış durumdadır.',
    userSees:
      'Uyarı Bildirimi: "YETERSİZ STOK: Seçili partide talep edilen miktar mevcut bakiyeyi aşmaktadır."',
    actionTaken: 'ENGELLEME',
    dataRecorded:
      'İşlem geçmişine "Yetersiz Stok Girişimi" koduyla deneme zamanı ve kullanıcı rolü kaydedilir.',
    notified: 'İşlemi yapan depo çalışanı ekranda anlık olarak uyarılır.',
    safeRecovery:
      'İşlem iptal edilir, mevcut stok miktarı korunur ve form miktarı güvenli sınıra çekilir.',
  },
  SCENARIO_EXPIRED_EXIT: {
    id: 'SCENARIO_EXPIRED_EXIT',
    code: 'KURAL-02',
    title: 'Son Kullanma Tarihi Yaklaşmış (<30 Gün) Ürünün Satış Çıkışı',
    badge: 'FEFO & SKT Kuralı',
    trigger:
      'Son kullanma tarihine 30 günden az kalmış olan takviye edici gıda partisinin sevkiyata çıkarılmak istenmesi.',
    systemKnowledge:
      'Sistem partinin SKT tarihini (2026-11-30) ve kalan gün sayısını (8 gün) hesaplamıştır.',
    userSees:
      'Güvenlik Uyarısı: "MİAD KISITI: Bu partinin kalan raf ömrü 30 günün altındadır. Normal çıkış yapılamaz, Karantina rafına transfer ediniz."',
    actionTaken: 'ENGELLEME',
    dataRecorded: 'Parti durumu "SKT_KRİTİK" olarak işaretlenir ve denetim kaydı oluşturulur.',
    notified: 'Depo Sorumlusu bilgilendirilir.',
    safeRecovery:
      'Satış çıkışı engellenir; ürün yalnızca Karantina bölgesine transfer edilebilir.',
  },
  SCENARIO_DOUBLE_SUBMIT: {
    id: 'SCENARIO_DOUBLE_SUBMIT',
    code: 'KURAL-03',
    title: 'Aynı Stok Hareketinin Çift Tıklama ile Mükerrer Gönderimi',
    badge: 'Çift İşlem Koruması',
    trigger:
      'Bağlantı yavaşlığı sırasında depo çalışanının onay butonuna art arda iki kez tıklaması.',
    systemKnowledge:
      'Sistem ilk tıklamayı işleme almış ve butonu işlem tamamlanana kadar kilitlemiştir.',
    userSees:
      'Onay butonu geçici olarak kilitlenir ve "İşlem Kaydediliyor..." ibaresi gösterilir.',
    actionTaken: 'İŞLEM KİLİDİ',
    dataRecorded: 'Yalnızca ilk stok hareketi kaydedilir; ikinci tıklama yoksayılır.',
    notified: 'Kullanıcıya tek bir başarılı işlem mesajı gösterilir.',
    safeRecovery: 'Stoktan çift düşüm yapılması engellenir.',
  },
  SCENARIO_UNAUTHORIZED_COUNT: {
    id: 'SCENARIO_UNAUTHORIZED_COUNT',
    code: 'KURAL-04',
    title: 'Yetkisiz Kullanıcının Sayım Farkı veya Ters Kayıt Girişimi',
    badge: 'Rol Yetkilendirme',
    trigger:
      'Depo Çalışanı rolündeki kullanıcının sayım düzeltmesi veya ters kayıt (geri alma) yapmaya çalışması.',
    systemKnowledge: 'Sistem aktif kullanıcının rolünün "Depo Çalışanı" olduğunu bilmektedir.',
    userSees:
      'Yetki Uyarısı: "Bu işlem yalnızca Depo Sorumlusu yetkisindedir."',
    actionTaken: 'ENGELLEME',
    dataRecorded: 'Yetkisiz işlem denemesi denetim günlüğüne kaydedilir.',
    notified: 'Depo Sorumlusu bilgilendirilir.',
    safeRecovery: 'Stok miktarları değiştirilmez, sistem güvenli durumda kalır.',
  },
  SCENARIO_ALERT_FATIGUE: {
    id: 'SCENARIO_ALERT_FATIGUE',
    code: 'KURAL-05',
    title: 'Depo Çalışanının Onay Mekanizmasında Körlük Yaşaması',
    badge: 'Operasyonel Güvenlik',
    trigger:
      'Rutin işlemler sırasında çalışanın uyarı pencerelerini okumadan hızlıca onaylama riski.',
    systemKnowledge:
      'Sistem yapılan işlemin kritik stok veya sayım düzeltmesi olduğunu tespit eder.',
    userSees:
      'Kritik işlemlerde açıklama alanı zorunlu tutulur ve işlem öncesi açık parti/miktar özeti gösterilir.',
    actionTaken: 'İŞLEM KİLİDİ',
    dataRecorded: 'Girilen zorunlu açıklama metni işlem kaydına eklenir.',
    notified: 'İşlemi yapan çalışanın rolü ve açıklaması kayıt altına alınır.',
    safeRecovery: 'Hatalı refleks onayları önlenir.',
  },
  SCENARIO_ROLLBACK: {
    id: 'SCENARIO_ROLLBACK',
    code: 'KURAL-06',
    title: 'Hatalı Stok Hareketinin Ters Kayıtla (Geri Al) Düzeltilmesi',
    badge: 'Ters Kayıt & İzlenebilirlik',
    trigger:
      'Depo Sorumlusunun hatalı girilmiş bir stok hareketini iptal etmek istemesi.',
    systemKnowledge:
      'Sistem iptal edilmek istenen işlemin miktarını, partisini ve yönünü bilmektedir.',
    userSees:
      'Bilgilendirme: "Eski kayıt silinmeden, tam zıt yönde yeni bir Ters Kayıt oluşturularak stok dengelendi."',
    actionTaken: 'UYARI VE YÖNLENDİRME',
    dataRecorded:
      'Orijinal kayıt silinmez; hareket geçmişine "TERS KAYIT" satırı eklenerek stok eski haline döndürülür.',
    notified: 'Depo Sorumlusu ve ilgili depo çalışanı hareket geçmişinden işlemi görür.',
    safeRecovery: 'Veri geçmişi bozulmadan stok bakiyesi doğru değere geri döner.',
  },
  SCENARIO_OFFLINE: {
    id: 'SCENARIO_OFFLINE',
    code: 'KURAL-07',
    title: 'İnternet Bağlantısının Kesilmesi ve Çevrimdışı Kuyruk',
    badge: 'Bağlantı Kesintisi',
    trigger:
      'Depo koridorunda işlem yapılırken internet bağlantısının kopması.',
    systemKnowledge:
      'Sistem bağlantının kesildiğini tespit eder ve çevrimdışı kuyruk moduna geçer.',
    userSees:
      'Üst çubukta "Çevrimdışı" uyarısı ve kuyrukta bekleyen işlem sayısı gösterilir.',
    actionTaken: 'UYARI VE YÖNLENDİRME',
    dataRecorded:
      'Yapılan işlemler yerel belleğe (LocalStorage) kaydedilir, veri kaybı yaşanmaz.',
    notified: 'Kullanıcı bağlantı geri geldiğinde bekleyen işlemlerin senkronize edildiği bilgisini alır.',
    safeRecovery: 'Bağlantı sağlandığında kuyruktaki işlemler otomatik olarak ana listeye aktarılır.',
  },
};

interface ExceptionModalProps {
  scenarioId: string | null;
  onClose: () => void;
  customDetails?: any;
}

export const ExceptionModal: React.FC<ExceptionModalProps> = ({
  scenarioId,
  onClose,
}) => {
  if (!scenarioId) return null;

  const scenario = SCENARIO_DATABASE[scenarioId] || SCENARIO_DATABASE.SCENARIO_NEGATIVE_STOCK;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden my-6 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {scenario.code}
                </span>
                <span className="text-xs text-slate-400">{scenario.badge}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">{scenario.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7 Analysis Questions */}
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-emerald-400 block mb-1">
              1. Ne Tetikledi?
            </span>
            <p className="text-slate-200 leading-relaxed">{scenario.trigger}</p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-emerald-400 block mb-1">
              2. Sistem Neyi Biliyor / Neyi Bilmiyor?
            </span>
            <p className="text-slate-200 leading-relaxed">{scenario.systemKnowledge}</p>
          </div>

          <div className="bg-amber-950/30 p-3.5 rounded-2xl border border-amber-500/30">
            <span className="text-xs font-semibold text-amber-400 block mb-1">
              3. Kullanıcı Ne Görür?
            </span>
            <p className="text-amber-200 leading-relaxed">{scenario.userSees}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 block mb-1.5">
                4. İşlem Engellenir mi / Uyarı mı?
              </span>
              <span className="inline-block text-xs font-bold bg-rose-500/15 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/30">
                {scenario.actionTaken}
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 block mb-1">
                5. Hangi Veri Kaydedilir?
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">{scenario.dataRecorded}</p>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-emerald-400 block mb-1">
              6. Kim Bilgilendirilir?
            </span>
            <p className="text-slate-200 leading-relaxed">{scenario.notified}</p>
          </div>

          <div className="bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-500/30">
            <span className="text-xs font-semibold text-emerald-400 block mb-1">
              7. Sistem Nasıl Güvenli Duruma Döner?
            </span>
            <p className="text-emerald-200 leading-relaxed">{scenario.safeRecovery}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition-all cursor-pointer"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
