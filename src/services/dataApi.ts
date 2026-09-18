/**
 * Data Access Layer — Abstraction over Supabase that mirrors the current
 * AppContext API. Each method returns a Promise.
 *
 * If Supabase is not configured, it falls back to localStorage so the app
 * still works in demo/offline mode.
 *
 * This is the bridge between the frontend and the backend. The AppContext
 * will call these methods instead of reading/writing localStorage directly.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadStateFromStorage, saveStateToStorage } from '../utils/storage';
import { AppState } from '../types';

// ============================================================
// Types matching the DB schema (snake_case → camelCase mapping happens here)
// ============================================================

export interface DbSale {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_gstin: string | null;
  date: string;
  subtotal: number;
  total_discount: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  payment_method: string;
  is_zero_gst: boolean;
  is_inter_state: boolean;
  employee_name: string;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// AUTH
// ============================================================

export const authApi = {
  async signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async getCurrentSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getCurrentUserProfile() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    return profile;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const { data } = supabase.auth.onAuthStateChange(callback);
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },
};

// ============================================================
// SALES
// ============================================================

export const salesApi = {
  async create(businessId: string, sale: Partial<DbSale> & { items: any[] }) {
    if (!supabase) throw new Error('Supabase not configured');
    const { items, ...saleData } = sale;
    const { data: saleRow, error } = await supabase
      .from('sales')
      .insert({ ...saleData, business_id: businessId })
      .select()
      .single();
    if (error) throw error;

    if (items && items.length > 0) {
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(items.map((item: any) => ({ ...item, sale_id: saleRow.id })));
      if (itemsError) throw itemsError;
    }
    return saleRow;
  },

  async getByBusiness(businessId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: Partial<DbSale>) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
  },

  /** Real-time subscription for new sales */
  subscribeToSales(businessId: string, callback: (payload: any) => void) {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `business_id=eq.${businessId}` },
        callback
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },
};

// ============================================================
// PRODUCTS
// ============================================================

export const productsApi = {
  async getByBusiness(businessId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('products')
      .select('*, product_batches (*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(businessId: string, product: any) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, business_id: businessId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  /** Real-time: subscribe to product stock changes */
  subscribeToProducts(businessId: string, callback: (payload: any) => void) {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('product-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` },
        callback
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },
};

// ============================================================
// CUSTOMERS
// ============================================================

export const customersApi = {
  async getByBusiness(businessId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(businessId: string, customer: any) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...customer, business_id: businessId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// PAYMENTS
// ============================================================

export const paymentsApi = {
  async getByBusiness(businessId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(businessId: string, payment: any) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...payment, business_id: businessId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
  },

  /** Real-time: subscribe to new payments (for instant notification) */
  subscribeToPayments(businessId: string, callback: (payload: any) => void) {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('payment-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments', filter: `business_id=eq.${businessId}` },
        callback
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },
};

// ============================================================
// PURCHASES
// ============================================================

export const purchasesApi = {
  async getByBusiness(businessId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('purchases')
      .select('*, purchase_items (*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(businessId: string, purchase: any, items: any[]) {
    if (!supabase) throw new Error('Supabase not configured');
    const { items: _items, ...purchaseData } = purchase;
    const { data: purchaseRow, error } = await supabase
      .from('purchases')
      .insert({ ...purchaseData, business_id: businessId })
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(items.map((item: any) => ({ ...item, purchase_id: purchaseRow.id })));
      if (itemsError) throw itemsError;
    }
    return purchaseRow;
  },
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notificationsApi = {
  async getUnread(userId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markAsRead(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  /** Real-time: push notification when a new notification row is inserted */
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        callback
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },
};

// ============================================================
// DELIVERY CHALLANS
// ============================================================

export const challansApi = {
  async getByBusiness(businessId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('delivery_challans')
      .select('*, delivery_challan_items (*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(businessId: string, challan: any, items: any[]) {
    if (!supabase) throw new Error('Supabase not configured');
    const { items: _items, ...challanData } = challan;
    const { data: challanRow, error } = await supabase
      .from('delivery_challans')
      .insert({ ...challanData, business_id: businessId })
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('delivery_challan_items')
        .insert(items.map((item: any) => ({ ...item, challan_id: challanRow.id })));
      if (itemsError) throw itemsError;
    }
    return challanRow;
  },

  async updateStatus(id: string, status: string, deliveredAt?: string, receivedBy?: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const updates: any = { delivery_status: status };
    if (deliveredAt) updates.delivered_at = deliveredAt;
    if (receivedBy) updates.received_by = receivedBy;
    const { data, error } = await supabase
      .from('delivery_challans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================================
// FALLBACK: localStorage mode (when Supabase isn't configured)
// ============================================================

export const fallbackStorage = {
  load: (): AppState | null => loadStateFromStorage(),
  save: (state: AppState): void => saveStateToStorage(state),
};

export const isOnlineMode = isSupabaseConfigured;
