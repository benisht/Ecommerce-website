// src/data/cartManager.js

export const getCartItems = () => {
  const items = localStorage.getItem('lookwalk_cart_items');
  return items ? JSON.parse(items) : [];
};

export const getCartCount = () => {
  const items = getCartItems();
  return items.reduce((total, item) => total + item.quantity, 0);
};

export const addToCart = (product, size = 'Default', color = 'Default', quantity = 1, maxStock = Infinity) => {
  const items = getCartItems();
  const existingIndex = items.findIndex(item => item.id === product.id && item.size === size && item.color === color);

  if (existingIndex >= 0) {
    const newQuantity = items[existingIndex].quantity + quantity;
    if (newQuantity > maxStock) {
      alert(`Cannot add more than ${maxStock} items in stock.`);
      items[existingIndex].quantity = maxStock;
    } else {
      items[existingIndex].quantity = newQuantity;
    }
  } else {
    const initialQty = Math.min(quantity, maxStock);
    items.push({ ...product, size, color, quantity: initialQty, maxStock });
  }

  localStorage.setItem('lookwalk_cart_items', JSON.stringify(items));
  window.dispatchEvent(new Event('cartUpdated'));
  return getCartCount();
};

export const updateCartItemQuantity = (index, delta) => {
  const items = getCartItems();
  if (items[index]) {
    const item = items[index];
    const newQuantity = item.quantity + delta;
    if (newQuantity > (item.maxStock ?? Infinity)) {
      alert(`Maximum stock of ${item.maxStock} reached.`);
      item.quantity = item.maxStock;
    } else if (newQuantity <= 0) {
      items.splice(index, 1);
    } else {
      item.quantity = newQuantity;
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
