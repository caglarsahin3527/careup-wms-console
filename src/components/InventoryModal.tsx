'use client';

import React, { useState } from 'react';
import { Package, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Product } from '../data/mockData';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
              <Package className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Kayıtlı Ürün &amp; Stok Kataloğu</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Depodaki tüm takviye edici gıdalar ve parti bakiyeleri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 sm:mt-4 relative shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, kategori, SKU veya barkod ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
          />
        </div>

        {/* Product List */}
        <div className="mt-3 sm:mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Eşleşen ürün bulunamadı.
            </div>
          ) : (
            filtered.map((p) => {
              const totalStock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
              const isCritical = totalStock <= p.minCriticalStock;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 hover:bg-teal-50/40 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {p.sku}
                      </span>
                      <span className="text-[11px] sm:text-xs text-slate-500">{p.category}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] sm:text-xs font-mono text-slate-600">{p.barcode}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug">
                      {p.name}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500">{p.subtitle}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                      {totalStock} {p.unit}
                    </span>
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        Kritik Stok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Stok Yeterli
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
