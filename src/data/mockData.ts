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

export const INITIAL_SYSTEM_RULES: SystemRules = {
  minExpiryDaysForExit: 30,
  enforceFefoPriority: true,
  requireCountNote: true,
};

export const INITIAL_SHELVES: ShelfLocation[] = [
  {
    id: 'sh-1',
    code: 'RAF-A1-02-01',
    zone: 'A1',
    label: 'Tablet & Kapsül Ana Rafı (A1 Koridor 2)',
    temperatureRule: 'Oda Sıcaklığı (<25°C)',
    isActive: true,
  },
  {
    id: 'sh-2',
    code: 'RAF-A1-02-02',
    zone: 'A1',
    label: 'Tablet Yedek Rafı (A1 Koridor 2)',
    temperatureRule: 'Oda Sıcaklığı (<25°C)',
    isActive: true,
  },
  {
    id: 'sh-3',
    code: 'RAF-A1-03-01',
    zone: 'A1',
    label: 'Vitamin Kompleks Rafı (A1 Koridor 3)',
    temperatureRule: 'Nemsiz Kuru Alan (<25°C)',
    isActive: true,
  },
  {
    id: 'sh-4',
    code: 'RAF-B2-01-03',
    zone: 'B2',
    label: 'Serin Raf - Softjel & Omega (B2 Koridor 1)',
    temperatureRule: 'İklimlendirilmiş Serin Alan (<22°C)',
    isActive: true,
  },
  {
    id: 'sh-5',
    code: 'RAF-B2-04-02',
    zone: 'B2',
    label: 'Sıvı & Damla Takviye Rafı (B2 Koridor 4)',
    temperatureRule: 'Işıktan Korunmalı Serin Alan (<20°C)',
    isActive: true,
  },
  {
    id: 'sh-6',
    code: 'RAF-C1-04-01',
    zone: 'C1',
    label: 'Pastil & Bitkisel Ürün Rafı (C1 Koridor 4)',
    temperatureRule: 'Kuru Alan (<25°C)',
    isActive: true,
  },
  {
    id: 'sh-7',
    code: 'RAF-C1-05-01',
    zone: 'C1',
    label: 'Pastil Sevkiyat Hazırlık Rafı (C1 Koridor 5)',
    temperatureRule: 'Oda Sıcaklığı (<25°C)',
    isActive: true,
  },
  {
    id: 'sh-8',
    code: 'KARANTINA-01',
    zone: 'KARANTINA',
    label: 'Karantina & Miad/İade İzolasyon Bölgesi',
    temperatureRule: 'İzole Kontrollü Alan',
    isActive: true,
  },
];

