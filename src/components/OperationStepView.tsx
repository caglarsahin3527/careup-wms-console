'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  MapPin,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  Lock,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  Product,
  UserRole,
  ShelfLocation,
  SystemRules,
} from '../data/mockData';
import { BarcodeScannerCard } from './BarcodeScannerCard';

export type ActiveOperationMode =
  | 'SORGULAMA'
  | 'STOK_GİRİŞİ'
  | 'STOK_ÇIKIŞI'
  | 'TRANSFER'
  | 'SAYIM_DÜZELTME';

interface OperationStepViewProps {
  mode: ActiveOperationMode;
  products: Product[];
  shelves: ShelfLocation[];
  systemRules: SystemRules;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  currentRole: UserRole;
  isOnline: boolean;
  onBackHome: () => void;
  onSwitchMode: (newMode: ActiveOperationMode) => void;
  onRoleChange?: (role: UserRole) => void;
  onExecuteTransaction: (params: {
    type: 'STOK_GİRİŞİ' | 'STOK_ÇIKIŞI' | 'TRANSFER' | 'SAYIM_DÜZELTME';
    lotNumber: string;
    amount: number;
    sourceShelf: string;
    targetShelf: string;
    note: string;
    expiryDate?: string;
  }) => { success: boolean; error?: string };
}

const MODE_META: Record<
  ActiveOperationMode,
  { title: string; subtitle: string; badgeClass: string; btnClass: string }
