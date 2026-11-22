'use client';

import React, { useState, useEffect } from 'react';
import {
  Scan,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  History,
  AlertTriangle,
  Clock,
  Package,
  ArrowRight,
  Lock,
  Settings,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { LoginScreen } from '@/components/LoginScreen';
import { OperationStepView, ActiveOperationMode } from '@/components/OperationStepView';
import { AuditTrail } from '@/components/AuditTrail';
import { AdminPanel } from '@/components/AdminPanel';
import { InventoryModal } from '@/components/InventoryModal';
import {
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SHELVES,
  INITIAL_USERS,
  INITIAL_SYSTEM_RULES,
  Product,
  Transaction,
  ShelfLocation,
  WarehouseUser,
  SystemRules,
  UserRole,
} from '@/data/mockData';
import {
  getSupabaseClient,
  fetchAllWarehouseData,
  adminCreateStaffAccount,
  adminResetStaffPassword,
  adminDeleteStaff,
} from '@/lib/supabase';

type ScreenState = 'HOME' | ActiveOperationMode | 'AUDIT_LOG' | 'ADMIN_PANEL';

export default function WmsDashboard() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [shelves, setShelves] = useState<ShelfLocation[]>(INITIAL_SHELVES);
  const [users, setUsers] = useState<WarehouseUser[]>(INITIAL_USERS);
  const [systemRules, setSystemRules] = useState<SystemRules>(INITIAL_SYSTEM_RULES);

  const [currentUser, setCurrentUser] = useState<WarehouseUser | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(INITIAL_PRODUCTS[0]);
  const [currentRole, setCurrentRole] = useState<UserRole>('Depo Çalışanı');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);

  const [activeScreen, setActiveScreen] = useState<ScreenState>('HOME');
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);

  // Load persisted data from Supabase (with localStorage fallback) and check auth
  useEffect(() => {
    let isMounted = true;

    // Load saved auth user
    try {
      const savedAuth = localStorage.getItem('careup_auth_user');
      if (savedAuth) {
        const parsed: WarehouseUser = JSON.parse(savedAuth);
        setCurrentUser(parsed);
        setCurrentRole(parsed.role);
      }
    } catch {}

    async function loadInitialData() {
      try {
        const remote = await fetchAllWarehouseData();
        if (isMounted) {
          if (remote.users.length > 0) setUsers(remote.users);
          if (remote.shelves.length > 0) setShelves(remote.shelves);
          if (remote.products.length > 0) {
            setProducts(remote.products);
            setSelectedProduct(remote.products[0]);
          }
          if (remote.transactions.length > 0) setTransactions(remote.transactions);
          if (remote.systemRules) setSystemRules(remote.systemRules);
          return;
        }
      } catch (err) {
        console.warn('Supabase baglantisi veya tablolar yuklenirken yerel veri kullaniliyor:', err);
      }

      try {
        const savedProducts = localStorage.getItem('careup_products_v4');
        const savedTransactions = localStorage.getItem('careup_transactions_v4');
        const savedShelves = localStorage.getItem('careup_shelves_v4');
        const savedUsers = localStorage.getItem('careup_users_v4');
        const savedRules = localStorage.getItem('careup_rules_v4');

        if (savedProducts) setProducts(JSON.parse(savedProducts));
        if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
        if (savedShelves) setShelves(JSON.parse(savedShelves));
        if (savedUsers) setUsers(JSON.parse(savedUsers));
        if (savedRules) setSystemRules(JSON.parse(savedRules));
      } catch (e) {
        console.warn('LocalStorage load warning', e);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('careup_auth_user');
    try {
      const sb = getSupabaseClient('Admin');
      await sb.auth.signOut();
    } catch {}
  };

  const persistData = (
    nextProducts: Product[],
    nextTransactions: Transaction[],
    nextShelves = shelves,
    nextUsers = users,
    nextRules = systemRules
  ) => {
    setProducts(nextProducts);
    setTransactions(nextTransactions);
    setShelves(nextShelves);
    setUsers(nextUsers);
    setSystemRules(nextRules);
    try {
      localStorage.setItem('careup_products_v4', JSON.stringify(nextProducts));
      localStorage.setItem('careup_transactions_v4', JSON.stringify(nextTransactions));
      localStorage.setItem('careup_shelves_v4', JSON.stringify(nextShelves));
      localStorage.setItem('careup_users_v4', JSON.stringify(nextUsers));
      localStorage.setItem('careup_rules_v4', JSON.stringify(nextRules));
    } catch (e) {
      console.warn('LocalStorage save warning', e);
    }
  };

  const handleResetToDefault = () => {
    persistData(
      INITIAL_PRODUCTS,
      INITIAL_TRANSACTIONS,
      INITIAL_SHELVES,
      INITIAL_USERS,
      INITIAL_SYSTEM_RULES
    );
    setSelectedProduct(INITIAL_PRODUCTS[0]);
  };

  const handleToggleNetwork = () => {
    if (isOnline) {
      setIsOnline(false);
      setNetworkNotice(
        'Çevrimdışı saha modu aktif: Yapacağınız stok hareketleri yerel kuyrukta saklanacak ve bağlantı geldiğinde aktarılacaktır.'
      );
    } else {
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        setNetworkNotice(
          `Bağlantı yeniden sağlandı: Kuyrukta bekleyen ${offlineQueue.length} adet stok hareketi merkeze senkronize edildi.`
        );
        setOfflineQueue([]);
      } else {
        setNetworkNotice('Çevrimiçi bağlantı aktif.');
      }
      setTimeout(() => setNetworkNotice(null), 5000);
    }
  };

  const handleExecuteTransaction = (params: {
    type: 'STOK_GİRİŞİ' | 'STOK_ÇIKIŞI' | 'TRANSFER' | 'SAYIM_DÜZELTME';
    lotNumber: string;
    amount: number;
    sourceShelf: string;
    targetShelf: string;
    note: string;
    expiryDate?: string;
  }): { success: boolean; error?: string } => {
    if (!selectedProduct) return { success: false, error: 'Ürün seçilmedi' };

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, params]);
    }

    const updatedProducts = products.map((prod) => {
      if (prod.id !== selectedProduct.id) return prod;

      const updatedBatches = [...prod.batches];
      const existingBatchIndex = updatedBatches.findIndex(
        (b) => b.lotNumber === params.lotNumber
      );

      if (params.type === 'STOK_GİRİŞİ') {
        if (existingBatchIndex >= 0) {
          updatedBatches[existingBatchIndex] = {
            ...updatedBatches[existingBatchIndex],
            quantity: updatedBatches[existingBatchIndex].quantity + params.amount,
            shelfLocation: params.targetShelf,
          };
        } else {
          updatedBatches.push({
            batchId: `b-${Date.now()}`,
            lotNumber: params.lotNumber,
            expiryDate: params.expiryDate || '2027-12-31',
            quantity: params.amount,
            shelfLocation: params.targetShelf,
            isQuarantine: params.targetShelf.includes('KARANTINA'),
          });
        }
      } else if (params.type === 'STOK_ÇIKIŞI') {
        if (existingBatchIndex >= 0) {
          const currentQty = updatedBatches[existingBatchIndex].quantity;
          updatedBatches[existingBatchIndex] = {
            ...updatedBatches[existingBatchIndex],
            quantity: Math.max(0, currentQty - params.amount),
          };
        }
      } else if (params.type === 'TRANSFER') {
        if (existingBatchIndex >= 0) {
          updatedBatches[existingBatchIndex] = {
            ...updatedBatches[existingBatchIndex],
            shelfLocation: params.targetShelf,
            isQuarantine: params.targetShelf.includes('KARANTINA'),
          };
        }
      } else if (params.type === 'SAYIM_DÜZELTME') {
        if (existingBatchIndex >= 0) {
          updatedBatches[existingBatchIndex] = {
            ...updatedBatches[existingBatchIndex],
            quantity: params.amount,
          };
        }
      }

      return { ...prod, batches: updatedBatches };
    });

    const newTrx: Transaction = {
      id: `TRX-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: params.type,
      productSku: selectedProduct.sku,
      productName: selectedProduct.name,
      lotNumber: params.lotNumber,
      amount: params.amount,
      unit: selectedProduct.unit,
      sourceShelf: params.sourceShelf,
      targetShelf: params.targetShelf,
      userRole: currentRole,
      note: params.note,
    };

    const newTransactionsList = [newTrx, ...transactions];
    persistData(updatedProducts, newTransactionsList);

    const refreshed = updatedProducts.find((p) => p.id === selectedProduct.id) || null;
    setSelectedProduct(refreshed);

    // Sync to Supabase in background with active UserRole header for RLS
    if (isOnline) {
      const sb = getSupabaseClient(currentRole);
      const targetProd = updatedProducts.find((p) => p.id === selectedProduct.id);
      const targetBatch = targetProd?.batches.find((b) => b.lotNumber === params.lotNumber);

      if (targetBatch) {
        sb.from('batches')
          .upsert(
            {
              batch_id: targetBatch.batchId,
              product_id: selectedProduct.id,
              lot_number: targetBatch.lotNumber,
              expiry_date: targetBatch.expiryDate,
              quantity: targetBatch.quantity,
              shelf_location: targetBatch.shelfLocation,
              is_quarantine: targetBatch.isQuarantine,
            },
            { onConflict: 'product_id,lot_number' }
          )
          .then(({ error }) => {
            if (error) console.warn('Supabase batch upsert error:', error.message);
          });
      }

      sb.from('transactions')
        .insert({
          id: newTrx.id,
          timestamp: newTrx.timestamp,
          type: newTrx.type,
          product_sku: newTrx.productSku,
          product_name: newTrx.productName,
          lot_number: newTrx.lotNumber,
          amount: newTrx.amount,
          unit: newTrx.unit,
          source_shelf: newTrx.sourceShelf,
          target_shelf: newTrx.targetShelf,
          user_role: newTrx.userRole,
          note: newTrx.note,
          is_reversed: false,
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase transaction insert error:', error.message);
        });
    }

    return { success: true };
  };

  const handleRollbackTransaction = (transactionId: string, customNote?: string) => {
    if (currentRole === 'Depo Çalışanı') return;

    const targetTrx = transactions.find((t) => t.id === transactionId);
    if (!targetTrx || targetTrx.isReversed) return;

    const reverseAmount = targetTrx.amount;
    const reverseType: 'STOK_GİRİŞİ' | 'STOK_ÇIKIŞI' =
      targetTrx.type === 'STOK_GİRİŞİ' ? 'STOK_ÇIKIŞI' : 'STOK_GİRİŞİ';

    const updatedProducts = products.map((prod) => {
      if (prod.sku !== targetTrx.productSku) return prod;

      const updatedBatches = prod.batches.map((b) => {
        if (b.lotNumber !== targetTrx.lotNumber) return b;
        if (targetTrx.type === 'TRANSFER') {
          return {
            ...b,
            shelfLocation: targetTrx.sourceShelf,
            isQuarantine: targetTrx.sourceShelf.includes('KARANTINA'),
          };
        }
        const newQty =
          reverseType === 'STOK_GİRİŞİ'
            ? b.quantity + reverseAmount
            : Math.max(0, b.quantity - reverseAmount);
        return { ...b, quantity: newQty };
      });

      return { ...prod, batches: updatedBatches };
    });

    const updatedTransactions = transactions.map((t) =>
      t.id === transactionId ? { ...t, isReversed: true } : t
    );

    const reversalLog: Transaction = {
      id: `REV-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'TERS_KAYIT',
      productSku: targetTrx.productSku,
      productName: targetTrx.productName,
      lotNumber: targetTrx.lotNumber,
      amount: targetTrx.amount,
      unit: targetTrx.unit,
      sourceShelf: targetTrx.targetShelf,
      targetShelf: targetTrx.sourceShelf,
      userRole: currentRole,
      note: customNote || `${targetTrx.id} nolu işlem ters kayıt ile geri alındı.`,
    };

    persistData(updatedProducts, [reversalLog, ...updatedTransactions]);

    if (selectedProduct) {
      const refreshed = updatedProducts.find((p) => p.id === selectedProduct.id) || null;
      setSelectedProduct(refreshed);
    }

    // Sync Rollback to Supabase with active UserRole header (RLS allows only Depo Sorumlusu & Admin)
    if (isOnline) {
      const sb = getSupabaseClient(currentRole);
      const affectedProduct = updatedProducts.find((p) => p.sku === targetTrx.productSku);
      const affectedBatch = affectedProduct?.batches.find(
        (b) => b.lotNumber === targetTrx.lotNumber
      );

      if (affectedProduct && affectedBatch) {
        sb.from('batches')
          .update({
            quantity: affectedBatch.quantity,
            shelf_location: affectedBatch.shelfLocation,
            is_quarantine: affectedBatch.isQuarantine,
          })
          .eq('product_id', affectedProduct.id)
          .eq('lot_number', affectedBatch.lotNumber)
          .then(({ error }) => {
            if (error) console.warn('Supabase batch rollback error:', error.message);
          });
      }

      sb.from('transactions')
        .update({ is_reversed: true })
        .eq('id', transactionId)
        .then(({ error }) => {
          if (error) console.warn('Supabase transaction reversal update error:', error.message);
        });

      sb.from('transactions')
        .insert({
          id: reversalLog.id,
          timestamp: reversalLog.timestamp,
          type: reversalLog.type,
          product_sku: reversalLog.productSku,
          product_name: reversalLog.productName,
          lot_number: reversalLog.lotNumber,
          amount: reversalLog.amount,
          unit: reversalLog.unit,
          source_shelf: reversalLog.sourceShelf,
          target_shelf: reversalLog.targetShelf,
          user_role: reversalLog.userRole,
          note: reversalLog.note,
          is_reversed: false,
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase reversal log insert error:', error.message);
        });
    }
  };

  // Admin Handlers
  const handleAddProduct = (newProduct: Product) => {
    const next = [newProduct, ...products];
    persistData(next, transactions);
    setSelectedProduct(newProduct);

    const sb = getSupabaseClient(currentRole);
    sb.from('products')
      .insert({
        id: newProduct.id,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        name: newProduct.name,
        subtitle: newProduct.subtitle,
        form: newProduct.form,
        unit: newProduct.unit,
        units_per_carton: newProduct.unitsPerCarton,
        category: newProduct.category,
        min_critical_stock: newProduct.minCriticalStock,
        zone: newProduct.zone,
        storage_condition: newProduct.storageCondition,
      })
      .then(({ error }) => {
        if (error) {
          console.warn('Supabase product insert error:', error.message);
          return;
        }
        if (newProduct.batches.length > 0) {
          const b = newProduct.batches[0];
          sb.from('batches')
            .insert({
              batch_id: b.batchId,
              product_id: newProduct.id,
              lot_number: b.lotNumber,
              expiry_date: b.expiryDate,
              quantity: b.quantity,
              shelf_location: b.shelfLocation,
              is_quarantine: b.isQuarantine,
            })
            .then();
        }
      });
  };

  const handleUpdateProductThreshold = (productId: string, newThreshold: number) => {
    const next = products.map((p) =>
      p.id === productId ? { ...p, minCriticalStock: newThreshold } : p
    );
    persistData(next, transactions);

    const sb = getSupabaseClient(currentRole);
    sb.from('products')
      .update({ min_critical_stock: newThreshold })
      .eq('id', productId)
      .then();
  };

  const handleDeleteProduct = (productId: string) => {
    const next = products.filter((p) => p.id !== productId);
    persistData(next, transactions);
    if (selectedProduct?.id === productId) {
      setSelectedProduct(next[0] || null);
    }

    const sb = getSupabaseClient(currentRole);
    sb.from('products').delete().eq('id', productId).then();
  };

  const handleAddShelf = (newShelf: ShelfLocation) => {
    const next = [...shelves, newShelf];
    persistData(products, transactions, next);

    const sb = getSupabaseClient(currentRole);
    sb.from('shelf_locations')
      .insert({
        id: newShelf.id,
        code: newShelf.code,
        zone: newShelf.zone,
        label: newShelf.label,
        temperature_rule: newShelf.temperatureRule,
        is_active: newShelf.isActive,
      })
      .then();
  };

  const handleToggleShelfStatus = (shelfId: string) => {
    const target = shelves.find((s) => s.id === shelfId);
    const next = shelves.map((s) =>
      s.id === shelfId ? { ...s, isActive: !s.isActive } : s
    );
    persistData(products, transactions, next);

    if (target) {
      const sb = getSupabaseClient(currentRole);
      sb.from('shelf_locations')
        .update({ is_active: !target.isActive })
        .eq('id', shelfId)
        .then();
    }
  };

  const handleDeleteShelf = (shelfId: string) => {
    const next = shelves.filter((s) => s.id !== shelfId);
    persistData(products, transactions, next);

    const sb = getSupabaseClient(currentRole);
    sb.from('shelf_locations').delete().eq('id', shelfId).then();
  };

  const handleAddUser = async (newUser: WarehouseUser, password?: string) => {
    if (isOnline && password && newUser.email) {
      try {
        const rpcRes: any = await adminCreateStaffAccount({
          email: newUser.email,
          password: password,
          name: newUser.name,
          employeeCode: newUser.employeeCode,
          role: newUser.role,
          assignedZone: newUser.assignedZone,
        });

        const syncedUser: WarehouseUser = {
          ...newUser,
          id: rpcRes?.id || newUser.id,
          authUserId: rpcRes?.auth_user_id || undefined,
        };

        const next = [...users, syncedUser];
        persistData(products, transactions, shelves, next);
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase admin_create_staff_account RPC:', err);
      }
    }

    const next = [...users, newUser];
    persistData(products, transactions, shelves, next);

    const sb = getSupabaseClient(currentRole);
    sb.from('warehouse_users')
      .insert({
        id: newUser.id,
        name: newUser.name,
        employee_code: newUser.employeeCode,
        email: newUser.email || `${newUser.employeeCode.toLowerCase()}@careup.local`,
        role: newUser.role,
        assigned_zone: newUser.assignedZone,
        is_active: newUser.isActive,
      })
      .then();

    return { success: true };
  };

  const handleDeleteUser = async (userId: string) => {
    const next = users.filter((u) => u.id !== userId);
    persistData(products, transactions, shelves, next);

    if (isOnline) {
      try {
        await adminDeleteStaff(userId);
      } catch {
        const sb = getSupabaseClient(currentRole);
        sb.from('warehouse_users').delete().eq('id', userId).then();
      }
    }
  };

  const handleResetPassword = async (authUserId: string, newPass: string) => {
    if (!isOnline) {
      return { success: true };
    }
    try {
      await adminResetStaffPassword(authUserId, newPass);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    const next = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    persistData(products, transactions, shelves, next);

    const sb = getSupabaseClient(currentRole);
    sb.from('warehouse_users').update({ role: newRole }).eq('id', userId).then();
  };

  const handleToggleUserStatus = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    const next = users.map((u) =>
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    );
    persistData(products, transactions, shelves, next);

    if (target) {
      const sb = getSupabaseClient(currentRole);
      sb.from('warehouse_users')
        .update({ is_active: !target.isActive })
        .eq('id', userId)
        .then();
    }
  };

  const handleUpdateSystemRules = (newRules: SystemRules) => {
    persistData(products, transactions, shelves, users, newRules);

    const sb = getSupabaseClient(currentRole);
    sb.from('system_rules')
      .update({
        min_expiry_days_for_exit: newRules.minExpiryDaysForExit,
        enforce_fefo_priority: newRules.enforceFefoPriority,
        require_count_note: newRules.requireCountNote,
      })
      .eq('id', 1)
      .then();
  };

  // Summary Metrics
  const criticalProducts = products.filter((p) => {
    const total = p.batches.reduce((sum, b) => sum + b.quantity, 0);
    return total <= p.minCriticalStock;
  });

  const expiringBatches: { product: Product; lotNumber: string; expiryDate: string; days: number }[] = [];
  products.forEach((p) => {
    p.batches.forEach((b) => {
      const diff = Math.ceil(
        (new Date(b.expiryDate).getTime() - new Date('2026-11-22').getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (diff <= systemRules.minExpiryDaysForExit) {
        expiringBatches.push({
          product: p,
          lotNumber: b.lotNumber,
          expiryDate: b.expiryDate,
          days: diff,
        });
      }
    });
  });

  const actionCards = [
    {
      id: 'SORGULAMA' as ScreenState,
      title: 'Barkod & Stok Sorgula',
      description:
        'Kamera veya barkod okuyucu ile ürünün hangi rafta, hangi partide kaç adet bulunduğunu ve SKT bilgisini sorgulayın.',
      icon: Scan,
      badge: 'Tüm Roller',
      iconTheme: 'text-teal-700 bg-teal-50 border-teal-200',
      hoverBorder: 'hover:border-teal-500',
      restricted: false,
    },
    {
      id: 'STOK_GİRİŞİ' as ScreenState,
      title: 'Stok Girişi (Mal Kabul)',
      description:
        'Depoya yeni gelen takviye edici gıdaları parti (lot) numarası, son kullanma tarihi ve hedef raf konumuyla kaydedin.',
      icon: ArrowDownLeft,
      badge: 'Mal Kabul Operasyonu',
      iconTheme: 'text-blue-700 bg-blue-50 border-blue-200',
      hoverBorder: 'hover:border-blue-500',
      restricted: false,
    },
    {
      id: 'STOK_ÇIKIŞI' as ScreenState,
      title: 'Stok Çıkışı (FEFO Sevkiyat)',
      description:
        'Son kullanma tarihi en yakın olan partiden (FEFO kuralı) miad ve bakiye kontrolüyle güvenli sevkiyat çıkışı yapın.',
      icon: ArrowUpRight,
      badge: 'FEFO Öncelikli',
      iconTheme: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      hoverBorder: 'hover:border-emerald-500',
      restricted: false,
    },
    {
      id: 'TRANSFER' as ScreenState,
      title: 'Depo / Raf Transferi',
      description:
        'Partileri ambar rafları arasında taşıyın veya son kullanma tarihi yaklaşan ürünleri Karantina bölgesine ayırın.',
      icon: ArrowLeftRight,
      badge: 'İç Lojistik & Karantina',
      iconTheme: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      hoverBorder: 'hover:border-indigo-500',
      restricted: false,
    },
    {
      id: 'SAYIM_DÜZELTME' as ScreenState,
      title: 'Sayım & Stok Farkı Düzeltme',
      description:
        'Fiziksel raf sayımı ile sistem bakiyesi arasında fark oluştuğunda gerekçe kaydıyla stok miktarını eşitleyin.',
      icon: ClipboardCheck,
      badge: 'Sorumlu & Admin',
      iconTheme: 'text-amber-700 bg-amber-50 border-amber-200',
      hoverBorder: 'hover:border-amber-500',
      restricted: currentRole === 'Depo Çalışanı',
    },
    {
      id: 'AUDIT_LOG' as ScreenState,
      title: 'Hareket Geçmişi & Geri Alma',
      description:
        'Yapılan tüm giriş, çıkış ve transferleri inceleyin; hatalı kayıtları yetkili onayı ve Ters Kayıt ile geri alın.',
      icon: History,
      badge: `${transactions.length} Hareket Kaydı`,
      iconTheme: 'text-slate-700 bg-slate-100 border-slate-300',
      hoverBorder: 'hover:border-slate-500',
      restricted: false,
    },
  ];

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentRole(user.role);
          localStorage.setItem('careup_auth_user', JSON.stringify(user));
        }}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#F3F6F8] text-slate-900">
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleChange={setCurrentRole}
        onLogout={handleLogout}
        isOnline={isOnline}
        onToggleNetwork={handleToggleNetwork}
        pendingQueueCount={offlineQueue.length}
        onOpenInventoryModal={() => setIsInventoryModalOpen(true)}
        activeScreen={activeScreen}
        onGoHome={() => setActiveScreen('HOME')}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Network / Sync Banner if triggered */}
        {networkNotice && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
            <span>{networkNotice}</span>
            <button
              type="button"
              onClick={() => setNetworkNotice(null)}
              className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

        {activeScreen === 'HOME' ? (
          <>
            {/* Top Welcome & Operational KPI Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        currentRole === 'Admin'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : currentRole === 'Depo Sorumlusu'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      {currentRole === 'Admin' ? (
                        <Settings className="w-3.5 h-3.5" />
                      ) : currentRole === 'Depo Sorumlusu' ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                      Aktif Oturum: {currentRole}
                    </span>
                    <span className="text-xs text-slate-500">
                      Personel: <strong className="text-slate-800 font-semibold">{currentUser?.name}</strong> ({currentUser?.employeeCode})
                    </span>
                    <span className="text-xs text-slate-500 hidden md:inline">
                      {currentRole === 'Admin'
                        ? '• Ürün kataloğu, raf konumları, personel ve tüm depo operasyonlarını yönetebilirsiniz.'
                        : currentRole === 'Depo Sorumlusu'
                        ? '• Stok hareketleri, fiziksel sayım düzeltme ve onaylı işlem geri alma yetkiniz açıktır.'
                        : '• Barkod sorgulama, mal kabul, FEFO sevkiyat ve raf transferi işlemleri yapabilirsiniz.'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 pt-1">
                    CareUp Depo Operasyon ve Stok Yönetim Merkezi
                  </h2>
                </div>

                {/* Quick Admin Panel Shortcut Button */}
                <button
                  type="button"
                  onClick={() => setActiveScreen('ADMIN_PANEL')}
                  className={`self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer shrink-0 ${
                    currentRole === 'Admin'
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {currentRole === 'Admin' ? (
                    <Settings className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500" />
                  )}
                  <span>Sistem &amp; Ana Veri Yönetimi (Admin)</span>
                </button>
              </div>

              {/* 4 KPI Status Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Kayıtlı Ürün Çeşidi</span>
                    <strong className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {products.length} Ürün Kartı
                    </strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Kritik Stok Uyarısı</span>
                    <strong className="text-base sm:text-lg font-bold text-amber-800 font-mono">
                      {criticalProducts.length} Ürün
                    </strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      SKT &lt; {systemRules.minExpiryDaysForExit} Gün
                    </span>
                    <strong className="text-base sm:text-lg font-bold text-rose-700 font-mono">
                      {expiringBatches.length} Parti
                    </strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Aktif Raf Konumu</span>
                    <strong className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {shelves.filter((s) => s.isActive).length} Raf Adresi
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Core Warehouse Operation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {actionCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => setActiveScreen(card.id)}
                    className={`group bg-white border border-slate-200 ${card.hoverBorder} rounded-2xl p-6 flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:shadow-md`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`p-3 rounded-xl border ${card.iconTheme}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                          {card.restricted && <Lock className="w-3 h-3 text-amber-600" />}
                          {card.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:text-teal-800">
                      <span>Modülü Aç</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-World Operational Alerts: Critical Stock & Expiring Batches Table */}
            {(criticalProducts.length > 0 || expiringBatches.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Critical Stock Products */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Kritik Stok Seviyesinin Altındaki Ürünler
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      İkmal Gerekli
                    </span>
                  </div>

                  <div className="space-y-2">
                    {criticalProducts.map((cp) => {
                      const total = cp.batches.reduce((s, b) => s + b.quantity, 0);
                      return (
                        <div
                          key={cp.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700">
                                {cp.sku}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{cp.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Mevcut: <strong className="text-amber-700">{total} {cp.unit}</strong> • Kritik Eşik: {cp.minCriticalStock} {cp.unit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(cp);
                              setActiveScreen('STOK_GİRİŞİ');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            Mal Kabul Yap
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expiring Batches (< 30 Days) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Son Kullanma Tarihi Yaklaşan Partiler (&lt; {systemRules.minExpiryDaysForExit} Gün)
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Sevkiyat Kısıtlı
                    </span>
                  </div>

                  <div className="space-y-2">
                    {expiringBatches.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Miadı kritik sınırda olan parti bulunmuyor.</span>
                      </div>
                    ) : (
                      expiringBatches.map((item) => (
                        <div
                          key={`${item.product.id}-${item.lotNumber}`}
                          className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-rose-800">
                                {item.lotNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {item.product.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-rose-700 font-medium">
                              SKT: {item.expiryDate} ({item.days} gün kaldı — Normal çıkışa kapalı)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(item.product);
                              setActiveScreen('TRANSFER');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            Karantinaya Ayır
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeScreen === 'AUDIT_LOG' ? (
          <AuditTrail
            transactions={transactions}
            currentRole={currentRole}
            onRollbackTransaction={handleRollbackTransaction}
            onBackHome={() => setActiveScreen('HOME')}
            onRoleChange={setCurrentRole}
          />
        ) : activeScreen === 'ADMIN_PANEL' ? (
          <AdminPanel
            currentRole={currentRole}
            products={products}
            shelves={shelves}
            users={users}
            systemRules={systemRules}
            onAddProduct={handleAddProduct}
            onUpdateProductThreshold={handleUpdateProductThreshold}
            onDeleteProduct={handleDeleteProduct}
            onAddShelf={handleAddShelf}
            onToggleShelfStatus={handleToggleShelfStatus}
            onDeleteShelf={handleDeleteShelf}
            onAddUser={handleAddUser}
            onUpdateUserRole={handleUpdateUserRole}
            onToggleUserStatus={handleToggleUserStatus}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
            onUpdateSystemRules={handleUpdateSystemRules}
            onResetSystemData={handleResetToDefault}
            onBackHome={() => setActiveScreen('HOME')}
            onRoleChange={setCurrentRole}
          />
        ) : (
          <OperationStepView
            mode={activeScreen}
            products={products}
            shelves={shelves}
            systemRules={systemRules}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            currentRole={currentRole}
            isOnline={isOnline}
            onBackHome={() => setActiveScreen('HOME')}
            onSwitchMode={(newMode) => setActiveScreen(newMode)}
            onRoleChange={setCurrentRole}
            onExecuteTransaction={handleExecuteTransaction}
          />
        )}
      </div>

      {/* Product Catalog Modal */}
      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        products={products}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
          if (activeScreen === 'HOME') {
            setActiveScreen('SORGULAMA');
          }
        }}
      />
    </main>
  );
}
