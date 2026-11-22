'use client';

import React, { useState } from 'react';
import {
  PackagePlus,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Search,
  Loader2,
  Camera,
  XCircle,
} from 'lucide-react';
import { Product, Batch, ShelfLocation, UserRole } from '../data/mockData';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';

interface ProductEntryPanelProps {
  currentRole: UserRole;
  products: Product[];
  shelves: ShelfLocation[];
  isOnline: boolean;
  onCreateProduct: (newProduct: Product) => Promise<{ success: boolean; error?: string; warning?: string }>;
  onBackHome: () => void;
}

/**
 * Depo Sorumlusu Ürün Girişi Ekranı
 * Depo Sorumlusu (ve Admin) yeni ürün kartını açılış partisiyle birlikte veritabanına kaydeder.
 * Ürün silme / kritik eşik düzenleme gibi ana veri yönetimi işlemleri Admin panelinde kalır.
 */
export const ProductEntryPanel: React.FC<ProductEntryPanelProps> = ({
  currentRole,
  products,
  shelves,
  isOnline,
  onCreateProduct,
  onBackHome,
}) => {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newForm, setNewForm] = useState<Product['form']>('Tablet');
  const [newUnit, setNewUnit] = useState<Product['unit']>('Kutu');
  const [newCategory, setNewCategory] = useState<Product['category']>('Vitamin & Mineral');
  const [newMinStock, setNewMinStock] = useState<number>(30);
  const [newUnitsPerCarton, setNewUnitsPerCarton] = useState<number>(24);
  const [newZone, setNewZone] = useState<Product['zone']>('A1');
  const [newStorage, setNewStorage] = useState('Oda Sıcaklığı (<25°C)');
  const [initialLot, setInitialLot] = useState('');
  const [initialExpiry, setInitialExpiry] = useState('');
  const [initialQty, setInitialQty] = useState<number>(0);
  const [initialShelf, setInitialShelf] = useState('');

  const activeShelves = shelves.filter((s) => s.isActive);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    if (type === 'success') {
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleBarcodeDetected = (scannedCode: string) => {
    const cleaned = scannedCode.trim();
    if (!cleaned) return;
    setNewBarcode(cleaned);
    setIsScannerOpen(false);

    const existing = products.find((p) => p.barcode === cleaned);
    if (existing) {
      showFeedback(
        'error',
        `"${cleaned}" barkodu "${existing.name}" (${existing.sku}) ürün kartına zaten kayıtlı.`
      );
    } else {
      showFeedback('success', `Barkod kamera ile okundu: ${cleaned}`);
    }
  };

  // RBAC Koruması: Yalnızca Depo Sorumlusu ve Admin ürün kartı girebilir
  if (currentRole !== 'Depo Sorumlusu' && currentRole !== 'Admin') {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white border-2 border-rose-200 rounded-2xl shadow-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-mono">
            <Lock className="w-3.5 h-3.5" />
            Yetkisiz Erişim • Depo Sorumlusu
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Ürün Girişi Ekranına Erişim Yetkiniz Yok
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Veritabanına yeni ürün kartı tanımlama yetkisi yalnızca{' '}
            <strong className="text-slate-900">Depo Sorumlusu</strong> ve{' '}
            <strong className="text-slate-900">Admin</strong> rollerine aittir. Aktif rolünüz:{' '}
            <strong className="text-rose-700">{currentRole}</strong>.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const sku = newSku.trim().toUpperCase();
    const barcode = newBarcode.trim();
    const name = newName.trim();

    if (!sku || !barcode || !name) {
      showFeedback('error', 'Lütfen SKU, Barkod ve Ürün Adı alanlarını doldurunuz.');
      return;
    }
    if (products.some((p) => p.sku.toUpperCase() === sku)) {
      showFeedback('error', `"${sku}" ürün kodu (SKU) zaten kayıtlı. Farklı bir SKU giriniz.`);
      return;
    }
    if (products.some((p) => p.barcode === barcode)) {
      showFeedback('error', `"${barcode}" barkodu başka bir ürün kartına tanımlı.`);
      return;
    }

    const hasAnyBatchField = initialLot.trim() || initialExpiry || initialQty > 0;
    const hasFullBatch = initialLot.trim() && initialExpiry && initialQty > 0;
    if (hasAnyBatchField && !hasFullBatch) {
      showFeedback(
        'error',
        'Açılış partisi için Lot No, SKT Tarihi ve sıfırdan büyük miktar birlikte girilmelidir. Parti girmeyecekseniz bu alanları boş bırakın.'
      );
      return;
    }

    const createdBatches: Batch[] = [];
    if (hasFullBatch) {
      const selectedShelf = initialShelf.trim() || activeShelves[0]?.code || '';
      if (!selectedShelf) {
        showFeedback('error', 'Açılış partisi için tanımlı aktif bir raf bulunamadı. Lütfen Admin\'den raf tanımlamasını isteyin.');
        return;
      }
      createdBatches.push({
        batchId: `b-${Date.now()}`,
        lotNumber: initialLot.trim().toUpperCase(),
        expiryDate: initialExpiry,
        quantity: Number(initialQty),
        shelfLocation: selectedShelf,
        isQuarantine: selectedShelf.includes('KARANTINA'),
      });
    }

    const created: Product = {
      id: `prod-${Date.now()}`,
      sku,
      barcode,
      name,
      subtitle: newSubtitle.trim() || `${newForm} Takviye Edici Gıda`,
      form: newForm,
      unit: newUnit,
      unitsPerCarton: Number(newUnitsPerCarton) > 0 ? Number(newUnitsPerCarton) : 24,
      category: newCategory,
      minCriticalStock: Number(newMinStock) >= 0 ? Number(newMinStock) : 30,
      zone: newZone,
      storageCondition: newStorage.trim() || 'Oda Sıcaklığı (<25°C)',
      batches: createdBatches,
    };

    setIsSubmitting(true);
    try {
      const res = await onCreateProduct(created);
      if (!res.success) {
        showFeedback('error', res.error || 'Ürün kartı veritabanına kaydedilemedi.');
        return;
      }
      if (res.warning) {
        showFeedback('error', res.warning);
      } else {
        showFeedback('success', `"${created.name}" (${created.sku}) veritabanına ve ürün kataloğuna eklendi.`);
      }
      setNewSku('');
      setNewBarcode('');
      setNewName('');
      setNewSubtitle('');
      setInitialLot('');
      setInitialExpiry('');
      setInitialQty(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const q = listQuery.trim().toLowerCase();
  const listedProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)
      )
    : products;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                Ürün Girişi (Veritabanı Kaydı)
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                {currentRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Depoya yeni giren ürünün kartını açılış partisiyle birlikte veritabanına kaydedin.
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          {products.length} Kayıtlı Ürün
        </span>
      </div>

      {/* Offline uyarısı */}
      {!isOnline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Çevrimdışı saha modundasınız. Ürün kartları doğrudan veritabanına yazıldığı için bağlantı gelene kadar yeni ürün kaydedilemez.
          </span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.msg}</span>
          {feedback.type === 'error' && (
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold text-rose-800 hover:underline cursor-pointer shrink-0"
            >
              Kapat
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 cols: Product Entry Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Yeni Ürün Kartı Gir</h3>
                <p className="text-xs text-slate-500">Kamera ile barkod okutun veya manuel girin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsScannerOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
                isScannerOpen
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-700'
              }`}
            >
              {isScannerOpen ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Kapat</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Barkod Okut</span>
                </>
              )}
            </button>
          </div>

          <CameraBarcodeScanner
            isOpen={isScannerOpen}
            onDetected={handleBarcodeDetected}
            onClose={() => setIsScannerOpen(false)}
          />

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pe-sku" className="block text-xs font-semibold text-slate-700 mb-1">
                  Ürün Kodu (SKU) *
                </label>
                <input
                  id="pe-sku"
                  type="text"
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label htmlFor="pe-barcode" className="block text-xs font-semibold text-slate-700 mb-1">
                  EAN-13 Barkod *
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="pe-barcode"
                    type="text"
                    inputMode="numeric"
                    required
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="Okutun veya yazın"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen((prev) => !prev)}
                    title={isScannerOpen ? 'Kamerayı Kapat' : 'Kamera ile Barkod Okut'}
                    aria-label={isScannerOpen ? 'Kamerayı Kapat' : 'Kamera ile Barkod Okut'}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      isScannerOpen
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="pe-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Ürün Adı *
              </label>
              <input
                id="pe-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Örn: Care Up Çinko Pikolinat 15 mg"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label htmlFor="pe-subtitle" className="block text-xs font-semibold text-slate-700 mb-1">
                Formül &amp; Ambalaj Özeti
              </label>
              <input
                id="pe-subtitle"
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="Örn: Bağışıklık Desteği • 60 Tablet"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label htmlFor="pe-form" className="block text-xs font-semibold text-slate-700 mb-1">Form</label>
                <select
                  id="pe-form"
                  value={newForm}
                  onChange={(e) => setNewForm(e.target.value as Product['form'])}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Softjel">Softjel</option>
                  <option value="Pastil">Pastil</option>
                  <option value="Sıvı/Damla">Sıvı/Damla</option>
                </select>
              </div>
              <div>
                <label htmlFor="pe-unit" className="block text-xs font-semibold text-slate-700 mb-1">Birim</label>
                <select
                  id="pe-unit"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value as Product['unit'])}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                >
                  <option value="Kutu">Kutu</option>
                  <option value="Şişe">Şişe</option>
                </select>
              </div>
              <div>
                <label htmlFor="pe-carton" className="block text-xs font-semibold text-slate-700 mb-1">Koli İçi</label>
                <input
                  id="pe-carton"
                  type="number"
                  min="1"
                  value={newUnitsPerCarton}
                  onChange={(e) => setNewUnitsPerCarton(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                />
              </div>
              <div>
                <label htmlFor="pe-min" className="block text-xs font-semibold text-slate-700 mb-1">Kritik Eşik</label>
                <input
                  id="pe-min"
                  type="number"
                  min="0"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pe-category" className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  id="pe-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Product['category'])}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                >
                  <option value="Vitamin & Mineral">Vitamin &amp; Mineral</option>
                  <option value="Omega & Yağ Asitleri">Omega &amp; Yağ Asitleri</option>
                  <option value="Pastil & Bitkisel">Pastil &amp; Bitkisel</option>
                  <option value="Bağışıklık">Bağışıklık</option>
                </select>
              </div>
              <div>
                <label htmlFor="pe-zone" className="block text-xs font-semibold text-slate-700 mb-1">Ambar Bölgesi</label>
                <select
                  id="pe-zone"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value as Product['zone'])}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                >
                  <option value="A1">A1 (Ana Raf)</option>
                  <option value="B2">B2 (Serin Depo)</option>
                  <option value="C1">C1 (Pastil Alanı)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="pe-storage" className="block text-xs font-semibold text-slate-700 mb-1">
                Saklama Koşulu
              </label>
              <input
                id="pe-storage"
                type="text"
                value={newStorage}
                onChange={(e) => setNewStorage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="block text-xs font-bold text-slate-700">Açılış Partisi (Başlangıç Stoku)</span>
                <span className="text-[11px] text-slate-500">İsteğe bağlı</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pe-lot" className="block text-[11px] font-medium text-slate-600 mb-1">
                    İlk Parti (Lot) No
                  </label>
                  <input
                    id="pe-lot"
                    type="text"
                    value={initialLot}
                    onChange={(e) => setInitialLot(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="pe-expiry" className="block text-[11px] font-medium text-slate-600 mb-1">
                    SKT Tarihi
                  </label>
                  <input
                    id="pe-expiry"
                    type="date"
                    value={initialExpiry}
                    onChange={(e) => setInitialExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pe-shelf" className="block text-[11px] font-medium text-slate-600 mb-1">
                    Başlangıç Rafı
                  </label>
                  <select
                    id="pe-shelf"
                    value={initialShelf}
                    onChange={(e) => setInitialShelf(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                  >
                    {activeShelves.length === 0 ? (
                      <option value="">Tanımlı raf yok</option>
                    ) : (
                      activeShelves.map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.code}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="pe-qty" className="block text-[11px] font-medium text-slate-600 mb-1">
                    Açılış Miktarı
                  </label>
                  <input
                    id="pe-qty"
                    type="number"
                    min="0"
                    value={initialQty}
                    onChange={(e) => setInitialQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{isSubmitting ? 'Veritabanına Kaydediliyor...' : 'Ürün Kartını Veritabanına Kaydet'}</span>
            </button>
          </form>
        </div>

        {/* Right 7 cols: Registered products (read-only) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Kayıtlı Ürün Kartları</h3>
              <p className="text-xs text-slate-500">
                Mükerrer kayıt açmamak için mevcut ürünleri kontrol edin (Salt Okunur)
              </p>
            </div>
            <div className="relative sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="SKU, barkod veya isim..."
                aria-label="Kayıtlı ürünlerde ara"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[680px] overflow-y-auto">
            {products.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 p-6">
                Veritabanında henüz kayıtlı ürün kartı bulunmuyor. Soldaki formu kullanarak ilk ürün kartını oluşturabilirsiniz.
              </div>
            ) : listedProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 p-6">
                Aramanıza uyan ürün kartı bulunamadı.
              </div>
            ) : (
              listedProducts.map((prod) => {
                const totalStock = prod.batches.reduce((sum, b) => sum + b.quantity, 0);
                return (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {prod.sku}
                        </span>
                        <span className="font-mono text-xs text-slate-500">Barkod: {prod.barcode}</span>
                        <span className="text-xs text-slate-500">• {prod.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{prod.name}</h4>
                      <p className="text-xs text-slate-500">
                        {prod.form} • Ambar {prod.zone} • Kritik Eşik: {prod.minCriticalStock} {prod.unit}
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <strong className="font-mono text-sm text-slate-900 tabular-nums">
                        {totalStock} {prod.unit}
                      </strong>
                      <span className="block text-[11px] text-slate-500">{prod.batches.length} Parti</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
