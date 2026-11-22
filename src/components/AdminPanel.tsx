'use client';

import React, { useState } from 'react';
import {
  Settings,
  PackagePlus,
  MapPin,
  Users,
  ShieldAlert,
  Lock,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Save,
  KeyRound,
  Mail,
} from 'lucide-react';
import {
  Product,
  Batch,
  ShelfLocation,
  WarehouseUser,
  SystemRules,
  UserRole,
} from '../data/mockData';

interface AdminPanelProps {
  currentRole: UserRole;
  products: Product[];
  shelves: ShelfLocation[];
  users: WarehouseUser[];
  systemRules: SystemRules;
  onAddProduct: (newProduct: Product) => void;
  onUpdateProductThreshold: (productId: string, newThreshold: number) => void;
  onDeleteProduct: (productId: string) => void;
  onAddShelf: (newShelf: ShelfLocation) => void;
  onToggleShelfStatus: (shelfId: string) => void;
  onDeleteShelf: (shelfId: string) => void;
  onAddUser: (newUser: WarehouseUser, password?: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onToggleUserStatus: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onResetPassword?: (authUserId: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateSystemRules: (newRules: SystemRules) => void;
  onResetSystemData: () => void;
  onBackHome: () => void;
  onRoleChange?: (role: UserRole) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentRole,
  products,
  shelves,
  users,
  systemRules,
  onAddProduct,
  onUpdateProductThreshold,
  onDeleteProduct,
  onAddShelf,
  onToggleShelfStatus,
  onDeleteShelf,
  onAddUser,
  onUpdateUserRole,
  onToggleUserStatus,
  onDeleteUser,
  onResetPassword,
  onUpdateSystemRules,
  onResetSystemData,
  onBackHome,
}) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'SHELVES' | 'USERS_RULES'>('PRODUCTS');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // New Product Form State
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newForm, setNewForm] = useState<Product['form']>('Tablet');
  const [newUnit, setNewUnit] = useState<Product['unit']>('Kutu');
  const [newCategory, setNewCategory] = useState<Product['category']>('Vitamin & Mineral');
  const [newMinStock, setNewMinStock] = useState<number>(30);
  const [newZone, setNewZone] = useState<Product['zone']>('A1');
  const [newStorage, setNewStorage] = useState('Oda Sıcaklığı (<25°C)');
  const [initialLot, setInitialLot] = useState('');
  const [initialExpiry, setInitialExpiry] = useState('');
  const [initialQty, setInitialQty] = useState<number>(0);
  const [initialShelf, setInitialShelf] = useState('');

  // New Shelf Form State
  const [shelfCode, setShelfCode] = useState('');
  const [shelfZone, setShelfZone] = useState<ShelfLocation['zone']>('A1');
  const [shelfLabel, setShelfLabel] = useState('');
  const [shelfTemp, setShelfTemp] = useState('Oda Sıcaklığı (<25°C)');

  // New User Form State with Authentication Credentials
  const [userName, setUserName] = useState('');
  const [userCode, setUserCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Depo Çalışanı');
  const [userZone, setUserZone] = useState('A1 & B2 Koridorları');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<WarehouseUser | null>(null);
  const [resetPasswordText, setResetPasswordText] = useState('');

  const showNotice = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // RBAC Protection: If currentRole !== 'Admin', render clean Unauthorized Screen only
  if (currentRole !== 'Admin') {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white border-2 border-rose-200 rounded-2xl shadow-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-mono">
            <Lock className="w-3.5 h-3.5" />
            Yetkisiz Erişim • Yalnızca Admin
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Sistem Yönetim Paneline Erişim Yetkiniz Yok
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Ürün kataloğu tanımlama, yeni raf adresi açma, personel yetki ataması ve sistem kurallarını değiştirme işlemleri yalnızca{' '}
            <strong className="text-slate-900">Admin (Sistem Yöneticisi)</strong> rolüne tanımlanmıştır. Aktif rolünüz:{' '}
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

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newBarcode.trim() || !newName.trim()) {
      showNotice('Lütfen SKU, Barkod ve Ürün Adı alanlarını doldurunuz.');
      return;
    }

    const createdBatches: Batch[] = [];
    if (initialLot.trim() && initialExpiry && initialQty > 0) {
      const selectedShelf = initialShelf.trim() || (shelves[0]?.code || 'RAF-A1-01');
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
      sku: newSku.trim().toUpperCase(),
      barcode: newBarcode.trim(),
      name: newName.trim(),
      subtitle: newSubtitle.trim() || `${newForm} Takviye Edici Gıda`,
      form: newForm,
      unit: newUnit,
      unitsPerCarton: 24,
      category: newCategory,
      minCriticalStock: Number(newMinStock) || 30,
      zone: newZone,
      storageCondition: newStorage,
      batches: createdBatches,
    };

    onAddProduct(created);
    showNotice(`"${created.name}" (${created.sku}) veritabanına ve ürün kataloğuna eklendi.`);
    setNewSku('');
    setNewBarcode('');
    setNewName('');
    setNewSubtitle('');
    setInitialLot('');
    setInitialExpiry('');
    setInitialQty(0);
  };

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelfCode.trim() || !shelfLabel.trim()) {
      showNotice('Lütfen Raf Kodu ve Tanımlayıcı Açıklama alanlarını doldurunuz.');
      return;
    }

    const created: ShelfLocation = {
      id: `sh-${Date.now()}`,
      code: shelfCode.trim().toUpperCase(),
      zone: shelfZone,
      label: shelfLabel.trim(),
      temperatureRule: shelfTemp.trim() || 'Oda Sıcaklığı (<25°C)',
      isActive: true,
    };

    onAddShelf(created);
    showNotice(`"${created.code}" raf konumu veritabanına kaydedildi.`);
    setShelfCode('');
    setShelfLabel('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userCode.trim()) return;

    setIsSubmittingUser(true);
    const emailToUse = userEmail.trim() || `${userCode.trim().toLowerCase()}@careup.local`;
    const passwordToUse = userPassword.trim() || 'CareUp2026!';

    const created: WarehouseUser = {
      id: `usr-${Date.now()}`,
      name: userName.trim(),
      employeeCode: userCode.trim().toUpperCase(),
      email: emailToUse,
      role: userRole,
      assignedZone: userZone.trim() || 'Tüm Ambarlar',
      isActive: true,
    };

    try {
      await onAddUser(created, passwordToUse);
      showNotice(`"${created.name}" (${created.role}) için log-in hesabı (${emailToUse}) başarıyla oluşturuldu.`);
      setUserName('');
      setUserCode(`OP-${Math.floor(110 + Math.random() * 890)}`);
      setUserEmail('');
      setUserPassword('');
    } catch (err: any) {
      showNotice(`Hata: ${err?.message || 'Kullanıcı oluşturulamadı'}`);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleExecutePasswordReset = async () => {
    if (!selectedUserForPasswordReset || !resetPasswordText.trim()) return;
    if (onResetPassword && selectedUserForPasswordReset.authUserId) {
      const res = await onResetPassword(selectedUserForPasswordReset.authUserId, resetPasswordText.trim());
      if (res.success) {
        showNotice(`${selectedUserForPasswordReset.name} kullanıcısının giriş şifresi güncellendi.`);
      } else {
        showNotice(`Şifre güncellenemedi: ${res.error}`);
      }
    } else {
      showNotice(`${selectedUserForPasswordReset.name} kullanıcısının şifresi yerel olarak güncellendi.`);
    }
    setSelectedUserForPasswordReset(null);
    setResetPasswordText('');
  };

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
                Sistem &amp; Ana Veri Yönetim Paneli
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-slate-900 text-white shrink-0">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Ürün tanımları, kritik eşikler, raf adresleri, personel rolleri ve kurallar.
            </p>
          </div>
        </div>

        {/* Sub-Navigation Tabs - Horizontally scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'PRODUCTS'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Ürün Kataloğu ({products.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SHELVES')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'SHELVES'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Raf &amp; Konumlar ({shelves.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('USERS_RULES')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'USERS_RULES'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personel &amp; Kurallar</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* TAB 1: PRODUCTS MANAGEMENT */}
      {activeTab === 'PRODUCTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 cols: Create New Product Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Yeni Ürün Kartı Tanımla</h3>
                <p className="text-xs text-slate-500">
                  Kataloğa ve barkod okuyucuya yeni ürün ekleyin
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ürün Kodu (SKU) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    EAN-13 Barkod *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Care Up Çinko Pikolinat 15 mg"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Formül &amp; Ambalaj Özeti
                </label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Örn: Bağışıklık Desteği • 60 Tablet"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Form</label>
                  <select
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Birim</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as Product['unit'])}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                  >
                    <option value="Kutu">Kutu</option>
                    <option value="Şişe">Şişe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kritik Eşik
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ambar Bölgesi
                  </label>
                  <select
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

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <span className="block text-xs font-bold text-slate-700">
                  Açılış Partisi (Başlangıç Stoku)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      İlk Parti (Lot) No
                    </label>
                    <input
                      type="text"
                      value={initialLot}
                      onChange={(e) => setInitialLot(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      SKT Tarihi
                    </label>
                    <input
                      type="date"
                      value={initialExpiry}
                      onChange={(e) => setInitialExpiry(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Başlangıç Rafı
                    </label>
                    <select
                      value={initialShelf}
                      onChange={(e) => setInitialShelf(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                    >
                      {shelves.map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Açılış Miktarı
                    </label>
                    <input
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
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Ürün Kartını Kaydet</span>
              </button>
            </form>
          </div>

          {/* Right 7 cols: Existing Product Master List & Critical Threshold Editor */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kayıtlı Ürün Kartları &amp; Kritik Stok Eşikleri
                </h3>
                <p className="text-xs text-slate-500">
                  Ürünlerin kritik uyarı sınırlarını güncelleyebilir veya katalogdan kaldırabilirsiniz
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                {products.length} Ürün
              </span>
            </div>

            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 p-6">
                  Veritabanında henüz kayıtlı ürün kartı bulunmuyor. Soldaki formu kullanarak ilk ürün kartınızı oluşturabilirsiniz.
                </div>
              ) : (
                products.map((prod) => {
                  const totalStock = prod.batches.reduce((sum, b) => sum + b.quantity, 0);
                  return (
                    <div
                      key={prod.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {prod.sku}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            Barkod: {prod.barcode}
                          </span>
                          <span className="text-xs text-slate-500">• {prod.category}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{prod.name}</h4>
                        <p className="text-xs text-slate-500">
                          Mevcut Toplam Stok:{' '}
                          <strong className="font-mono text-slate-800">
                            {totalStock} {prod.unit}
                          </strong>{' '}
                          ({prod.batches.length} Parti)
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                            Kritik Stok Sınırı
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={prod.minCriticalStock}
                              onChange={(e) =>
                                onUpdateProductThreshold(prod.id, Number(e.target.value))
                              }
                              className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900"
                            />
                            <span className="text-xs text-slate-500">{prod.unit}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProduct(prod.id);
                            showNotice(`${prod.sku} ürün kartı veritabanından silindi.`);
                          }}
                          title="Ürün Kartını Sil"
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer mt-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHELVES & LOCATIONS MANAGEMENT */}
      {activeTab === 'SHELVES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 cols: Add New Shelf */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Yeni Raf / Konum Tanımla</h3>
                <p className="text-xs text-slate-500">
                  Mal kabul ve transfer ekranlarında seçilebilir raf adresi ekleyin
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateShelf} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Raf Adres Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    value={shelfCode}
                    onChange={(e) => setShelfCode(e.target.value)}
                    placeholder="Örn: RAF-A1-05-01"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ambar Bölgesi *
                  </label>
                  <select
                    value={shelfZone}
                    onChange={(e) => setShelfZone(e.target.value as ShelfLocation['zone'])}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                  >
                    <option value="A1">A1 - Ana Ambar</option>
                    <option value="B2">B2 - Serin Raf Alanı</option>
                    <option value="C1">C1 - Pastil &amp; Bitkisel</option>
                    <option value="KARANTINA">KARANTINA - İzolasyon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Raf Görev / Bölüm Açıklaması *
                </label>
                <input
                  type="text"
                  required
                  value={shelfLabel}
                  onChange={(e) => setShelfLabel(e.target.value)}
                  placeholder="Örn: Vitamin & Mineral Yedek Rafı"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  İklimlendirme &amp; Saklama Koşulu
                </label>
                <input
                  type="text"
                  value={shelfTemp}
                  onChange={(e) => setShelfTemp(e.target.value)}
                  placeholder="Örn: Oda Sıcaklığı (<25°C)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Raf Konumunu Sisteme Ekle</span>
              </button>
            </form>
          </div>

          {/* Right 7 cols: Active Shelves List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tanımlı Ambar ve Raf Konumları
                </h3>
                <p className="text-xs text-slate-500">
                  Aktif raflar stok girişi ve raf transferi formlarında listelenir
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                {shelves.length} Konum
              </span>
            </div>

            <div className="space-y-2.5">
              {shelves.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 p-6">
                  Veritabanında henüz tanımlı raf konumu bulunmuyor. Soldaki formu kullanarak ilk raf adresinizi ekleyebilirsiniz.
                </div>
              ) : (
                shelves.map((sh) => (
                  <div
                    key={sh.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                          {sh.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          Bölge: {sh.zone}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            sh.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {sh.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{sh.label}</p>
                      <p className="text-[11px] text-slate-500">Koşul: {sh.temperatureRule}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleShelfStatus(sh.id)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        {sh.isActive ? 'Pasife Al' : 'Aktifleştir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteShelf(sh.id);
                          showNotice(`${sh.code} raf konumu veritabanından silindi.`);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & BUSINESS RULES MANAGEMENT */}
      {activeTab === 'USERS_RULES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 cols: Operational Rules & System Maintenance */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ambar İş Kuralları &amp; Parametreler
                  </h3>
                  <p className="text-xs text-slate-500">
                    Operasyon formlarında uygulanan canlı denetim limitleri
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Minimum SKT Sevkiyat Engeli Süresi (Gün)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Son kullanma tarihine bu günden az kalan partilerin satış çıkışı engellenir ve karantinaya yönlendirilir.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={systemRules.minExpiryDaysForExit}
                      onChange={(e) =>
                        onUpdateSystemRules({
                          ...systemRules,
                          minExpiryDaysForExit: Number(e.target.value),
                        })
                      }
                      className="w-24 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900"
                    />
                    <span className="text-xs font-medium text-slate-600">Gün</span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemRules.enforceFefoPriority}
                    onChange={(e) =>
                      onUpdateSystemRules({
                        ...systemRules,
                        enforceFefoPriority: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300 text-teal-700"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-800">
                      FEFO (İlkBiten İlk Çıkar) Otomatik Seçimi
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ürün seçildiğinde SKT&apos;si en yakın partiyi otomatik önceliklendirir.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemRules.requireCountNote}
                    onChange={(e) =>
                      onUpdateSystemRules({
                        ...systemRules,
                        requireCountNote: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300 text-teal-700"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-800">
                      Sayım Farkı Düzeltmede Zorunlu Gerekçe Notu
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Fiziksel sayım eşitlemelerinde fark açıklaması girilmesini zorunlu tutar.
                    </span>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    showNotice('Ambar iş kuralları ve SKT parametreleri güncellendi.')
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Parametreleri Kaydet</span>
                </button>
              </div>
            </div>

            {/* System Data Reset Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Veritabanı Senkronizasyonu &amp; Canlı Yenileme
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Yerel tarayıcı önbelleğini temizler ve tüm ürün, raf, kullanıcı ve hareket verilerini doğrudan Supabase veritabanından en güncel haliyle yeniden çeker.
              </p>
              <button
                type="button"
                onClick={() => {
                  onResetSystemData();
                  showNotice('Tüm veriler Supabase veritabanından başarıyla yenilendi.');
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Veritabanından Yeniden Yükle</span>
              </button>
            </div>
          </div>

          {/* Right 7 cols: Warehouse Personnel & RBAC Roles */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Depo Personeli &amp; Rol Yetki Atamaları
                </h3>
                <p className="text-xs text-slate-500">
                  Kullanıcıların sistemdeki erişim seviyelerini (Çalışan, Sorumlu, Admin) yönetin
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                {users.length} Personel
              </span>
            </div>

            {/* Add New Personnel & Log-in Credentials Form */}
            <form
              onSubmit={handleCreateUser}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <KeyRound className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-800">
                  Yeni Personel &amp; Giriş (Log-in) Hesabı Tanımla
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Örn: Burak Aydın"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sicil Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    placeholder="Örn: OP-115"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Yetki Rolü *
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-600"
                  >
                    <option value="Depo Çalışanı">Depo Çalışanı (Operasyon / Giriş-Çıkış)</option>
                    <option value="Depo Sorumlusu">Depo Sorumlusu (Sayım &amp; Ters Kayıt Onayı)</option>
                    <option value="Admin">Admin (Sistem &amp; Yetki Yöneticisi)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Giriş E-postası (Email) *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="personel@careup.local"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Giriş Şifresi *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Güvenli şifre belirleyin"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Görev / Ambar Bölgesi
                  </label>
                  <input
                    type="text"
                    value={userZone}
                    onChange={(e) => setUserZone(e.target.value)}
                    placeholder="Örn: A1 &amp; B2 Koridorları"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="py-2 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmittingUser ? 'Hesap Oluşturuluyor...' : 'Giriş Hesabını Oluştur & Kaydet'}</span>
                </button>
              </div>
            </form>

            {/* Password Reset Modal if Triggered */}
            {selectedUserForPasswordReset && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>Şifre Sıfırlama: {selectedUserForPasswordReset.name} ({selectedUserForPasswordReset.employeeCode})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserForPasswordReset(null);
                      setResetPasswordText('');
                    }}
                    className="text-xs text-amber-800 hover:underline cursor-pointer"
                  >
                    Vazgeç
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resetPasswordText}
                    onChange={(e) => setResetPasswordText(e.target.value)}
                    placeholder="Yeni şifreyi giriniz (Örn: YeniSifre2026!)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-mono text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleExecutePasswordReset}
                    className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Şifreyi Güncelle
                  </button>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="space-y-2.5">
              {users.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  Henüz kayıtlı depo personeli bulunmuyor. Yukarıdaki formdan ilk hesabı tanımlayabilirsiniz.
                </div>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {u.employeeCode}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{u.name}</h4>
                        {u.email && (
                          <span className="text-xs text-slate-500 font-mono">
                            • {u.email}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {u.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Görev Alanı: {u.assignedZone}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={u.role}
                        onChange={(e) => {
                          onUpdateUserRole(u.id, e.target.value as UserRole);
                          showNotice(`${u.name} kullanıcısının rolü "${e.target.value}" olarak güncellendi.`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                      >
                        <option value="Depo Çalışanı">Depo Çalışanı</option>
                        <option value="Depo Sorumlusu">Depo Sorumlusu</option>
                        <option value="Admin">Admin</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setSelectedUserForPasswordReset(u)}
                        title="Şifre Sıfırla"
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-amber-700 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleUserStatus(u.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        {u.isActive ? 'Pasife Al' : 'Aktifleştir'}
                      </button>

                      {onDeleteUser && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteUser(u.id);
                            showNotice(`${u.name} personeli ve hesabı sistemden silindi.`);
                          }}
                          title="Personeli Sil"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
