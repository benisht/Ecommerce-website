const { fetchProducts, deleteProduct } = require('../src/data/apiService');

(async () => {
  try {
    const products = await fetchProducts();
    console.log(`Found ${products.length} products. Deleting...`);
    for (const p of products) {
      await deleteProduct(p.id);
      console.log(`Deleted product ID ${p.id}`);
    }
    console.log('All products cleared.');
  } catch (err) {
    console.error('Error clearing inventory:', err);
  }
})();
