// src/data/dataManager.js

const defaultProducts = [
  {
    id: '1',
    name: 'Sky Blue Cloud Zip',
    price: 89.99,
    category: 'Hoodies',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'A comfortable, breathable sky blue hoodie perfect for breezy weather.'
  },
  {
    id: '2',
    name: 'Silver Ocean Chronograph',
    price: 199.99,
    category: 'Watches',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Minimalist silver watch with sky blue accents and water resistance.'
  },
  {
    id: '3',
    name: 'Clear Frame Aviators',
    price: 45.00,
    category: 'Glasses',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Modern clear-frame glasses with light blue tinted lenses for UV protection.'
  },
  {
    id: '4',
    name: 'Crisp White Oxford',
    price: 65.50,
    category: 'Shirts',
    image: 'https://images.unsplash.com/photo-1620152591672-04e38e1cc3b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'A perfectly tailored white shirt made from premium organic cotton.'
  }
];

export const getProducts = () => {
  const stored = localStorage.getItem('lookwalk_products');
  if (stored) {
    return JSON.parse(stored);
  }
  
  localStorage.setItem('lookwalk_products', JSON.stringify(defaultProducts));
  return defaultProducts;
};

export const addProduct = (product) => {
  const products = getProducts();
  const newProduct = {
    ...product,
    id: Date.now().toString()
  };
  products.push(newProduct);
  localStorage.setItem('lookwalk_products', JSON.stringify(products));
  // Dispatch a custom event to update listening components
  window.dispatchEvent(new Event('productsUpdated'));
  return newProduct;
};

export const updateProduct = (id, updatedData) => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updatedData };
    localStorage.setItem('lookwalk_products', JSON.stringify(products));
    window.dispatchEvent(new Event('productsUpdated'));
    return products[index];
  }
  return null;
};

export const deleteProduct = (id) => {
  const products = getProducts();
  const filtered = products.filter(p => p.id !== id);
  localStorage.setItem('lookwalk_products', JSON.stringify(filtered));
  window.dispatchEvent(new Event('productsUpdated'));
};

export const getPaymentQR = () => {
  return localStorage.getItem('lookwalk_payment_qr') || '';
};

export const setPaymentQR = (url) => {
  localStorage.setItem('lookwalk_payment_qr', url);
};

export const deletePaymentQR = () => {
  localStorage.removeItem('lookwalk_payment_qr');
};
