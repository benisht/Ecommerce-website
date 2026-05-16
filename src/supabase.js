import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { from: () => ({ select: () => ({ order: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }) }) }) };