export const INITIAL_USERS: WarehouseUser[] = [
  {
    id: 'usr-1',
    name: 'Ahmet Yılmaz',
    employeeCode: 'OP-104',
    role: 'Depo Çalışanı',
    assignedZone: 'A1 & C1 Koridorları',
    isActive: true,
  },
  {
    id: 'usr-2',
    name: 'Zeynep Demir',
    employeeCode: 'OP-108',
    role: 'Depo Çalışanı',
    assignedZone: 'B2 Serin Depo & Sevkiyat',
    isActive: true,
  },
  {
    id: 'usr-3',
    name: 'Merve Kaya',
    employeeCode: 'SR-201',
    role: 'Depo Sorumlusu',
    assignedZone: 'Tüm Ambarlar (A1, B2, C1)',
    isActive: true,
  },
  {
    id: 'usr-4',
    name: 'Halim Çağlar',
    employeeCode: 'ADM-001',
    role: 'Admin',
    assignedZone: 'Sistem & Ana Veri Yönetimi',
    isActive: true,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'CU-MG-001',
    barcode: '8682941001015',
    name: 'Care Up Magnezyum Üçlü Kombinasyon',
    subtitle: 'Malat, Sitrat & Bisglisinat Formları • 60 Tablet',
    form: 'Tablet',
    unit: 'Kutu',
    unitsPerCarton: 24,
    category: 'Vitamin & Mineral',
    minCriticalStock: 50,
    zone: 'A1',
    storageCondition: 'Oda Sıcaklığı (<25°C), Kuru Alan',
    batches: [
      {
        batchId: 'b-mg-1',
        lotNumber: 'LOT-24-MG01',
        expiryDate: '2027-04-15',
        quantity: 85,
        shelfLocation: 'RAF-A1-02-01',
        isQuarantine: false,
      },
      {
        batchId: 'b-mg-2',
        lotNumber: 'LOT-23-MG09',
        expiryDate: '2026-12-28',
        quantity: 18,
        shelfLocation: 'RAF-A1-02-02',
        isQuarantine: false,
      },
    ],
  },
  {
    id: 'prod-2',
    sku: 'CU-BC-002',
    barcode: '8682941001022',
    name: 'Care Up B-Kompleks Vitamin Destek',
    subtitle: 'B1, B2, B3, B5, B6, B12 & Folik Asit • 60 Tablet',
    form: 'Tablet',
    unit: 'Kutu',
    unitsPerCarton: 24,
    category: 'Vitamin & Mineral',
    minCriticalStock: 40,
    zone: 'A1',
    storageCondition: 'Oda Sıcaklığı (<25°C), Nemsiz Bölge',
    batches: [
      {
        batchId: 'b-bc-1',
        lotNumber: 'LOT-24-BC03',
        expiryDate: '2027-08-30',
        quantity: 120,
        shelfLocation: 'RAF-A1-03-01',
        isQuarantine: false,
      },
    ],
  },
  {
    id: 'prod-3',
    sku: 'CU-OM-003',
    barcode: '8682941001039',
    name: 'Care Up Saf Omega-3 Balık Yağı',
    subtitle: 'EPA & DHA Zengin Trigliserid Form • 60 Softjel',
    form: 'Softjel',
    unit: 'Kutu',
    unitsPerCarton: 12,
    category: 'Omega & Yağ Asitleri',
    minCriticalStock: 60,
    zone: 'B2',
    storageCondition: 'Isıya Duyarlı (<22°C), Serin Raf',
    batches: [
      {
        batchId: 'b-om-1',
        lotNumber: 'LOT-24-OM11',
        expiryDate: '2027-02-20',
        quantity: 32,
        shelfLocation: 'RAF-B2-01-03',
        isQuarantine: false,
      },
    ],
  },
  {
    id: 'prod-4',
    sku: 'CU-PAS-004',
    barcode: '8682941001046',
    name: 'Care Up Propolis & C Vitamini Pastil',
    subtitle: 'Karamürver, Çinko & Propolis Özü • 24 Pastil',
    form: 'Pastil',
    unit: 'Kutu',
    unitsPerCarton: 36,
    category: 'Pastil & Bitkisel',
    minCriticalStock: 80,
    zone: 'C1',
    storageCondition: 'Kuru Alan (<25°C), Direkt Güneşten Uzak',
    batches: [
      {
        batchId: 'b-pas-1',
        lotNumber: 'LOT-24-PAS05',
        expiryDate: '2027-11-15',
        quantity: 140,
        shelfLocation: 'RAF-C1-04-01',
        isQuarantine: false,
      },
      {
        batchId: 'b-pas-exp',
        lotNumber: 'LOT-23-PAS01',
        expiryDate: '2026-11-30',
        quantity: 12,
        shelfLocation: 'RAF-C1-04-02',
        isQuarantine: false,
      },
    ],
  },
  {
    id: 'prod-5',
    sku: 'CU-PAS-005',
    barcode: '8682941001053',
    name: 'Care Up Bal, Limon & Zencefil Pastil',
    subtitle: 'Doğal Ekstreli Boğaz Pastili • 24 Pastil',
    form: 'Pastil',
    unit: 'Kutu',
    unitsPerCarton: 36,
    category: 'Pastil & Bitkisel',
    minCriticalStock: 40,
    zone: 'C1',
    storageCondition: 'Oda Sıcaklığı (<25°C)',
    batches: [
      {
        batchId: 'b-blz-1',
        lotNumber: 'LOT-24-BLZ02',
        expiryDate: '2027-09-18',
        quantity: 94,
        shelfLocation: 'RAF-C1-05-01',
        isQuarantine: false,
      },
    ],
  },
  {
    id: 'prod-6',
    sku: 'CU-DK-006',
    barcode: '8682941001060',
    name: 'Care Up D3 + K2 Damla Sıvı Takviye',
    subtitle: 'Zeytinyağı Bazlı Doğal Form • 20 ml Şişe',
    form: 'Sıvı/Damla',
    unit: 'Şişe',
    unitsPerCarton: 20,
    category: 'Bağışıklık',
    minCriticalStock: 30,
    zone: 'B2',
    storageCondition: 'Işıktan Korunmalı Serin Alan (<20°C)',
    batches: [
      {
        batchId: 'b-dk-1',
        lotNumber: 'LOT-24-DK07',
        expiryDate: '2027-06-30',
        quantity: 45,
        shelfLocation: 'RAF-B2-04-02',
        isQuarantine: false,
      },
    ],
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-10981',
    timestamp: '2026-11-22 14:15',
    type: 'STOK_GİRİŞİ',
    productSku: 'CU-MG-001',
    productName: 'Care Up Magnezyum Üçlü Kombinasyon',
    lotNumber: 'LOT-24-MG01',
    amount: 50,
    unit: 'Kutu',
    sourceShelf: 'MAL_KABUL',
    targetShelf: 'RAF-A1-02-01',
    userRole: 'Depo Çalışanı',
    note: 'Üretim sevkiyat parti kabulü tamamlandı.',
  },
  {
    id: 'TRX-10982',
    timestamp: '2026-11-22 15:40',
    type: 'STOK_ÇIKIŞI',
    productSku: 'CU-PAS-004',
    productName: 'Care Up Propolis & C Vitamini Pastil',
    lotNumber: 'LOT-24-PAS05',
    amount: 20,
    unit: 'Kutu',
    sourceShelf: 'RAF-C1-04-01',
    targetShelf: 'SEVKİYAT_RAMPASI',
    userRole: 'Depo Çalışanı',
    note: 'Eczane siparişi #ECZ-4428 için çıkış yapıldı.',
  },
];