> = {
  SORGULAMA: {
    title: 'Barkod & Stok Konum Sorgulama',
    subtitle: 'Ürünün barkodunu okutarak parti bakiyelerini, SKT ve raf konumunu inceleyin.',
    badgeClass: 'text-teal-800 bg-teal-50 border-teal-200',
    btnClass: 'bg-teal-700 hover:bg-teal-800 text-white',
  },
  STOK_GİRİŞİ: {
    title: 'Stok Girişi (Mal Kabul)',
    subtitle: 'Depoya yeni gelen ürünleri parti (lot) numarası, SKT ve hedef raf ile kaydedin.',
    badgeClass: 'text-blue-800 bg-blue-50 border-blue-200',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  STOK_ÇIKIŞI: {
    title: 'Stok Çıkışı (FEFO Sevkiyat)',
    subtitle: 'Son kullanma tarihi en yakın olan partiden (FEFO kuralı) sevkiyat çıkışı yapın.',
    badgeClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  TRANSFER: {
    title: 'Depo / Raf Transferi',
    subtitle: 'Seçili partiyi mevcut raftan başka bir rafa veya Karantina alanına aktarın.',
    badgeClass: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  },
  SAYIM_DÜZELTME: {
    title: 'Sayım & Stok Farkı Düzeltme',
    subtitle: 'Fiziksel raf sayımı ile sistemdeki stok miktarını eşitleyin (Sorumlu / Admin Yetkisi).',
    badgeClass: 'text-amber-800 bg-amber-50 border-amber-200',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
};

export const OperationStepView: React.FC<OperationStepViewProps> = ({
  mode,
  products,
  shelves,
  systemRules,
  selectedProduct,
  onSelectProduct,
  currentRole,
  isOnline,
  onBackHome,
  onSwitchMode,
  onExecuteTransaction,
}) => {
  const activeShelves = shelves.filter((s) => s.isActive);
  const [selectedLot, setSelectedLot] = useState<string>('');
  const [amount, setAmount] = useState<number>(1);
  const [targetShelf, setTargetShelf] = useState<string>(
    activeShelves[0]?.code || ''
  );
  const [entryLotNumber, setEntryLotNumber] = useState<string>('');
  const [entryExpiryDate, setEntryExpiryDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [unmatchedBarcode, setUnmatchedBarcode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{
    title: string;
    message: string;
    canRedirectQuarantine?: boolean;
  } | null>(null);

  const meta = MODE_META[mode];

  // Auto-sync targetShelf when shelves are loaded
  useEffect(() => {
    if (!targetShelf && activeShelves.length > 0) {
      setTargetShelf(activeShelves[0].code);
    }
  }, [activeShelves, targetShelf]);

  // Auto-select earliest expiring batch (FEFO) when product changes
  useEffect(() => {
    setUnmatchedBarcode(null);
    setValidationError(null);
    setSuccessBanner(null);
    if (selectedProduct && selectedProduct.batches.length > 0) {
      const sorted = [...selectedProduct.batches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      setSelectedLot(sorted[0].lotNumber);
    } else {
      setSelectedLot('');
    }
  }, [selectedProduct, mode]);

  const activeBatch =
    selectedProduct?.batches.find((b) => b.lotNumber === selectedLot) ||
    selectedProduct?.batches[0];

  const fefoBatch = selectedProduct
    ? [...selectedProduct.batches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      )[0]
    : null;

  const today = new Date('2026-11-22');
  const expDate = new Date(activeBatch?.expiryDate || '2027-01-01');
  const diffDays = activeBatch
    ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 9999;

  // RBAC Check for SAYIM_DÜZELTME: If Depo Çalışanı opens it, show clean full-view Unauthorized Screen
  if (mode === 'SAYIM_DÜZELTME' && currentRole === 'Depo Çalışanı') {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white border-2 border-rose-200 rounded-2xl shadow-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-mono">
            <Lock className="w-3.5 h-3.5" />
            Yetkisiz İşlem • Sayım &amp; Stok Eşitleme
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Sayım Farkı Düzeltme Yetkiniz Bulunmamaktadır
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Fiziksel raf sayımı sonrasında sistem stok bakiyesini doğrudan değiştirme işlemi yalnızca{' '}
            <strong className="text-slate-900">Depo Sorumlusu</strong> veya{' '}
            <strong className="text-slate-900">Admin</strong> yetkisiyle gerçekleştirilebilir.
          </p>
        </div>

        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onBackHome}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ana Ekrana Dön</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessBanner(null);

    if (!selectedProduct) return;
    if (isSubmitting) return;

    if (mode === 'STOK_GİRİŞİ') {
      if (!entryLotNumber.trim()) {
        setValidationError({
          title: 'Parti (Lot) Numarası Zorunludur',
          message: 'Mal kabul stok girişinde parti (lot) numarası girilmesi gerekmektedir.',
        });
        return;
      }
      if (!entryExpiryDate) {
        setValidationError({
          title: 'Son Kullanma Tarihi (SKT) Zorunludur',
          message: 'FEFO kuralı ve gıda güvenliği takibi için son kullanma tarihi seçilmelidir.',
        });
        return;
      }
      if (!targetShelf) {
        setValidationError({
          title: 'Hedef Raf Seçilmedi',
          message: 'Lütfen ürünün yerleştirileceği hedef raf konumunu seçiniz.',
        });
        return;
      }
    } else {
      if (!activeBatch) {
        setValidationError({
          title: 'İşlem Yapılacak Parti Bulunamadı',
          message: 'Bu ürünün henüz kayıtlı bir stok partisi bulunmamaktadır. Önce "Stok Girişi (Mal Kabul)" işlemi yapınız.',
        });
        return;
      }
    }

    // Real-world operational validations inside the form
    if (mode === 'STOK_ÇIKIŞI' && activeBatch) {
      if (amount > activeBatch.quantity) {
        setValidationError({
          title: 'Yetersiz Parti Stoku (Negatif Stok Koruması)',
          message: `Seçili partide (${activeBatch.lotNumber}) yalnızca ${activeBatch.quantity} ${selectedProduct.unit} kullanılabilir stok bulunmaktadır. Talep edilen ${amount} ${selectedProduct.unit} çıkış işlemi gerçekleştirilemez.`,
        });
        return;
      }

      if (diffDays <= systemRules.minExpiryDaysForExit) {
        setValidationError({
          title: `Miad (SKT) Sevkiyat Kısıtı (< ${systemRules.minExpiryDaysForExit} Gün)`,
          message: `${activeBatch.lotNumber} numaralı partinin son kullanma tarihine (${activeBatch.expiryDate}) ${diffDays} gün kalmıştır. Yasal gıda güvenliği kuralları gereği bu partiden müşteriye sevkiyat çıkışı yapılamaz; lütfen ürünü Karantina rafına transfer ediniz.`,
          canRedirectQuarantine: true,
        });
        return;
      }
    }

    if (mode === 'SAYIM_DÜZELTME' && systemRules.requireCountNote && !note.trim()) {
      setValidationError({
        title: 'Sayım Farkı Açıklaması Zorunludur',
        message:
          'Fiziksel sayım düzeltmelerinde denetim izi için fark gerekçesini (örn. hasarlı ambalaj, sayım farkı vb.) açıklama alanına yazmanız gerekmektedir.',
      });
      return;
    }

    setIsSubmitting(true);

    const executedLotNumber = mode === 'STOK_GİRİŞİ' ? entryLotNumber.trim().toUpperCase() : (activeBatch?.lotNumber || '');

    const res = onExecuteTransaction({
      type: mode === 'SORGULAMA' ? 'STOK_ÇIKIŞI' : mode,
      lotNumber: executedLotNumber,
      amount: Number(amount),
      sourceShelf: mode === 'STOK_GİRİŞİ' ? 'MAL_KABUL' : (activeBatch?.shelfLocation || 'DEPO'),
      targetShelf:
        mode === 'STOK_GİRİŞİ' || mode === 'TRANSFER'
          ? targetShelf
          : mode === 'STOK_ÇIKIŞI'
          ? 'SEVKİYAT_ÇIKIŞ'
          : (activeBatch?.shelfLocation || targetShelf),
      note:
        note.trim() ||
        (isOnline ? `${meta.title} işlemi tamamlandı.` : 'Çevrimdışı saha kuyruğu kaydı'),
      expiryDate: mode === 'STOK_GİRİŞİ' ? entryExpiryDate : activeBatch?.expiryDate,
    });

    if (res.success) {
      setSuccessBanner(
        `${selectedProduct.name} (${executedLotNumber}) için ${amount} ${selectedProduct.unit} işlem başarıyla kaydedildi.`
      );
      setNote('');
      if (mode === 'STOK_GİRİŞİ') {
        setEntryLotNumber('');
        setEntryExpiryDate('');
      }
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 600);
  };

  const totalStock = selectedProduct
    ? selectedProduct.batches.reduce((sum, b) => sum + b.quantity, 0)
    : 0;
  const isCritical = selectedProduct ? totalStock <= selectedProduct.minCriticalStock : false;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Bar: Back Button & Mode Info */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={onBackHome}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-teal-700" />
            <span>Ana Ekran</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{meta.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">{meta.subtitle}</p>
          </div>
        </div>

        <span
          className={`self-start sm:self-auto px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-xs font-semibold border shrink-0 ${meta.badgeClass}`}
        >
          Rol: {currentRole}
        </span>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left 5 Cols: Barcode Camera & Search */}
        <div className="lg:col-span-5">
          <BarcodeScannerCard
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={(p) => {
              setUnmatchedBarcode(null);
              setValidationError(null);
              setSuccessBanner(null);
              onSelectProduct(p);
            }}
            onUnmatchedBarcode={(code) => setUnmatchedBarcode(code)}
          />
        </div>

        {/* Right 7 Cols: Matched Product Card & Focused Operational Form */}
        <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
          {unmatchedBarcode ? (
            <div className="w-full bg-white border-2 border-amber-200 rounded-2xl p-5 sm:p-8 flex flex-col items-center text-center shadow-2xs">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-amber-600">
                <AlertTriangle className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                Katalog Eşleşmesi Bulunamadı
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                Okutulan Barkod Sistemde Kayıtlı Değil
              </h3>
              <p className="text-xs text-slate-500 font-mono mb-3">
                Aranan Kod: <strong className="text-amber-700">{unmatchedBarcode}</strong>
              </p>
              <p className="text-xs text-slate-600 max-w-md mb-5 leading-relaxed">
                Bu barkoda ait ürün kartı bulunamadı. Yeni bir ürünse Sistem Yöneticisi (Admin) panelinden yeni ürün kartı açılmalıdır.
              </p>
              <button
                type="button"
                onClick={() => setUnmatchedBarcode(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Tekrar Sorgula
              </button>
            </div>
          ) : !selectedProduct ? (
            <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center min-h-[240px] sm:min-h-[320px] shadow-2xs">
              <Package className="w-10 sm:w-12 h-10 sm:h-12 text-slate-400 mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                İşlem Yapılacak Ürünü Seçin
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Yukarıdan barkod okutun veya hızlı seçim listesinden bir ürüne tıklayın.
              </p>
            </div>
          ) : (
            <>
              {/* Matched Product & Batches Card */}
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
                {/* Top Match Status & Stock Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 sm:pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      Aktif Ürün Kartı
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${
                      isCritical
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isCritical
                      ? `Kritik (${totalStock} / Eşik: ${selectedProduct.minCriticalStock} ${selectedProduct.unit})`
                      : `Stok: ${totalStock} ${selectedProduct.unit}`}
                  </span>
                </div>

                {/* Product Name & Key Details */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedProduct.sku}
                    </span>
                    <span className="text-slate-500 font-medium">{selectedProduct.category}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-600 text-[11px] sm:text-xs">
                      EAN: {selectedProduct.barcode}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {selectedProduct.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {selectedProduct.subtitle} — <span className="text-slate-600 font-medium">{selectedProduct.storageCondition}</span>
                  </p>
                </div>

                {/* Batches / Lot Breakdown */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Parti (Lot &amp; SKT) Dağılımı:
                    </span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      İşlem yapmak istediğiniz partiye tıklayın
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {selectedProduct.batches.map((b) => {
                      const isSelected = b.lotNumber === selectedLot;
                      const isFefo = fefoBatch?.lotNumber === b.lotNumber;
                      const batchDays = Math.ceil(
                        (new Date(b.expiryDate).getTime() - today.getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      const isExpiring = batchDays <= systemRules.minExpiryDaysForExit;

                      return (
                        <div
                          key={b.batchId}
                          onClick={() => {
                            setSelectedLot(b.lotNumber);
                            setValidationError(null);
                          }}
                          className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-[0.99] ${
                            isSelected
                              ? 'bg-teal-50/50 border-teal-700 shadow-xs'
                              : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">
                                {b.lotNumber}
                              </span>
                              {isFefo && !isExpiring && (
                                <span className="text-[10px] sm:text-[11px] font-bold bg-teal-700 text-white px-1.5 py-0.5 rounded">
                                  FEFO
                                </span>
                              )}
                              {isExpiring && (
                                <span className="text-[10px] sm:text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded">
                                  SKT {batchDays}g
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>SKT: {b.expiryDate}</span>
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                              <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                              <span className="truncate">{b.shelfLocation}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base sm:text-lg font-bold font-mono text-teal-800 block">
                              {b.quantity}
                            </span>
                            <span className="text-[11px] text-slate-500">{selectedProduct.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Transition Buttons in SORGULAMA Mode */}
                {mode === 'SORGULAMA' && (
                  <div className="pt-3.5 border-t border-slate-100 space-y-2">
                    <span className="text-xs font-semibold text-slate-500 block">
                      Bu ürünle hızlı işlem başlat:
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSwitchMode('STOK_GİRİŞİ')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Stok Girişi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchMode('STOK_ÇIKIŞI')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>FEFO Çıkış</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchMode('TRANSFER')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Raf Transferi</span>
                      </button>
                      {(currentRole === 'Depo Sorumlusu' || currentRole === 'Admin') && (
                        <button
                          type="button"
                          onClick={() => onSwitchMode('SAYIM_DÜZELTME')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer shrink-0"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Sayım Düzeltme</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Operational Form (When mode is NOT SORGULAMA) */}
              {mode !== 'SORGULAMA' && (
                <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900">
                        {meta.title} Kayıt Formu
                      </h3>
                      <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Parti: {mode === 'STOK_GİRİŞİ' ? entryLotNumber : activeBatch?.lotNumber}
                      </span>
                    </div>

                    {/* Natural Operational Validation / Error Banner */}
                    {validationError && (
                      <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                              {validationError.title}
                            </h4>
                            <p className="text-xs text-rose-800 leading-relaxed">
                              {validationError.message}
                            </p>
                          </div>
                        </div>

                        {validationError.canRedirectQuarantine && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setValidationError(null);
                                setTargetShelf('KARANTINA-01');
                                setNote('SKT süresi yaklaştığı için Karantina alanına alındı.');
                                onSwitchMode('TRANSFER');
                              }}
                              className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer text-center"
                            >
                              Karantina Transfer Ekranına Geç
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Success Banner */}
                    {successBanner && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-medium text-emerald-800 flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{successBanner}</span>
                      </div>
                    )}

                    {/* FEFO Warning if user selected a later-expiring batch during exit */}
                    {mode === 'STOK_ÇIKIŞI' &&
                      systemRules.enforceFefoPriority &&
                      fefoBatch &&
                      activeBatch &&
                      fefoBatch.lotNumber !== activeBatch.lotNumber && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span>
                            <strong>FEFO Önerisi:</strong> SKT&apos;si daha yakın olan{' '}
                            <strong className="font-mono">{fefoBatch.lotNumber}</strong> ({fefoBatch.expiryDate}) partisi mevcut.
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedLot(fefoBatch.lotNumber)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold shrink-0 cursor-pointer text-center"
                          >
                            FEFO Partisini Seç
                          </button>
                        </div>
                      )}

                    {mode === 'STOK_GİRİŞİ' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Gelen Parti (Lot) Numarası *
                          </label>
                          <input
                            type="text"
                            required
                            value={entryLotNumber}
                            onChange={(e) => setEntryLotNumber(e.target.value)}
                            placeholder="Örn: LOT-26-001"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-600 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Son Kullanma Tarihi (SKT) *
                          </label>
                          <input
                            type="date"
                            required
                            value={entryExpiryDate}
                            onChange={(e) => setEntryExpiryDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {mode === 'SAYIM_DÜZELTME'
                            ? `Fiziksel Sayılan Net Miktar (${selectedProduct.unit}) *`
                            : `İşlem Miktarı (${selectedProduct.unit}) *`}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAmount(Math.max(mode === 'SAYIM_DÜZELTME' ? 0 : 1, amount - 1))}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold flex items-center justify-center shrink-0 active:scale-95"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={mode === 'SAYIM_DÜZELTME' ? '0' : '1'}
                            required
                            value={amount}
                            onChange={(e) => {
                              setAmount(Number(e.target.value));
                              setValidationError(null);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 font-mono font-bold text-center focus:outline-none focus:border-teal-600 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setAmount(amount + 1)}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold flex items-center justify-center shrink-0 active:scale-95"
                          >
                            +
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex gap-1.5 mt-2">
                          {[5, 10, 25, 50].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAmount(preset)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-semibold"
                            >
                              +{preset}
                            </button>
                          ))}
                          {activeBatch && mode !== 'STOK_GİRİŞİ' && (
                            <button
                              type="button"
                              onClick={() => setAmount(activeBatch.quantity)}
                              className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold border border-teal-200"
                            >
                              Tümü ({activeBatch.quantity})
                            </button>
                          )}
                        </div>

                        {activeBatch && mode !== 'STOK_GİRİŞİ' && (
                          <span className="text-[11px] sm:text-xs text-slate-500 mt-1.5 block">
                            Seçili partide mevcut:{' '}
                            <strong className="text-slate-800 font-mono">
                              {activeBatch.quantity} {selectedProduct.unit}
                            </strong>{' '}
                            (Kalan SKT: {diffDays} gün)
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {mode === 'STOK_GİRİŞİ' || mode === 'TRANSFER'
                            ? 'Hedef Raf Konumu *'
                            : 'İşlem Noktası'}
                        </label>
                        {mode === 'STOK_GİRİŞİ' || mode === 'TRANSFER' ? (
                          <select
                            value={targetShelf}
                            onChange={(e) => setTargetShelf(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-600 focus:bg-white"
                          >
                            {activeShelves.length === 0 ? (
                              <option value="">Önce Admin Panelinden Raf Ekleyin</option>
                            ) : (
                              activeShelves.map((s) => (
                                <option key={s.id} value={s.code}>
                                  {s.code} ({s.label})
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            disabled
                            value={
                              mode === 'STOK_ÇIKIŞI'
                                ? 'SEVKİYAT ÇIKIŞ RAMPASI'
                                : activeBatch?.shelfLocation || ''
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-base sm:text-sm text-slate-600 font-mono"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {mode === 'SAYIM_DÜZELTME'
                          ? 'Sayım Farkı Gerekçesi (Zorunlu) *'
                          : 'İrsaliye / İşlem Açıklaması'}
                      </label>
                      <input
                        type="text"
                        required={mode === 'SAYIM_DÜZELTME' && systemRules.requireCountNote}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          mode === 'SAYIM_DÜZELTME'
                            ? 'Örn: Raf sayımında 2 kutu hasarlı ambalaj tespit edildi.'
                            : 'İsteğe bağlı sipariş veya sevkiyat notu...'
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3.5 rounded-xl text-sm sm:text-base font-bold ${meta.btnClass} transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2`}
                      >
                        {isSubmitting ? 'İşlem Kaydediliyor...' : `${meta.title} Kaydını Tamamla`}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
