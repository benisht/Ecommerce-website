// wishlistManager.js
// Manages the liked/wishlisted products using localStorage

const WISHLIST_KEY = 'lookwalk_wishlist';

/**
 * Get all wishlisted product IDs as a Set.
 */
export const getWishlist = () => {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Get all wishlisted product IDs as an array.
 */
export const getWishlistIds = () => {
  return Array.from(getWishlist());
};

/**
 * Check if a product is wishlisted.
 */
export const isWishlisted = (productId) => {
  return getWishlist().has(productId);
};

/**
 * Add or remove a product from the wishlist. Returns new wishlisted state.
 */
export const toggleWishlist = (productId) => {
  const wishlist = getWishlist();
  let wishlisted;
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
    wishlisted = false;
  } else {
    wishlist.add(productId);
    wishlisted = true;
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(wishlist)));
  // Notify all listeners
  window.dispatchEvent(new CustomEvent('wishlistUpdated'));
  return wishlisted;
};

/**
 * Get the total count of wishlisted products.
 */
export const getWishlistCount = () => {
  return getWishlist().size;
};
