// src/data/cartManager.js

export const getCartItems = () => {
  const items = localStorage.getItem('lookwalk_cart_items');
  return items ? JSON.parse(items) : [];
};

export const getCartCount = () => {
  const items = getCartItems();
  return items.reduce((total, item) => total + item.quantity, 0);
};

export const addToCart = (product, size = 'Default', color = 'Default', quantity = 1) => {
  const items = getCartItems();
  const existingIndex = items.findIndex(item => item.id === product.id && item.size === size && item.color === color);
  
  if (existingIndex >= 0) {
    items[existingIndex].quantity += quantity;
  } else {
    items.push({ ...product, size, color, quantity });
  }
  
  localStorage.setItem('lookwalk_cart_items', JSON.stringify(items));
  window.dispatchEvent(new Event('cartUpdated'));
  return getCartCount();
};

export const updateCartItemQuantity = (index, delta) => {
  const items = getCartItems();
  if (items[index]) {
    items[index].quantity += delta;
    if (items[index].quantity <= 0) {
      items.splice(index, 1);
    }
  }
  localStorage.setItem('lookwalk_cart_items', JSON.stringify(items));
  window.dispatchEvent(new Event('cartUpdated'));
};

export const removeCartItem = (index) => {
  const items = getCartItems();
  items.splice(index, 1);
  localStorage.setItem('lookwalk_cart_items', JSON.stringify(items));
  window.dispatchEvent(new Event('cartUpdated'));
};

export const clearCart = () => {
  localStorage.removeItem('lookwalk_cart_items');
  window.dispatchEvent(new Event('cartUpdated'));
};
