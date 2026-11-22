'use client';

import React from 'react';
import {
  Package,
  Wifi,
  WifiOff,
  Home,
  LogOut,
} from 'lucide-react';
import { UserRole, WarehouseUser } from '../data/mockData';

interface HeaderProps {
  currentRole: UserRole;
  currentUser?: WarehouseUser | null;
  onLogout?: () => void;
  isOnline: boolean;
  onToggleNetwork: () => void;
  pendingQueueCount: number;
  onOpenInventoryModal: () => void;
  activeScreen: string;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  onLogout,
  isOnline,
  onToggleNetwork,
  pendingQueueCount,
  onOpenInventoryModal,
  activeScreen,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Brand Identity (Compact on mobile) */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2 cursor-pointer group shrink-0 select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Biorasence Logo"
            className="h-7 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <div className="h-4 w-px bg-slate-200 hidden md:block" />
          <span className="hidden md:inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 tracking-tight">
            Lojistik &amp; Parti Takip
          </span>
        </div>

        {/* Right: Navigation, Role Switcher, Network & Catalog */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {activeScreen !== 'HOME' && (
            <button
              onClick={onGoHome}
              aria-label="Ana Ekran"
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-teal-700" />
              <span className="hidden lg:inline">Ana Ekran</span>
            </button>
          )}

          {/* Network Status Toggle Button */}
          <button
            type="button"
            onClick={onToggleNetwork}
            title={
              isOnline
                ? 'Çevrimiçi (Saha çevrimdışı modunu test etmek için tıklayın)'
                : `Çevrimdışı: Kuyrukta ${pendingQueueCount} işlem var`
            }
            className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Çevrimiçi</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Çevrimdışı ({pendingQueueCount})</span>
                <span className="sm:hidden font-mono text-[10px]">{pendingQueueCount}</span>
              </>
            )}
          </button>

          {/* All Products Modal Trigger */}
          <button
            type="button"
            onClick={onOpenInventoryModal}
            aria-label="Stok Kataloğu"
            title="Kayıtlı Ürün & Stok Kataloğu"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-800 bg-white hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer"
          >
            <Package className="w-4 h-4 text-teal-700" />
            <span className="hidden sm:inline">Stok Kataloğu</span>
          </button>

          {/* User Info & Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Oturumu Kapat"
              title="Oturumu Kapat"
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
