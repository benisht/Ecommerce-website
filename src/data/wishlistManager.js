// src/data/wishlistManager.js

const WISHLIST_KEY = 'lookwalk_wishlist';

/**
 * Get wishlist as Set
 */
export const getWishlist = () => {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const ids = raw ? JSON.parse(raw) : [];

    // Remove duplicates automatically
    return new Set(ids.map(String));
  } catch (error) {
    console.error('Wishlist error:', error);
    return new Set();
  }
};

/**
 * Save wishlist
 */
const saveWishlist = (wishlist) => {
  localStorage.setItem(
    WISHLIST_KEY,
    JSON.stringify([...wishlist])
  );

  window.dispatchEvent(
    new CustomEvent('wishlistUpdated')
  );
};

/**
 * Get wishlist IDs
 */
export const getWishlistIds = () => {
  return [...getWishlist()];
};

/**
 * Check if product is wishlisted
 */
export const isWishlisted = (productId) => {
  return getWishlist().has(String(productId));
};

/**
 * Toggle wishlist
 */
export const toggleWishlist = (productId) => {
  const wishlist = getWishlist();

  productId = String(productId);

  let wishlisted = false;

  if (wishlist.has(productId)) {
    wishlist.delete(productId);
  } else {
    wishlist.add(productId);
    wishlisted = true;
  }

  saveWishlist(wishlist);

  return wishlisted;
};

/**
 * Remove product from wishlist
 */
export const removeFromWishlist = (productId) => {
  const wishlist = getWishlist();

  wishlist.delete(String(productId));

  saveWishlist(wishlist);
};

/**
 * Clear wishlist
 */
export const clearWishlist = () => {
  localStorage.removeItem(WISHLIST_KEY);

  window.dispatchEvent(
    new CustomEvent('wishlistUpdated')
  );
};

/**
 * Get total wishlist count
 */
export const getWishlistCount = () => {
  return getWishlistIds().length;
};