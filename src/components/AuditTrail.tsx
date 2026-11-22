'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Lock,
  AlertTriangle,
  CheckCircle2,
  X,
  User,
} from 'lucide-react';
import { Transaction, UserRole } from '../data/mockData';

interface AuditTrailProps {
  transactions: Transaction[];
  currentRole: UserRole;
  onRollbackTransaction: (transactionId: string, customNote?: string) => void;
  onBackHome?: () => void;
  onRoleChange?: (role: UserRole) => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  transactions,
  currentRole,
  onRollbackTransaction,
  onBackHome,
  onRoleChange,
}) => {
  // State for unauthorized attempt (Depo Çalışanı)
  const [unauthorizedAttemptTrx, setUnauthorizedAttemptTrx] = useState<Transaction | null>(null);

  // State for confirmation modal (Depo Sorumlusu & Admin)
  const [confirmingTrx, setConfirmingTrx] = useState<Transaction | null>(null);
  const [confirmConfirmed, setConfirmConfirmed] = useState<boolean>(false);
  const [rollbackNote, setRollbackNote] = useState<string>('');

  // Notification banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const isAuthorizedForRollback =
    currentRole === 'Depo Sorumlusu' || currentRole === 'Admin';

  // Auto-clear unauthorized screen if role switches to an authorized role
  useEffect(() => {
    if (isAuthorizedForRollback) {
      setUnauthorizedAttemptTrx(null);
    }
  }, [isAuthorizedForRollback]);

  const handleRollbackClick = (trx: Transaction) => {
    if (currentRole === 'Depo Çalışanı') {
      // Depo Çalışanı: Show ONLY the unauthorized screen (hide all other parts)
      setUnauthorizedAttemptTrx(trx);
    } else {
      // Depo Sorumlusu or Admin: Open confirmation dialog
      setConfirmingTrx(trx);
      setConfirmConfirmed(false);
      setRollbackNote(`${trx.id} nolu işlem hata/iptal nedeniyle ters kayıt ile geri alındı.`);
    }
  };

  const handleExecuteConfirmedRollback = () => {
    if (!confirmingTrx) return;
    const trxId = confirmingTrx.id;
    onRollbackTransaction(trxId, rollbackNote);
    setSuccessBanner(
      `${trxId} numaralı stok hareketi onayınız doğrultusunda ters kayıt (reversal) ile geri alındı.`
    );
    setConfirmingTrx(null);

    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  // 1. DEPO ÇALIŞANI İÇİN TAM EKRAN YETKİSİZ EKRANI (DİĞER KISIMLAR EKRANDA YAZMAZ)
  if (unauthorizedAttemptTrx && currentRole === 'Depo Çalışanı') {
    return (
      <div className="w-full max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white border-2 border-rose-200 rounded-2xl shadow-sm space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-mono">
            <Lock className="w-3.5 h-3.5" />
            Yetkisiz İşlem Engellendi
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Yetkisiz İşlem: Geri Alma (Ters Kayıt) Yetkiniz Yok
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Stok hareketlerini ters kayıt ile geri alma işlemi yalnızca{' '}
            <strong className="text-slate-900 font-semibold">Depo Sorumlusu</strong> veya{' '}
            <strong className="text-slate-900 font-semibold">Admin</strong> yetkisiyle yapılabilir.{' '}
            <span className="text-rose-700 font-semibold">Depo Çalışanı</span> rolünün geçmiş stok hareketlerini iptal etme yetkisi bulunmamaktadır.
          </p>
        </div>

        {/* Blocked Transaction Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
            <span className="text-slate-500">Geri Alınmak İstenen İşlem No:</span>
            <span className="font-mono font-bold text-rose-700">{unauthorizedAttemptTrx.id}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">İlgili Ürün:</span>
            <span className="text-slate-900 font-semibold">
              {unauthorizedAttemptTrx.productName}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Parti (Lot) &amp; Miktar:</span>
            <span className="font-mono font-semibold text-teal-800">
              {unauthorizedAttemptTrx.lotNumber} • {unauthorizedAttemptTrx.amount}{' '}
              {unauthorizedAttemptTrx.unit}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
            <span className="text-slate-500">Aktif Kullanıcı Rolü:</span>
            <span className="text-rose-700 font-semibold flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {currentRole}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setUnauthorizedAttemptTrx(null)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Hareket Geçmişine Dön</span>
          </button>

          {onRoleChange && (
            <button
              type="button"
              onClick={() => {
                onRoleChange('Depo Sorumlusu');
                setUnauthorizedAttemptTrx(null);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Depo Sorumlusu Rolüne Geç</span>
            </button>
          )}

          {onBackHome && (
            <button
              type="button"
              onClick={onBackHome}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-medium transition-all cursor-pointer"
            >
              Ana Ekrana Dön
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. NORMAL HAREKET GEÇMİŞİ GÖRÜNÜMÜ
  return (
    <div className="space-y-5">
      {onBackHome && (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-teal-700" />
              <span>Ana Ekrana Dön</span>
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Stok Hareket Geçmişi &amp; Geri Alma (Ters Kayıt)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kaydedilen tüm mal kabul, sevkiyat ve raf transferlerini inceleyin; yetkili onay ile ters kayıt uygulayın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthorizedForRollback ? (
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Onaylı Geri Alma Yetkisi Aktif ({currentRole})
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Salt Görüntüleme ({currentRole})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-800 text-xs sm:text-sm font-medium shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-bold text-slate-900">
              Kayıtlı Stok Hareketleri ({transactions.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Aktif Rol: <strong className="text-slate-900">{currentRole}</strong>
          </span>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Henüz kaydedilmiş bir stok hareketi bulunmuyor.
            </div>
          ) : (
            transactions.map((trx) => {
              const isReversal = trx.type === 'TERS_KAYIT';
              const isEntry = trx.type === 'STOK_GİRİŞİ';
              const isExit = trx.type === 'STOK_ÇIKIŞI';
              const isTransfer = trx.type === 'TRANSFER';

              return (
                <div
                  key={trx.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    trx.isReversed
                      ? 'bg-slate-50/70 border-slate-200 opacity-60'
                      : isReversal
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {trx.id}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{trx.timestamp}</span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          isEntry
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isExit
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isTransfer
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {trx.type.replace('_', ' ')}
                      </span>
                      {trx.isReversed && (
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                          Geri Alındı (Ters Kayıt)
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {trx.productName}{' '}
                      <span className="text-xs font-mono text-slate-500 font-normal">
                        ({trx.productSku})
                      </span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>
                        Parti: <strong className="font-mono text-slate-900">{trx.lotNumber}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Konum: <strong className="font-mono text-slate-800">{trx.sourceShelf}</strong>{' '}
                        &rarr; <strong className="font-mono text-slate-800">{trx.targetShelf}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        İşlemi Yapan: <strong className="text-teal-800">{trx.userRole}</strong>
                      </span>
                    </div>

                    {trx.note && (
                      <p className="text-xs text-slate-500 italic">Not: &ldquo;{trx.note}&rdquo;</p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span
                      className={`font-mono font-bold text-base ${
                        isEntry
                          ? 'text-blue-700'
                          : isExit
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {isEntry ? '+' : isExit ? '-' : ''}
                      {trx.amount} {trx.unit}
                    </span>

                    {!trx.isReversed && !isReversal && (
                      <button
                        type="button"
                        onClick={() => handleRollbackClick(trx)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          isAuthorizedForRollback
                            ? 'text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300'
                            : 'text-slate-700 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
                        }`}
                      >
                        {isAuthorizedForRollback ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>Ters Kayıt (Geri Al)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. DEPO SORUMLUSU & ADMİN İÇİN DOĞRULAMA / ONAY SİSTEMİ (MODAL) */}
      {confirmingTrx && isAuthorizedForRollback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Geri Alma İşlemini Onaylıyor musunuz?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentRole} Doğrulama ve Ters Kayıt Onayı
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingTrx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction Details & Impact Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu işlem onaylandığında seçilen stok hareketi tersine çevrilecek, ilgili partinin stok bakiyesi güncellenecek ve hareket geçmişine{' '}
                <strong className="text-amber-800 font-mono">TERS_KAYIT</strong> eklenecektir.
              </p>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Hedef İşlem No:</span>
                  <span className="font-mono font-bold text-slate-900">{confirmingTrx.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ürün:</span>
                  <span className="text-slate-900 font-semibold">{confirmingTrx.productName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Parti (Lot) &amp; Konum:</span>
                  <span className="font-mono text-slate-700">
                    {confirmingTrx.lotNumber} ({confirmingTrx.targetShelf})
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500">Geri Alınacak Miktar:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {confirmingTrx.amount} {confirmingTrx.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-teal-800 pt-0.5">
                  <span>Bakiye Etkisi:</span>
                  <span>
                    {confirmingTrx.type === 'STOK_GİRİŞİ'
                      ? `Stoktan ${confirmingTrx.amount} ${confirmingTrx.unit} düşülecektir`
                      : confirmingTrx.type === 'STOK_ÇIKIŞI'
                      ? `Stoka ${confirmingTrx.amount} ${confirmingTrx.unit} iade edilecektir`
                      : 'Raf konumu eski haline getirilecektir'}
                  </span>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Geri Alma Gerekçesi (Denetim İzi Notu):
                </label>
                <input
                  type="text"
                  value={rollbackNote}
                  onChange={(e) => setRollbackNote(e.target.value)}
                  placeholder="Geri alma gerekçesi giriniz..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmConfirmed}
                  onChange={(e) => setConfirmConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-700"
                />
                <span className="text-xs text-slate-700">
                  Stok bakiyesi etkisini ve parti bilgilerini kontrol ettim, geri alma işlemini{' '}
                  <strong className="text-slate-900">onaylıyorum</strong>.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmingTrx(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!confirmConfirmed}
                onClick={handleExecuteConfirmedRollback}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Evet, İşlemi Onayla ve Geri Al</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
