const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// Helper to attach authorization token to headers
const getHeaders = (extraHeaders = {}) => {
  const token = sessionStorage.getItem('lookwalk_admin_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { 
      ...options, 
      headers: getHeaders(options.headers),
      signal: controller.signal 
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// ── AUTHENTICATION ─────────────────────────────────────────────────────────
export const loginAdmin = async (userId, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Authentication failed');
  }
  return res.json();
};

// ── PRODUCTS ────────────────────────────────────────────────────────────────
export const fetchProducts = async (limit = 100, offset = 0, filters = {}) => {
  let url = `${API_URL}/products?limit=${limit}&offset=${offset}`;
  
  if (filters.category) url += `&category=${encodeURIComponent(filters.category)}`;
  if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
  if (filters.featured) url += `&featured=true`;
  if (filters.sort) url += `&sort=${filters.sort}`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error('API Error fetching products');
  return res.json();
};

export const fetchProductById = async (id) => {
  const res = await fetchWithTimeout(`${API_URL}/products/${id}`);
  if (!res.ok) throw new Error('API Error fetching product');
  return res.json();
};

export const addProduct = async (product) => {
  const res = await fetchWithTimeout(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error adding product');
  }
  return res.json();
};

export const updateProduct = async (id, updates) => {
  const res = await fetchWithTimeout(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error updating product');
  }
  return res.json();
};

export const deleteProduct = async (id) => {
  const res = await fetchWithTimeout(`${API_URL}/products/${id}`, { 
    method: 'DELETE' 
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error deleting product');
  }
  return res.json();
};

// ── ORDERS ──────────────────────────────────────────────────────────────────
export const placeOrder = async (orderData) => {
  const res = await fetchWithTimeout(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error placing order');
  }
  return res.json();
};

export const createRazorpayOrder = async (orderData) => {
  const res = await fetchWithTimeout(`${API_URL}/orders/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error creating Razorpay order');
  }
  return res.json();
};

export const verifyRazorpayPayment = async (paymentDetails) => {
  const res = await fetchWithTimeout(`${API_URL}/orders/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentDetails)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error verifying payment signature');
  }
  return res.json();
};

export const fetchOrders = async (limit = 100, offset = 0) => {
  const res = await fetchWithTimeout(`${API_URL}/orders?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('API Error fetching orders');
  return res.json();
};

export const updateOrderStatus = async (id, field, value) => {
  const res = await fetchWithTimeout(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, value })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error updating order');
  }
  return res.json();
};

export const deleteOrder = async (id) => {
  const res = await fetchWithTimeout(`${API_URL}/orders/${id}`, { 
    method: 'DELETE' 
  });
  if (!res.ok) throw new Error('API Error deleting order');
  return res.json();
};

// ── CONTACT QUERIES ─────────────────────────────────────────────────────────
export const submitContactQuery = async (queryData) => {
  const res = await fetchWithTimeout(`${API_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryData)
  });
  if (!res.ok) throw new Error('API Error submitting contact query');
  return res.json();
};

export const fetchContactQueries = async () => {
  const res = await fetchWithTimeout(`${API_URL}/contacts`);
  if (!res.ok) throw new Error('API Error fetching contact queries');
  return res.json();
};

export const markQueryRead = async (id) => {
  const res = await fetchWithTimeout(`${API_URL}/contacts/${id}`, { 
    method: 'PUT' 
  });
  if (!res.ok) throw new Error('API Error updating query status');
  return res.json();
};

export const deleteQuery = async (id) => {
  const res = await fetchWithTimeout(`${API_URL}/contacts/${id}`, { 
    method: 'DELETE' 
  });
  if (!res.ok) throw new Error('API Error deleting query');
  return res.json();
};

// ── SETTINGS ────────────────────────────────────────────────────────────────
export const fetchSettings = async (key) => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/settings/${key}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value;
  } catch (e) {
    console.error(`Error loading setting ${key}:`, e);
    return null;
  }
};

export const updateSettings = async (key, value) => {
  const res = await fetchWithTimeout(`${API_URL}/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error updating settings');
  }
  return res.json();
};

// ── CATEGORIES ──────────────────────────────────────────────────────────────
export const fetchCategories = async () => {
  const res = await fetchWithTimeout(`${API_URL}/categories`);
  if (!res.ok) throw new Error('API Error fetching categories');
  return res.json();
};

export const addCategory = async (name) => {
  const res = await fetchWithTimeout(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error adding category');
  }
  return res.json();
};

export const deleteCategory = async (name) => {
  const res = await fetchWithTimeout(`${API_URL}/categories/${encodeURIComponent(name)}`, { 
    method: 'DELETE' 
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error deleting category');
  }
  return res.json();
};
