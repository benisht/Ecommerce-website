import { supabase } from '../supabase';

const defaultProducts = [
  { id: '1', name: 'Sky Blue Cloud Zip', price: 89.99, category: 'Hoodies', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80', description: 'A comfortable, breathable sky blue hoodie.' },
  { id: '2', name: 'Silver Ocean Chronograph', price: 199.99, category: 'Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', description: 'Minimalist silver watch.' },
  { id: '3', name: 'Clear Frame Aviators', price: 45.00, category: 'Glasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80', description: 'Modern clear-frame glasses.' }
];

// ── PRODUCTS ────────────────────────────────────────────────────────────────
export const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase not connected, using local fallback:', err.message);
    const stored = localStorage.getItem('lookwalk_products');
    return stored ? JSON.parse(stored) : defaultProducts;
  }
};

export const fetchProductById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase fetch error, using local fallback:', err.message);
    const stored = localStorage.getItem('lookwalk_products');
    const products = stored ? JSON.parse(stored) : defaultProducts;
    return products.find(p => p.id === id);
  }
};

export const addProduct = async (product) => {
  const { data, error } = await supabase
    .from('products')
    .insert([{ ...product, createdAt: new Date().toISOString() }])
    .select();
  
  if (error) throw error;
  return data[0].id;
};

export const updateProduct = async (id, updates) => {
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteProduct = async (id) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ── ORDERS ──────────────────────────────────────────────────────────────────
export const placeOrder = async (orderData) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([{ ...orderData, createdAt: new Date().toISOString() }])
    .select();
  
  if (error) throw error;
  return data[0].id;
};

export const fetchOrders = async (limitNum = 50) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limitNum);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchOrders error, returning empty:', err.message);
    return [];
  }
};

export const updateOrderStatus = async (id, field, value) => {
  const { error } = await supabase
    .from('orders')
    .update({ [field]: value })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteOrder = async (id) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ── CONTACT QUERIES ─────────────────────────────────────────────────────────
export const submitContactQuery = async (queryData) => {
  const { error } = await supabase
    .from('contacts')
    .insert([{ ...queryData, status: 'unread', createdAt: new Date().toISOString() }]);
  
  if (error) throw error;
};

export const fetchContactQueries = async (limitNum = 30) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limitNum);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchQueries error, returning empty:', err.message);
    return [];
  }
};

export const markQueryRead = async (id) => {
  const { error } = await supabase
    .from('contacts')
    .update({ status: 'read' })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteQuery = async (id) => {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
