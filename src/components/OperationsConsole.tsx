'use client';

import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  CheckCircle,
  Clock,
  Shield,
  CornerDownRight,
} from 'lucide-react';
import { Product, Batch } from '../data/mockData';

interface OperationsConsoleProps {
  product: Product | null;
  currentRole: 'Depo Personeli' | 'Depo Sorumlusu';
  onExecuteTransaction: (params: {
    type: 'STOK_GİRİŞİ' | 'STOK_ÇIKIŞI' | 'TRANSFER' | 'SAYIM_DÜZELTME';
    lotNumber: string;
    amount: number;
    sourceShelf: string;
    targetShelf: string;
    note: string;
    expiryDate?: string;
  }) => { success: boolean; error?: string; errorType?: string };
  onTriggerExceptionModal: (scenarioId: string, details?: any) => void;
  isOnline: boolean;
}

export const OperationsConsole: React.FC<OperationsConsoleProps> = ({
  product,
  currentRole,
  onExecuteTransaction,
  onTriggerExceptionModal,
  isOnline,
}) => {
  const [activeTab, setActiveTab] = useState<'EXIT' | 'ENTRY' | 'TRANSFER' | 'COUNT'>('EXIT');

  // Form states
  const [selectedLot, setSelectedLot] = useState<string>('');
  const [amount, setAmount] = useState<number>(10);
  const [targetShelf, setTargetShelf] = useState<string>('RAF-A1-02-01');
  const [entryLotNumber, setEntryLotNumber] = useState<string>('LOT-25-YENI');
  const [entryExpiryDate, setEntryExpiryDate] = useState<string>('2027-12-31');
  const [transactionNote, setTransactionNote] = useState<string>('');

  // Lock and feedback states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Sync selectedLot to the earliest expiring lot (FEFO) when product changes
  React.useEffect(() => {
    if (product && product.batches.length > 0) {
      const sorted = [...product.batches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      setSelectedLot(sorted[0].lotNumber);
    }
  }, [product]);

  if (!product) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Layers className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-semibold text-slate-800">İşlem Yapılacak Kalemi Seçin</h3>
        <p className="text-2xs text-slate-500 max-w-xs">
          Sol envanter listesinden bir ürün seçerek veya optik okuyucuyla taratarak operasyon konsolunu açabilirsiniz.
        </p>
      </div>
    );
  }

  // Active batch object
  const activeBatch = product.batches.find((b) => b.lotNumber === selectedLot) || product.batches[0];

  // FEFO best batch
  const fefoBatch = [...product.batches].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )[0];

  // Days left for active batch
  const today = new Date('2026-11-22');
  const expDate = new Date(activeBatch?.expiryDate || '2027-01-01');
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      onTriggerExceptionModal('SCENARIO_DOUBLE_SUBMIT', {
        action: 'Çift Tıklama / Mükerrer Gönderim Girişimi',
      });
      return;
    }

    // 1. Role permission guard for Count
    if (activeTab === 'COUNT' && currentRole !== 'Depo Sorumlusu') {
      onTriggerExceptionModal('SCENARIO_UNAUTHORIZED_COUNT', {
        userRole: currentRole,
        action: 'Sayım Düzeltmesi',
      });
      return;
    }

    // 2. Negative Stock Guard for EXIT
    if (activeTab === 'EXIT') {
      if (!activeBatch || amount > activeBatch.quantity) {
        onTriggerExceptionModal('SCENARIO_NEGATIVE_STOCK', {
          requestedAmount: amount,
          availableAmount: activeBatch?.quantity || 0,
          lotNumber: activeBatch?.lotNumber,
          productName: product.name,
        });
        return;
      }

      // 3. Expired or near-expiry (<30 days) Guard
      if (diffDays <= 30) {
        onTriggerExceptionModal('SCENARIO_EXPIRED_EXIT', {
          lotNumber: activeBatch.lotNumber,
          expiryDate: activeBatch.expiryDate,
          daysLeft: diffDays,
          productName: product.name,
        });
        return;
      }
    }

    // Lock submit button
    setIsSubmitting(true);

    const result = onExecuteTransaction({
      type:
        activeTab === 'ENTRY'
          ? 'STOK_GİRİŞİ'
          : activeTab === 'EXIT'
          ? 'STOK_ÇIKIŞI'
          : activeTab === 'TRANSFER'
          ? 'TRANSFER'
          : 'SAYIM_DÜZELTME',
      lotNumber: activeTab === 'ENTRY' ? entryLotNumber : activeBatch.lotNumber,
      amount: Number(amount),
      sourceShelf: activeTab === 'ENTRY' ? 'MAL_KABUL_RAMPASI' : activeBatch.shelfLocation,
      targetShelf:
        activeTab === 'ENTRY'
          ? targetShelf
          : activeTab === 'EXIT'
          ? 'SEVKİYAT_KONSORSİYUM'
          : activeTab === 'TRANSFER'
          ? targetShelf
          : activeBatch.shelfLocation,
      note: transactionNote || (isOnline ? 'Standart WMS hareketi' : 'Çevrimdışı yerel kayıt'),
      expiryDate: activeTab === 'ENTRY' ? entryExpiryDate : activeBatch.expiryDate,
    });

    if (result.success) {
      setFeedbackMessage({
        type: 'ok',
        text: `Hareket başarıyla işlendi: ${amount} ${product.unit} güncellendi.`,
      });
    } else {
      setFeedbackMessage({
        type: 'err',
        text: result.error || 'İşlem sırasında hata meydana geldi.',
      });
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setFeedbackMessage(null);
    }, 1800);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden flex flex-col">
      {/* Product Spec Header */}
      <div className="p-4 bg-slate-925 text-white border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded">
                {product.sku}
              </span>
              <span className="text-2xs text-slate-400">{product.category}</span>
              <span className="text-2xs font-mono text-slate-500">GTIN: {product.barcode}</span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">{product.name}</h2>
            <p className="text-2xs text-slate-400">{product.subtitle}</p>
          </div>

          <div className="bg-slate-850 border border-slate-700/80 rounded px-2.5 py-1.5 text-2xs space-y-0.5 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Saklama Koşulu:</span>
              <span className="text-slate-200 font-medium">{product.storageCondition}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Koli Standart:</span>
              <span className="font-mono text-slate-200 font-bold">
                {product.unitsPerCarton} {product.unit} / Koli
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FEFO Intelligent Allocation Signal */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-2xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            FEFO KURALI
          </span>
          <span className="text-2xs text-slate-300">
            Tahsis Edilen Parti: <strong className="font-mono text-white">{activeBatch?.lotNumber}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-2xs font-mono text-slate-300">SKT: {activeBatch?.expiryDate}</span>
          <span className="text-slate-600">•</span>
          <span
            className={`text-2xs font-mono font-bold ${
              diffDays <= 30 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {diffDays} Gün Kaldı
          </span>
        </div>

        <div className="flex items-center gap-3 text-2xs font-mono text-slate-400">
          <span>
            Raf: <strong className="text-slate-200">{activeBatch?.shelfLocation}</strong>
          </span>
          <span>•</span>
          <span>
            Bakiye:{' '}
            <strong className="text-white text-xs tabular-nums">
              {activeBatch?.quantity} {product.unit}
            </strong>
          </span>
        </div>
      </div>

      {/* Operation Tabs Navigation */}
      <div className="border-b border-slate-200 bg-slate-50 flex items-center p-1 gap-1">
        <button
          onClick={() => setActiveTab('EXIT')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'EXIT'
              ? 'bg-white text-slate-900 border border-slate-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sevkiyat Çıkışı (FEFO)</span>
        </button>

        <button
          onClick={() => setActiveTab('ENTRY')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'ENTRY'
              ? 'bg-white text-slate-900 border border-slate-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
          <span>Mal Kabul (Giriş)</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSFER')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'TRANSFER'
              ? 'bg-white text-slate-900 border border-slate-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />
          <span>Lokasyon Transferi</span>
        </button>

        <button
          onClick={() => setActiveTab('COUNT')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'COUNT'
              ? 'bg-white text-slate-900 border border-slate-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Sayım Mutabakatı</span>
          {currentRole !== 'Depo Sorumlusu' && (
            <span className="text-2xs font-mono text-slate-400 bg-slate-200 px-1 py-0.2 rounded">
              Sorumlu
            </span>
          )}
        </button>
      </div>

      {/* Form Area */}
      <form onSubmit={handleActionSubmit} className="p-4 space-y-3.5">
        {/* Lot selection pills for Exit / Transfer */}
        {activeTab !== 'ENTRY' && (
          <div>
            <label className="block text-2xs font-mono font-bold text-slate-600 uppercase mb-1">
              Aktif Parti / Lot Seçimi:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.batches.map((b) => {
                const isSelected = b.lotNumber === selectedLot;
                const isFefoBest = b.lotNumber === fefoBatch.lotNumber;
                return (
                  <div
                    key={b.batchId}
                    onClick={() => setSelectedLot(b.lotNumber)}
                    className={`p-2.5 rounded border cursor-pointer text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600/40'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 text-xs">{b.lotNumber}</span>
                        {isFefoBest && (
                          <span className="bg-emerald-100 text-emerald-800 text-2xs font-mono font-semibold px-1 py-0.2 rounded">
                            FEFO Öncelik
                          </span>
                        )}
                      </div>
                      <span className="text-2xs text-slate-500 font-mono">
                        SKT: {b.expiryDate} • Konum: {b.shelfLocation}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                      {b.quantity} {product.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Input fields for New Entry */}
        {activeTab === 'ENTRY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded border border-slate-200">
            <div>
              <label className="block text-2xs font-mono font-semibold text-slate-700 mb-1">
                İmalat Parti / Lot Numarası
              </label>
              <input
                type="text"
                value={entryLotNumber}
                onChange={(e) => setEntryLotNumber(e.target.value)}
                required
                className="w-full text-xs font-mono font-bold border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900"
                placeholder="Örn: LOT-25-MG03"
              />
            </div>
            <div>
              <label className="block text-2xs font-mono font-semibold text-slate-700 mb-1">
                Son Kullanma Tarihi (SKT)
              </label>
              <input
                type="date"
                value={entryExpiryDate}
                onChange={(e) => setEntryExpiryDate(e.target.value)}
                required
                className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900"
              />
            </div>
          </div>
        )}

        {/* Amount & Shelf Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-2xs font-mono font-bold text-slate-600 uppercase mb-1">
              {activeTab === 'COUNT' ? 'Fiziksel Sayım Miktarı' : 'İşlem Miktarı'}{' '}
              <span className="font-normal text-slate-400">({product.unit})</span>
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full text-sm font-mono font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xs font-mono font-bold text-slate-600 uppercase mb-1">
              {activeTab === 'ENTRY' || activeTab === 'TRANSFER'
                ? 'Hedef Ambar / Raf Koordinatı'
                : activeTab === 'EXIT'
                ? 'Çıkış Noktası'
                : 'Sayım Lokasyonu'}
            </label>
            {activeTab === 'TRANSFER' || activeTab === 'ENTRY' ? (
              <select
                value={targetShelf}
                onChange={(e) => setTargetShelf(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-600"
              >
                <option value="RAF-A1-02-01">RAF-A1-02-01 (Katı Dozaj Alanı)</option>
                <option value="RAF-B2-01-03">RAF-B2-01-03 (İklimlendirmeli Bölge)</option>
                <option value="RAF-C1-04-01">RAF-C1-04-01 (Pastil &amp; Kuru Raf)</option>
                <option value="KARANTINA-01">KARANTINA-01 (Numune &amp; Şüpheli Parti)</option>
              </select>
            ) : (
              <input
                type="text"
                disabled
                value={activeTab === 'EXIT' ? 'SEVKİYAT RAMPASI (Eczane Dağıtım)' : activeBatch?.shelfLocation}
                className="w-full text-xs font-mono bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-slate-600"
              />
            )}
          </div>
        </div>

        {/* Transaction Note / Reason */}
        <div>
          <label className="block text-2xs font-mono font-bold text-slate-600 uppercase mb-1">
            {activeTab === 'COUNT' ? 'Sayım Farkı / Fire Gerekçesi *' : 'İrsaliye Ref / Açıklama'}
          </label>
          <input
            type="text"
            value={transactionNote}
            onChange={(e) => setTransactionNote(e.target.value)}
            required={activeTab === 'COUNT'}
            placeholder={
              activeTab === 'COUNT'
                ? 'Örn: Raf kontrollerinde 2 kutu ambalaj yırtığı tespit edildi.'
                : 'İrsaliye no veya sevkiyat sipariş kodu (isteğe bağlı)'
            }
            className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div
            className={`p-2.5 rounded text-xs font-medium flex items-center gap-2 ${
              feedbackMessage.type === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedbackMessage.type === 'ok' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Action Button & Lock */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
          <span className="text-2xs text-slate-400 font-mono">
            İşlem tekil token ile idempotent olarak yürütülür.
          </span>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2 rounded text-xs font-semibold shadow-subtle transition-all flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                : activeTab === 'EXIT'
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : activeTab === 'ENTRY'
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : activeTab === 'TRANSFER'
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-amber-700 hover:bg-amber-800 text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>İşleniyor...</span>
              </>
            ) : (
              <span>
                {activeTab === 'EXIT'
                  ? 'FEFO Sevkiyat Çıkışını Onayla'
                  : activeTab === 'ENTRY'
                  ? 'Mal Kabulü Kaydet'
                  : activeTab === 'TRANSFER'
                  ? 'Transferi Başlat'
                  : 'Sayım Farkını Onayla'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
