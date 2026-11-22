import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  Batch,
  Transaction,
  ShelfLocation,
  WarehouseUser,
  SystemRules,
  UserRole,
} from '@/data/mockData';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://acpvtauhvofytdidegix.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcHZ0YXVodm9meXRkaWRlZ2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNjk0MDgsImV4cCI6MjExMDk0NTQwOH0.F--IV_2FyTxhyLjvu680m5ENmdvmpKWTT491tSKi4WM';

/**
 * Aktif kullanıcı rolünü (x-careup-role) HTTP başlığı olarak gönderen
 * ve RLS (Row Level Security) get_current_user_role() fonksiyonuyla konuşan istemci oluşturucu.
 */
export function getSupabaseClient(role: UserRole = 'Admin'): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'x-careup-role': role,
      },
    },
  });
}

export const supabase = getSupabaseClient('Admin');

/**
 * Supabase'den tüm depo verilerini (Ürünler + Partiler, Hareketler, Raflar, Personel, Kurallar) çeker.
 */
export async function fetchAllWarehouseData() {
  const client = getSupabaseClient('Admin');

  const [productsRes, batchesRes, transactionsRes, shelvesRes, usersRes, rulesRes] =
    await Promise.all([
      client.from('products').select('*').order('created_at', { ascending: true }),
      client.from('batches').select('*').order('expiry_date', { ascending: true }),
      client.from('transactions').select('*').order('created_at', { ascending: false }),
      client.from('shelf_locations').select('*').order('code', { ascending: true }),
      client.from('warehouse_users').select('*').order('created_at', { ascending: true }),
      client.from('system_rules').select('*').eq('id', 1).maybeSingle(),
    ]);

  if (productsRes.error) throw productsRes.error;
  if (batchesRes.error) throw batchesRes.error;
  if (transactionsRes.error) throw transactionsRes.error;
  if (shelvesRes.error) throw shelvesRes.error;
  if (usersRes.error) throw usersRes.error;

  const batchesByProduct: Record<string, Batch[]> = {};
  (batchesRes.data || []).forEach((b: any) => {
    const mappedBatch: Batch = {
      batchId: b.batch_id,
      lotNumber: b.lot_number,
      expiryDate: b.expiry_date,
      quantity: b.quantity,
      shelfLocation: b.shelf_location,
      isQuarantine: b.is_quarantine,
    };
    if (!batchesByProduct[b.product_id]) {
      batchesByProduct[b.product_id] = [];
    }
    batchesByProduct[b.product_id].push(mappedBatch);
  });

  const products: Product[] = (productsRes.data || []).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    subtitle: p.subtitle,
    form: p.form,
    unit: p.unit,
    unitsPerCarton: p.units_per_carton,
    category: p.category,
    minCriticalStock: p.min_critical_stock,
    zone: p.zone,
    storageCondition: p.storage_condition,
    batches: batchesByProduct[p.id] || [],
  }));

  const transactions: Transaction[] = (transactionsRes.data || []).map((t: any) => ({
    id: t.id,
    timestamp: t.timestamp,
    type: t.type,
    productSku: t.product_sku,
    productName: t.product_name,
    lotNumber: t.lot_number,
    amount: t.amount,
    unit: t.unit,
    sourceShelf: t.source_shelf,
    targetShelf: t.target_shelf,
    userRole: t.user_role,
    note: t.note,
    isReversed: t.is_reversed,
  }));

  const shelves: ShelfLocation[] = (shelvesRes.data || []).map((s: any) => ({
    id: s.id,
    code: s.code,
    zone: s.zone,
    label: s.label,
    temperatureRule: s.temperature_rule,
    isActive: s.is_active,
  }));

  const users: WarehouseUser[] = (usersRes.data || []).map((u: any) => ({
    id: u.id,
    authUserId: u.auth_user_id,
    name: u.name,
    employeeCode: u.employee_code,
    email: u.email,
    role: u.role,
    assignedZone: u.assigned_zone,
    isActive: u.is_active,
  }));

  const systemRules: SystemRules | null = rulesRes.data
    ? {
        minExpiryDaysForExit: rulesRes.data.min_expiry_days_for_exit,
        enforceFefoPriority: rulesRes.data.enforce_fefo_priority,
        requireCountNote: rulesRes.data.require_count_note,
      }
    : null;

  return {
    products,
    transactions,
    shelves,
    users,
    systemRules,
  };
}

/**
 * Admin: Depo Personeli veya Depo Sorumlusu için Supabase Auth log-in hesabı oluşturur.
 */
export async function adminCreateStaffAccount(params: {
  email: string;
  password: string;
  name: string;
  employeeCode: string;
  role: UserRole;
  assignedZone: string;
}) {
  const client = getSupabaseClient('Admin');
  const { data, error } = await client.rpc('admin_create_staff_account', {
    p_email: params.email,
    p_password: params.password,
    p_name: params.name,
    p_employee_code: params.employeeCode,
    p_role: params.role,
    p_assigned_zone: params.assignedZone,
  });

  if (error) throw error;
  return data;
}

/**
 * Admin: Personelin log-in şifresini sıfırlar.
 */
export async function adminResetStaffPassword(authUserId: string, newPassword: string) {
  const client = getSupabaseClient('Admin');
  const { data, error } = await client.rpc('admin_reset_staff_password', {
    p_auth_user_id: authUserId,
    p_new_password: newPassword,
  });

  if (error) throw error;
  return data;
}

/**
 * Admin: Personeli ve log-in hesabını siler.
 */
export async function adminDeleteStaff(warehouseUserId: string) {
  const client = getSupabaseClient('Admin');
  const { data, error } = await client.rpc('admin_delete_staff', {
    p_warehouse_user_id: warehouseUserId,
  });

  if (error) throw error;
  return data;
}

