/**
 * Mobile App — Supabase Client
 * Same config as web app, reads from react-native-config or .env
 */
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = AppConfig?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = AppConfig?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
