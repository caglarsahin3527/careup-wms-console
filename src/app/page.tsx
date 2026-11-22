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
  Home,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { LoginScreen } from '@/components/LoginScreen';
import { OperationStepView, ActiveOperationMode } from '@/components/OperationStepView';
import { AuditTrail } from '@/components/AuditTrail';
import { AdminPanel } from '@/components/AdminPanel';
import { InventoryModal } from '@/components/InventoryModal';
import {
  Product,
  Transaction,
  ShelfLocation,
  WarehouseUser,
  SystemRules,
  UserRole,
  DEFAULT_SYSTEM_RULES,
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
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shelves, setShelves] = useState<ShelfLocation[]>([]);
  const [users, setUsers] = useState<WarehouseUser[]>([]);
  const [systemRules, setSystemRules] = useState<SystemRules>(DEFAULT_SYSTEM_RULES);

  const [currentUser, setCurrentUser] = useState<WarehouseUser | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const currentRole: UserRole = currentUser?.role || 'Depo Çalışanı';
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [activeScreen, setActiveScreen] = useState<ScreenState>('HOME');
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);

  // RBAC Access Guard: Ensure users cannot view or navigate to panels not permitted for their role
  useEffect(() => {
    if (activeScreen === 'ADMIN_PANEL' && currentRole !== 'Admin') {
      setActiveScreen('HOME');
    }
    if (activeScreen === 'SAYIM_DÜZELTME' && currentRole === 'Depo Çalışanı') {
      setActiveScreen('HOME');
    }
  }, [activeScreen, currentRole]);

  // Load persisted data from Supabase (with localStorage fallback) and check auth
  useEffect(() => {
    let isMounted = true;

    // Load saved auth user
    try {
      const savedAuth = localStorage.getItem('careup_auth_user');
      if (savedAuth) {
        const parsed: WarehouseUser = JSON.parse(savedAuth);
        setCurrentUser(parsed);
      }
    } catch {}

    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const remote = await fetchAllWarehouseData();
        if (isMounted) {
          setUsers(remote.users);
          setShelves(remote.shelves);
          setProducts(remote.products);
          setSelectedProduct(remote.products.length > 0 ? remote.products[0] : null);
          setTransactions(remote.transactions);
          if (remote.systemRules) setSystemRules(remote.systemRules);

          // Eşleşen oturum kullanıcısını canlı veritabanı ile senkronize et
          const savedAuth = localStorage.getItem('careup_auth_user');
          if (savedAuth) {
            try {
              const parsed: WarehouseUser = JSON.parse(savedAuth);
              const freshUser = remote.users.find(
                (u) => u.id === parsed.id || u.employeeCode === parsed.employeeCode || u.email === parsed.email
              );
              if (freshUser) {
                setCurrentUser(freshUser);
                localStorage.setItem('careup_auth_user', JSON.stringify(freshUser));
              }
            } catch {}
          }
          setIsLoadingData(false);
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

        if (savedProducts) {
          const parsedP = JSON.parse(savedProducts);
          setProducts(parsedP);
          if (parsedP.length > 0) setSelectedProduct(parsedP[0]);
        }
        if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
        if (savedShelves) setShelves(JSON.parse(savedShelves));
        if (savedUsers) setUsers(JSON.parse(savedUsers));
        if (savedRules) setSystemRules(JSON.parse(savedRules));
      } catch (e) {
        console.warn('LocalStorage load warning', e);
      } finally {
        if (isMounted) setIsLoadingData(false);
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

  const handleResetToDefault = async () => {
    if (currentRole !== 'Admin') return;
    setIsLoadingData(true);
    try {
      localStorage.removeItem('careup_products_v4');
      localStorage.removeItem('careup_transactions_v4');
      localStorage.removeItem('careup_shelves_v4');
      localStorage.removeItem('careup_users_v4');
      const remote = await fetchAllWarehouseData();
      setUsers(remote.users);
      setShelves(remote.shelves);
      setProducts(remote.products);
      setSelectedProduct(remote.products.length > 0 ? remote.products[0] : null);
      setTransactions(remote.transactions);
      if (remote.systemRules) setSystemRules(remote.systemRules);
      setNetworkNotice('Tüm veriler Supabase veritabanından başarıyla yenilendi.');
      setTimeout(() => setNetworkNotice(null), 4000);
    } catch (err: any) {
      setNetworkNotice(`Veritabanı yenileme hatası: ${err?.message || err}`);
    } finally {
      setIsLoadingData(false);
    }
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

    // RBAC Security Guard: Depo Çalışanı cannot execute SAYIM_DÜZELTME
    if (params.type === 'SAYIM_DÜZELTME' && currentRole === 'Depo Çalışanı') {
      return {
        success: false,
        error: 'Yetkisiz İşlem: Sayım düzeltme ve mutabakat yetkisi yalnızca Depo Sorumlusu ve Admin rollerine aittir.',
      };
    }

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

  // Admin Handlers (Protected by currentRole === 'Admin')
  const handleAddProduct = (newProduct: Product) => {
    if (currentRole !== 'Admin') return;
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
    if (currentRole !== 'Admin') return;
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
    if (currentRole !== 'Admin') return;
    const next = products.filter((p) => p.id !== productId);
    persistData(next, transactions);
    if (selectedProduct?.id === productId) {
      setSelectedProduct(next[0] || null);
    }

    const sb = getSupabaseClient(currentRole);
    sb.from('products').delete().eq('id', productId).then();
  };

  const handleAddShelf = (newShelf: ShelfLocation) => {
    if (currentRole !== 'Admin') return;
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
    if (currentRole !== 'Admin') return;
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
    if (currentRole !== 'Admin') return;
    const next = shelves.filter((s) => s.id !== shelfId);
    persistData(products, transactions, next);

    const sb = getSupabaseClient(currentRole);
    sb.from('shelf_locations').delete().eq('id', shelfId).then();
  };

  const handleAddUser = async (newUser: WarehouseUser, password?: string) => {
    if (currentRole !== 'Admin') {
      return { success: false, error: 'Yetkisiz İşlem: Yalnızca Admin kullanıcı hesabı tanımlayabilir.' };
    }
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
    if (currentRole !== 'Admin') return;
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
    if (currentRole !== 'Admin') {
      return { success: false, error: 'Yetkisiz İşlem: Yalnızca Admin şifre sıfırlayabilir.' };
    }
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
    if (currentRole !== 'Admin') return;
    const next = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    persistData(products, transactions, shelves, next);

    const sb = getSupabaseClient(currentRole);
    sb.from('warehouse_users').update({ role: newRole }).eq('id', userId).then();
  };

  const handleToggleUserStatus = (userId: string) => {
    if (currentRole !== 'Admin') return;
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
    if (currentRole !== 'Admin') return;
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

  // Role-Specific Action Cards: Each role sees only the panels & operations authorized for them
  const actionCards = (() => {
    const baseCards = [
      {
        id: 'SORGULAMA' as ScreenState,
        title: 'Barkod & Stok Sorgula',
        description:
          'Kamera veya barkod okuyucu ile ürünün hangi rafta, hangi partide kaç adet bulunduğunu ve SKT bilgisini sorgulayın.',
        icon: Scan,
        badge: 'Operasyonel Sorgu',
        iconTheme: 'text-teal-700 bg-teal-50 border-teal-200',
        hoverBorder: 'hover:border-teal-500',
        onClick: () => setActiveScreen('SORGULAMA'),
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
        onClick: () => setActiveScreen('STOK_GİRİŞİ'),
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
        onClick: () => setActiveScreen('STOK_ÇIKIŞI'),
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
        onClick: () => setActiveScreen('TRANSFER'),
      },
    ];

    if (currentRole === 'Depo Çalışanı') {
      return [
        ...baseCards,
        {
          id: 'AUDIT_LOG' as ScreenState,
          title: 'Hareket Geçmişi (Denetim İzi)',
          description:
            'Depoda gerçekleştirilen tüm giriş, çıkış ve transfer hareketlerini inceleyin (Salt Okunur).',
          icon: History,
          badge: `${transactions.length} Hareket Kaydı (Görüntüleme)`,
          iconTheme: 'text-slate-700 bg-slate-100 border-slate-300',
          hoverBorder: 'hover:border-slate-500',
          onClick: () => setActiveScreen('AUDIT_LOG'),
        },
        {
          id: 'CATALOG_MODAL' as any,
          title: 'Ürün & Stok Kataloğu',
          description:
            'Depodaki tüm ürünlerin barkod, form, birim, aktif parti ve raf lokasyon detaylarını inceleyin.',
          icon: Package,
          badge: `${products.length} Ürün Kartı`,
          iconTheme: 'text-teal-700 bg-teal-50 border-teal-200',
          hoverBorder: 'hover:border-teal-500',
          onClick: () => setIsInventoryModalOpen(true),
        },
      ];
    }

    if (currentRole === 'Depo Sorumlusu') {
      return [
        ...baseCards,
        {
          id: 'SAYIM_DÜZELTME' as ScreenState,
          title: 'Sayım & Stok Farkı Düzeltme',
          description:
            'Fiziksel raf sayımı ile sistem bakiyesi arasında fark oluştuğunda gerekçe kaydıyla stok miktarını eşitleyin.',
          icon: ClipboardCheck,
          badge: 'Sorumlu Yetkili',
          iconTheme: 'text-amber-700 bg-amber-50 border-amber-200',
          hoverBorder: 'hover:border-amber-500',
          onClick: () => setActiveScreen('SAYIM_DÜZELTME'),
        },
        {
          id: 'AUDIT_LOG' as ScreenState,
          title: 'Hareket Geçmişi & Onaylı Geri Alma',
          description:
            'Yapılan tüm giriş, çıkış ve transferleri inceleyin; hatalı kayıtları yetkili onayı ve Ters Kayıt ile geri alın.',
          icon: History,
          badge: `${transactions.length} Hareket Kaydı (Geri Alma Açık)`,
          iconTheme: 'text-slate-700 bg-slate-100 border-slate-300',
          hoverBorder: 'hover:border-slate-500',
          onClick: () => setActiveScreen('AUDIT_LOG'),
        },
      ];
    }

    // Admin Rolü: Tüm operasyonlar + Sistem & Ana Veri Yönetimi Paneli
    return [
      ...baseCards,
      {
        id: 'SAYIM_DÜZELTME' as ScreenState,
        title: 'Sayım & Stok Farkı Düzeltme',
        description:
          'Fiziksel raf sayımı ile sistem bakiyesi arasında fark oluştuğunda gerekçe kaydıyla stok miktarını eşitleyin.',
        icon: ClipboardCheck,
        badge: 'Yönetici Yetkili',
        iconTheme: 'text-amber-700 bg-amber-50 border-amber-200',
        hoverBorder: 'hover:border-amber-500',
        onClick: () => setActiveScreen('SAYIM_DÜZELTME'),
      },
      {
        id: 'AUDIT_LOG' as ScreenState,
        title: 'Hareket Geçmişi & Geri Alma',
        description:
          'Tüm hareket kayıtlarını denetleyin; ters kayıt onaylarını ve işlem loglarını yönetin.',
        icon: History,
        badge: `${transactions.length} Hareket Kaydı`,
        iconTheme: 'text-slate-700 bg-slate-100 border-slate-300',
        hoverBorder: 'hover:border-slate-500',
        onClick: () => setActiveScreen('AUDIT_LOG'),
      },
      {
        id: 'ADMIN_PANEL' as ScreenState,
        title: 'Sistem & Ana Veri Yönetimi',
        description:
          'Ürün ana verileri, raf/ambar tanımları, personel kullanıcı hesapları ve sistem iş kurallarını yönetin.',
        icon: Settings,
        badge: 'Admin Paneli',
        iconTheme: 'text-slate-900 bg-slate-100 border-slate-300',
        hoverBorder: 'hover:border-slate-800',
        onClick: () => setActiveScreen('ADMIN_PANEL'),
      },
    ];
  })();

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
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
        onRoleChange={
          currentUser?.role === 'Admin'
            ? (role) => setCurrentUser((prev) => (prev ? { ...prev, role } : null))
            : undefined
        }
        onLogout={handleLogout}
        isOnline={isOnline}
        onToggleNetwork={handleToggleNetwork}
        pendingQueueCount={offlineQueue.length}
        onOpenInventoryModal={() => setIsInventoryModalOpen(true)}
        activeScreen={activeScreen}
        onGoHome={() => setActiveScreen('HOME')}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-4 sm:gap-6 pb-24 md:pb-8">
        {/* Network / Sync Banner if triggered */}
        {networkNotice && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold border ${
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
                    <span className="text-[11px] sm:text-xs text-slate-500">
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
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 pt-0.5 sm:pt-1">
                    Biorasence Depo Operasyon ve Stok Yönetim Merkezi
                  </h2>
                </div>

                {/* Quick Admin Panel Shortcut Button (Only visible to Admin role) */}
                {currentRole === 'Admin' && (
                  <button
                    type="button"
                    onClick={() => setActiveScreen('ADMIN_PANEL')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer shrink-0 bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs"
                  >
                    <Settings className="w-4 h-4 text-teal-400" />
                    <span>Sistem &amp; Ana Veri Yönetimi (Admin)</span>
                  </button>
                )}
              </div>

              {/* 4 KPI Status Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 sm:gap-3.5">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                    <Package className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs text-slate-500 block truncate">Kayıtlı Ürün</span>
                    <strong className="text-sm sm:text-lg font-bold text-slate-900 font-mono block truncate">
                      {products.length} Ürün
                    </strong>
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 sm:gap-3.5">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs text-slate-500 block truncate">Kritik Stok</span>
                    <strong className="text-sm sm:text-lg font-bold text-amber-800 font-mono block truncate">
                      {criticalProducts.length} Ürün
                    </strong>
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 sm:gap-3.5">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                    <Clock className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs text-slate-500 block truncate">
                      SKT &lt; {systemRules.minExpiryDaysForExit} Gün
                    </span>
                    <strong className="text-sm sm:text-lg font-bold text-rose-700 font-mono block truncate">
                      {expiringBatches.length} Parti
                    </strong>
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 sm:gap-3.5">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    <MapPin className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs text-slate-500 block truncate">Aktif Raf</span>
                    <strong className="text-sm sm:text-lg font-bold text-slate-900 font-mono block truncate">
                      {shelves.filter((s) => s.isActive).length} Raf
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State Banner if no products exist in DB yet */}
            {products.length === 0 && (
              <div className="bg-white border border-teal-200/90 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Package className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Veritabanı Canlı Bağlantısı Aktif • Henüz Ürün Kaydı Yok
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Sisteminiz doğrudan Supabase PostgreSQL veritabanına bağlıdır ve kod içerisindeki tüm yapay/örnek veriler kaldırılmıştır. Depo operasyonlarını başlatmak için Admin panelinden ilk raf ve ürünlerinizi tanımlayabilirsiniz.
                  </p>
                </div>
                {currentRole === 'Admin' && (
                  <button
                    type="button"
                    onClick={() => setActiveScreen('ADMIN_PANEL')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Admin Paneline Git &amp; İlk Ürün/Rafı Tanımla</span>
                  </button>
                )}
              </div>
            )}

            {/* Core Warehouse Operation Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {actionCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={card.onClick}
                    className={`group bg-white border border-slate-200 ${card.hoverBorder} rounded-2xl p-4 sm:p-6 flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99]`}
                  >
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`p-2.5 sm:p-3 rounded-xl border ${card.iconTheme}`}>
                          <IconComponent className="w-5 sm:w-6 h-5 sm:h-6" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-slate-200 flex items-center gap-1">
                          {card.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 sm:mt-1.5 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:text-teal-800">
                      <span>Modülü Aç</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-World Operational Alerts: Critical Stock & Expiring Batches Table */}
            {(criticalProducts.length > 0 || expiringBatches.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* Critical Stock Products */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Kritik Stok Seviyesinin Altındaki Ürünler
                      </h3>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-amber-800 bg-amber-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                      İkmal Gerekli
                    </span>
                  </div>

                  <div className="space-y-2">
                    {criticalProducts.map((cp) => {
                      const total = cp.batches.reduce((s, b) => s + b.quantity, 0);
                      return (
                        <div
                          key={cp.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
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
                            className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer text-center"
                          >
                            Mal Kabul Yap
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expiring Batches (< 30 Days) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Son Kullanma Tarihi Yaklaşan Partiler (&lt; {systemRules.minExpiryDaysForExit} Gün)
                      </h3>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-rose-800 bg-rose-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-rose-200 shrink-0">
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
                          className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
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
                            className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shrink-0 cursor-pointer text-center"
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
            onExecuteTransaction={handleExecuteTransaction}
          />
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly for mobile browsers) */}
      <nav
        aria-label="Mobil Hızlı Menü"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => setActiveScreen('HOME')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
            activeScreen === 'HOME'
              ? 'text-teal-700 font-bold bg-teal-50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px]">Ana Ekran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('SORGULAMA')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
            activeScreen === 'SORGULAMA'
              ? 'text-teal-700 font-bold bg-teal-50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span className="text-[10px]">Sorgula</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('STOK_GİRİŞİ')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
            activeScreen === 'STOK_GİRİŞİ'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span className="text-[10px]">Giriş</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('STOK_ÇIKIŞI')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
            activeScreen === 'STOK_ÇIKIŞI'
              ? 'text-emerald-700 font-bold bg-emerald-50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span className="text-[10px]">Çıkış</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('AUDIT_LOG')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
            activeScreen === 'AUDIT_LOG'
              ? 'text-slate-900 font-bold bg-slate-100'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px]">Geçmiş</span>
        </button>

        {currentRole === 'Admin' ? (
          <button
            type="button"
            onClick={() => setActiveScreen('ADMIN_PANEL')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
              activeScreen === 'ADMIN_PANEL'
                ? 'text-slate-900 font-bold bg-slate-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-[10px]">Admin</span>
          </button>
        ) : currentRole === 'Depo Sorumlusu' ? (
          <button
            type="button"
            onClick={() => setActiveScreen('SAYIM_DÜZELTME')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
              activeScreen === 'SAYIM_DÜZELTME'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span className="text-[10px]">Sayım</span>
          </button>
        ) : null}
      </nav>

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
