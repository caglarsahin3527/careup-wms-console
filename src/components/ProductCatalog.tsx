'use client';

import React, { useState } from 'react';
import { Search, Scan, AlertCircle, CheckCircle2, ChevronRight, X, Sparkles, Filter } from 'lucide-react';
import { Product } from '../data/mockData';

interface ProductCatalogProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  zoneFilter: string;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  zoneFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [formFilter, setFormFilter] = useState<string>('ALL');
  const [showScanner, setShowScanner] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesZone = zoneFilter === 'ALL' || p.zone === zoneFilter;
    const matchesForm = formFilter === 'ALL' || p.form === formFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesZone && matchesForm && matchesSearch;
  });

  const handleSimulatedScan = (barcode: string) => {
    const found = products.find((p) => p.barcode === barcode);
    if (found) {
      onSelectProduct(found);
      setShowScanner(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-subtle flex flex-col h-full overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/50 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <span>Envanter &amp; Takviye Portföyü</span>
            <span className="text-2xs font-mono text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded">
              {filteredProducts.length} SKU
            </span>
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors shadow-subtle"
          >
            <Scan className="w-3.5 h-3.5 text-emerald-400" />
            <span>Barkod / Optik Okuyucu</span>
          </button>
        </div>

        {/* Search input with shortcut hint */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="SKU, barkod veya ticari isimle filtrele..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-slate-900 placeholder-slate-400 font-sans"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-mono bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
            /
          </kbd>
        </div>

        {/* Dosage Form Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-2xs font-medium pt-0.5">
          {['ALL', 'Tablet', 'Softjel', 'Pastil', 'Sıvı/Damla'].map((form) => (
            <button
              key={form}
              onClick={() => setFormFilter(form)}
              className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                formFilter === form
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {form === 'ALL' ? 'Tüm Formlar' : form}
            </button>
          ))}
        </div>
      </div>

      {/* High-density product roster */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[680px]">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Arama kriterlerine uyan ürün bulunamadı.
          </div>
        ) : (
          filteredProducts.map((p) => {
            const totalStock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
            const isCritical = totalStock <= p.minCriticalStock;
            const isSelected = selectedProduct?.id === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className={`p-3 cursor-pointer transition-colors flex items-center justify-between text-left ${
                  isSelected
                    ? 'bg-emerald-50/50 border-l-[3px] border-emerald-600'
                    : 'hover:bg-slate-50/80 border-l-[3px] border-transparent'
                }`}
              >
                <div className="space-y-1 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                      {p.sku}
                    </span>
                    <span className="text-2xs text-slate-500 font-medium">{p.form}</span>
                    <span className="text-2xs font-mono text-slate-400">GTIN: {p.barcode}</span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 leading-snug">{p.name}</h3>
                  <p className="text-2xs text-slate-500 line-clamp-1">{p.subtitle}</p>

                  <div className="flex items-center gap-3 pt-0.5 text-2xs text-slate-500 font-mono">
                    <span>
                      Ambar: <strong className="text-slate-800">{p.zone}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Partiler: <strong className="text-slate-800">{p.batches.length} Lot</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Koli İçi: <strong className="text-slate-800">{p.unitsPerCarton}</strong>
                    </span>
                  </div>
                </div>

                {/* Right stock metric pill */}
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                      {totalStock}
                    </span>
                    <span className="text-2xs text-slate-500">{p.unit}</span>
                  </div>

                  {isCritical ? (
                    <span className="inline-flex items-center gap-1 text-2xs font-semibold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Kritik Seviye
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-2xs font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Yeterli
                    </span>
                  )}
                </div>

                <ChevronRight
                  className={`w-4 h-4 ml-2 transition-transform ${
                    isSelected ? 'text-emerald-700 translate-x-0.5' : 'text-slate-300'
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

      {/* High-end handheld terminal barcode scanner simulation modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-lg max-w-sm w-full p-4 border border-slate-700 shadow-2xl relative space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider">
                  Optik Tarayıcı Arayüzü (Zebra/Honeywell Sim)
                </h4>
              </div>
              <button
                onClick={() => setShowScanner(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewfinder area */}
            <div className="h-44 border border-slate-700 rounded relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
              <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-laser" />
              <div className="text-center space-y-1 z-10 px-4">
                <p className="text-xs text-slate-300 font-mono">1D / 2D Barkod Okuma Modu</p>
                <p className="text-2xs text-slate-500 font-mono">Kamera sensörü hazır</p>
              </div>
            </div>

            {/* Direct select barcode triggers */}
            <div className="space-y-1.5 pt-1">
              <span className="text-2xs font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                Simüle Edilecek Ürün Kodu:
              </span>
              <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSimulatedScan(p.barcode)}
                    className="text-left text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 p-2 rounded flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-200 line-clamp-1 text-2xs">{p.name}</p>
                      <span className="text-2xs text-emerald-400 font-mono">{p.barcode}</span>
                    </div>
                    <span className="text-2xs bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                      Oku
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
