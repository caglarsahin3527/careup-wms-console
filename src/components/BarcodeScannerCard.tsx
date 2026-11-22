'use client';

import React, { useState } from 'react';
import { Camera, Search, ArrowRight, Barcode, XCircle, QrCode } from 'lucide-react';
import { Product } from '../data/mockData';

interface BarcodeScannerCardProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onUnmatchedBarcode?: (barcode: string) => void;
}

export const BarcodeScannerCard: React.FC<BarcodeScannerCardProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onUnmatchedBarcode,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) return;

    const found = products.find(
      (p) =>
        p.barcode.toLowerCase() === query ||
        p.sku.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );

    if (found) {
      onSelectProduct(found);
    } else if (onUnmatchedBarcode) {
      onUnmatchedBarcode(searchInput.trim());
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Optical Scanner & Camera Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 sm:space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Barkod &amp; Katalog Okuyucu</h3>
              <p className="text-[11px] text-slate-500">
                Kamera ile okutun veya EAN-13 / SKU girin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCameraOpen(!isCameraOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              isCameraOpen
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-700'
            }`}
          >
            {isCameraOpen ? (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Kapat</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Kamera Aç</span>
              </>
            )}
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
          {!isCameraOpen ? (
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-2 sm:mb-3 text-teal-700 shadow-2xs">
                <Camera className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                Optik Barkod Tarayıcı Hazır
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 max-w-[240px] mb-3 sm:mb-4 leading-relaxed">
                Kutu üzerindeki barkodu kamera ile taramak için başlatın veya aşağıdaki listeden ürün seçin.
              </p>
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Tarayıcıyı Başlat</span>
              </button>
            </div>
          ) : (
            <div className="inset-0 w-full h-full flex flex-col items-center justify-between p-3 sm:p-4 bg-slate-900 text-white">
              <div className="w-full flex items-center justify-between text-[11px] sm:text-xs text-teal-300 font-mono">
                <span>OPTİK OKUYUCU AKTİF</span>
                <span className="animate-pulse text-emerald-400">● TARANIYOR</span>
              </div>

              {/* Laser Frame */}
              <div className="relative w-[90%] sm:w-[88%] h-[52%] sm:h-[48%] border-2 border-teal-400 rounded-xl overflow-hidden flex items-center justify-center bg-slate-950/50">
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_10px_#2dd4bf] animate-laser" />
                <span className="text-[11px] sm:text-xs text-slate-200 px-3 text-center">
                  Kameraya okutulacak ürünü seçin:
                </span>
              </div>

              {/* Simulated instant scan buttons inside camera */}
              <div className="w-full grid grid-cols-2 gap-1.5">
                {products.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProduct(p);
                      setIsCameraOpen(false);
                    }}
                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-teal-700 border border-slate-700 text-[11px] sm:text-xs text-white truncate text-left transition-all cursor-pointer"
                  >
                    {p.name.replace('Care Up ', '')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual Barcode / SKU Input */}
        <form onSubmit={handleManualSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Barkod (868...), SKU veya ad..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <span>Ara</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Product Selection Pills - Horizontally swipeable on mobile */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-teal-700" />
              Hızlı Seçim:
            </span>
            <span className="text-[10px] text-slate-400 sm:hidden">Kaydır →</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
            {products.length === 0 ? (
              <span className="text-[11px] text-slate-400 italic py-1">
                Kayıtlı ürün bulunmuyor. Admin panelinden ürün ekleyebilirsiniz.
              </span>
            ) : (
              products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const shortName = p.name.replace('Care Up ', '').split(' ')[0] || p.sku;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchInput(p.barcode);
                      onSelectProduct(p);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-teal-700 border-teal-700 text-white font-semibold shadow-2xs'
                        : 'bg-slate-50 hover:bg-teal-50/60 border-slate-200 hover:border-teal-300 text-slate-700'
                    }`}
                  >
                    {shortName} ({p.sku})
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
