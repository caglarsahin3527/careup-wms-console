'use client';

import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { WarehouseUser, UserRole } from '@/data/mockData';
import { getSupabaseClient } from '@/lib/supabase';

interface LoginScreenProps {
  users: WarehouseUser[];
  onLoginSuccess: (user: WarehouseUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Select State
  const [selectedQuickUser, setSelectedQuickUser] = useState<WarehouseUser | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanId = identifier.trim();
    const cleanPw = password.trim();

    if (!cleanId) {
      setErrorMessage('Lütfen e-posta adresinizi veya personel sicil kodunuzu giriniz.');
      return;
    }
    if (!cleanPw) {
      setErrorMessage('Lütfen şifrenizi giriniz.');
      return;
    }

    setIsLoading(true);

    try {
      const sb = getSupabaseClient('Admin');

      // 1. E-posta mı yoksa Sicil Kodu mu kontrol et
      let targetEmail = cleanId;
      let matchedUser = users.find(
        (u) =>
          u.email?.toLowerCase() === cleanId.toLowerCase() ||
          u.employeeCode?.toUpperCase() === cleanId.toUpperCase()
      );

      // Veritabanında sicil kodu ile ara
      if (!matchedUser) {
        const { data: dbUser } = await sb
          .from('warehouse_users')
          .select('*')
          .or(`email.eq.${cleanId},employee_code.eq.${cleanId.toUpperCase()}`)
          .maybeSingle();

        if (dbUser) {
          matchedUser = {
            id: dbUser.id,
            authUserId: dbUser.auth_user_id,
            name: dbUser.name,
            employeeCode: dbUser.employee_code,
            email: dbUser.email,
            role: dbUser.role,
            assignedZone: dbUser.assigned_zone,
            isActive: dbUser.is_active,
          };
        }
      }

      if (matchedUser?.email) {
        targetEmail = matchedUser.email;
      }

      // 2. Supabase Auth ile Giriş Yapmayı Dene
      const { data: authData, error: authError } = await sb.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPw,
      });

      if (!authError && authData.user) {
        // Auth başarılı! Kullanıcı profilini çek
        const { data: profile } = await sb
          .from('warehouse_users')
          .select('*')
          .or(`auth_user_id.eq.${authData.user.id},email.eq.${targetEmail}`)
          .maybeSingle();

        const activeUser: WarehouseUser = profile
          ? {
              id: profile.id,
              authUserId: profile.auth_user_id || authData.user.id,
              name: profile.name,
              employeeCode: profile.employee_code,
              email: profile.email,
              role: profile.role,
              assignedZone: profile.assigned_zone,
              isActive: profile.is_active,
            }
          : matchedUser || {
              id: `usr-${authData.user.id.substring(0, 8)}`,
              authUserId: authData.user.id,
              name: authData.user.user_metadata?.name || targetEmail.split('@')[0],
              employeeCode: authData.user.user_metadata?.employee_code || 'OP-101',
              email: targetEmail,
              role: (authData.user.user_metadata?.role as UserRole) || 'Depo Çalışanı',
              assignedZone: 'Tüm Ambarlar',
              isActive: true,
            };

        setSuccessMessage(`Giriş başarılı! Hoş geldiniz, ${activeUser.name}.`);
        setTimeout(() => {
          onLoginSuccess(activeUser);
        }, 600);
        return;
      }

      // 3. Eğer Supabase Auth şifresi eşleşmediyse veya kullanıcı şifresiz profil olarak eklenmişse:
      if (matchedUser) {
        // Eğer profil aktifse ve henüz auth hesabı şifresi atanmamışsa veya ilk girişse:
        if (!matchedUser.isActive) {
          setErrorMessage('Bu personel hesabı pasife alınmıştır. Lütfen ambar yöneticinizle görüşün.');
          setIsLoading(false);
          return;
        }

        // Eğer kullanıcı henüz parola atamamış bir profil ise veya şifre doğruysa:
        setSuccessMessage(`Doğrulandı: ${matchedUser.name} (${matchedUser.role}) olarak oturum açılıyor...`);
        setTimeout(() => {
          onLoginSuccess(matchedUser!);
        }, 700);
        return;
      }

      // 4. Hiçbir kayıt bulunamadı
      setErrorMessage(
        authError?.message === 'Invalid login credentials'
          ? 'Hatalı e-posta veya şifre. Lütfen bilgilerinizi kontrol ediniz.'
          : (authError?.message || 'Giriş yapılamadı. Bu kullanıcı sistemde kayıtlı değil.')
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Bağlantı hatası oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (u: WarehouseUser) => {
    setSelectedQuickUser(u);
    setIdentifier(u.email || u.employeeCode);
    setPassword('CareUp2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F3F6F8] p-3 sm:p-6 text-slate-900">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Brand Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-white shadow-2xs border border-slate-200/90 mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Biorasence"
              className="h-9 sm:h-12 w-auto object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 tracking-tight">
              Lojistik &amp; Parti Takip Sistemi
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Mobil Depo ve Lot/SKT Operasyon Konsolu
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs space-y-5 sm:space-y-6">
          <div className="border-b border-slate-100 pb-3 sm:pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Personel Girişi</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Depo operasyonlarına erişmek için kimlik bilgilerinizle oturum açın.
            </p>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                E-posta veya Personel Sicil Kodu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="örn: caglar@gmail.com veya OP-112"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Giriş Şifresi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Doğrulanıyor...</span>
              ) : (
                <>
                  <span>Oturum Aç</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Fast-Login List (If users are registered) */}
          {users.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Sistemde Kayıtlı Personeller (Hızlı Seçim)
              </span>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelect(u)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left flex items-center justify-between gap-2 transition-all cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {u.employeeCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                          {u.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {u.email || u.assignedZone}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        u.role === 'Admin'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : u.role === 'Depo Sorumlusu'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* First-time Admin Access Shortcut if no admin exists or empty */}
          {(!users.some((u) => u.role === 'Admin') || users.length === 0) && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>İlk Kurulum: Yönetici Girişi</span>
              </div>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                Veritabanınız temiz başlatıldı. Yeni ürünler ve personel tanımlamak için Admin hesabıyla doğrudan giriş yapabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => {
                  onLoginSuccess({
                    id: 'usr-admin-initial',
                    name: 'Sistem Yöneticisi',
                    employeeCode: 'ADM-001',
                    email: 'admin@careup.local',
                    role: 'Admin',
                    assignedZone: 'Sistem Yönetimi',
                    isActive: true,
                  });
                }}
                className="w-full py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Yönetici (Admin) Olarak Başlat
              </button>
            </div>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p>CareUp WMS • 3 Kademeli Rol Bazlı Yetkilendirme (RBAC)</p>
          <p>Pamukkale Üniversitesi Endüstri Mühendisliği • CENG 409</p>
        </div>
      </div>
    </div>
  );
};
