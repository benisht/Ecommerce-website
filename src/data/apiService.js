const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// ── PRODUCTS ────────────────────────────────────────────────────────────────
export const fetchProducts = async (limit = 100, offset = 0) => {
  const res = await fetchWithTimeout(`${API_URL}/products?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const fetchProductById = async (id) => {
  const res = await fetchWithTimeout(`${API_URL}/products/${id}`);
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const addProduct = async (product) => {
  const res = await fetchWithTimeout(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const updateProduct = async (id, updates) => {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const deleteProduct = async (id) => {
  const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

// ── ORDERS ──────────────────────────────────────────────────────────────────
export const placeOrder = async (orderData) => {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const fetchOrders = async (limit = 50, offset = 0) => {
  const res = await fetchWithTimeout(`${API_URL}/orders?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const updateOrderStatus = async (id, field, value) => {
  const res = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, value })
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const deleteOrder = async (id) => {
  const res = await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

// ── CONTACT QUERIES ─────────────────────────────────────────────────────────
export const submitContactQuery = async (queryData) => {
  const res = await fetch(`${API_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryData)
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const fetchContactQueries = async () => {
  const res = await fetchWithTimeout(`${API_URL}/contacts`);
  if (!res.ok) throw new Error('API Error');
  return res.json();
};
export const markQueryRead = async (id) => {
  const res = await fetch(`${API_URL}/contacts/${id}`, { method: 'PUT' });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export const deleteQuery = async (id) => {
  const res = await fetch(`${API_URL}/contacts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};
export const fetchSettings = async (key) => {
  const res = await fetch(`${API_URL}/settings/${key}`);
  const data = await res.json();
  return data.value;
};

export const updateSettings = async (key, value) => {
  const res = await fetch(`${API_URL}/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
  return res.json();
};
