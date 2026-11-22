export interface Batch {
  batchId: string;
  lotNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  shelfLocation: string;
  isQuarantine: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  subtitle: string;
  form: 'Tablet' | 'Softjel' | 'Pastil' | 'Sıvı/Damla';
  unit: 'Kutu' | 'Şişe';
  unitsPerCarton: number;
  category: 'Vitamin & Mineral' | 'Omega & Yağ Asitleri' | 'Pastil & Bitkisel' | 'Bağışıklık';
  minCriticalStock: number;
  zone: 'A1' | 'B2' | 'C1' | 'KARANTINA';
  storageCondition: string;
  batches: Batch[];
}

export type UserRole = 'Depo Çalışanı' | 'Depo Sorumlusu' | 'Admin';

export interface Transaction {
  id: string;
  timestamp: string;
  type: 'STOK_GİRİŞİ' | 'STOK_ÇIKIŞI' | 'TRANSFER' | 'SAYIM_DÜZELTME' | 'TERS_KAYIT';
  productSku: string;
  productName: string;
  lotNumber: string;
  amount: number;
  unit: string;
  sourceShelf: string;
  targetShelf: string;
  userRole: UserRole;
  note: string;
  isReversed?: boolean;
}

export interface ShelfLocation {
  id: string;
  code: string;
  zone: 'A1' | 'B2' | 'C1' | 'KARANTINA';
  label: string;
  temperatureRule: string;
  isActive: boolean;
}

export interface WarehouseUser {
  id: string;
  name: string;
  employeeCode: string;
  email?: string;
  authUserId?: string;
  role: UserRole;
  assignedZone: string;
  isActive: boolean;
}

export interface SystemRules {
  minExpiryDaysForExit: number;
  enforceFefoPriority: boolean;
  requireCountNote: boolean;
}

export const DEFAULT_SYSTEM_RULES: SystemRules = {
  minExpiryDaysForExit: 30,
  enforceFefoPriority: true,
  requireCountNote: true,
};

export const INITIAL_SYSTEM_RULES: SystemRules = DEFAULT_SYSTEM_RULES;

/**
 * CareUp Mobil Depo Yönetim Sistemi:
 * Kod içerisindeki tüm yapay/hazır veriler kaldırılmıştır.
 * Sistem %100 canlı Supabase PostgreSQL veritabanı ile çalışır.
 */
export const INITIAL_SHELVES: ShelfLocation[] = [];
export const INITIAL_USERS: WarehouseUser[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
