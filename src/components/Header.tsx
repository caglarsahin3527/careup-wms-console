'use client';

import React from 'react';
import {
  Package,
  User,
  ShieldCheck,
  Settings,
  Wifi,
  WifiOff,
  Home,
  Boxes,
  LogOut,
} from 'lucide-react';
import { UserRole, WarehouseUser } from '../data/mockData';

interface HeaderProps {
  currentRole: UserRole;
  currentUser?: WarehouseUser | null;
  onRoleChange: (role: UserRole) => void;
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
  onRoleChange,
  onLogout,
  isOnline,
  onToggleNetwork,
  pendingQueueCount,
  onOpenInventoryModal,
  activeScreen,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="h-10 w-10 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-sm group-hover:bg-teal-800 transition-colors">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                CareUp <span className="text-teal-700">WMS</span>
              </h1>
              <span className="hidden md:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                Lojistik &amp; Parti Takip
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Takviye Edici Gıda Ambar ve Lot/SKT Yönetim Sistemi
            </p>
          </div>
        </div>

        {/* Right: Navigation, 3-Tier Role Switcher, Network & Catalog */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeScreen !== 'HOME' && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-teal-700" />
              <span className="hidden lg:inline">Ana Ekran</span>
            </button>
          )}

          {/* 3-Tier Role Switcher: Depo Çalışanı | Depo Sorumlusu | Admin */}
          <div
            className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1"
            role="group"
            aria-label="Aktif Kullanıcı Rolü"
          >
            <button
              type="button"
              onClick={() => onRoleChange('Depo Çalışanı')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'Depo Çalışanı'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Depo Çalışanı</span>
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('Depo Sorumlusu')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'Depo Sorumlusu'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Depo Sorumlusu</span>
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('Admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'Admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Network Status Button */}
          <button
            type="button"
            onClick={onToggleNetwork}
            title={
              isOnline
                ? 'Çevrimdışı saha modunu test etmek için tıklayın'
                : 'Tekrar çevrimiçi bağlantıya geçmek için tıklayın'
            }
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Çevrimiçi</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Çevrimdışı ({pendingQueueCount})</span>
              </>
            )}
          </button>

          {/* All Products Modal Trigger */}
          <button
            type="button"
            onClick={onOpenInventoryModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-800 bg-white hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer"
          >
            <Package className="w-4 h-4 text-teal-700" />
            <span className="hidden sm:inline">Stok Kataloğu</span>
          </button>

          {/* User Info & Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Oturumu Kapat"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
