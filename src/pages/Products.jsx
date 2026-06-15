// No inStock found in Products.jsx, but checking for safety
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts } from '../data/apiService';
import ProductCard from '../components/ProductCard';
import './Products.css';

const Products = () => {
  const [filter, setFilter] = useState('All');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';

  const reloadProducts = async () => {
    console.info('Reloading products...');
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      console.info('Products loading finished.');
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadProducts();
  }, []);

  // Sync filter with URL category param
  useEffect(() => {
    if (categoryParam) setFilter(categoryParam);
  }, [categoryParam]);

  const [sortBy, setSortBy] = useState('default');

  // Reset category filter when search query changes
  useEffect(() => {
    if (searchQuery) setFilter('All');
  }, [searchQuery]);

  const dynamicCategories = ['All', ...new Set(products.map(p => p.category))];

  let filteredProducts = products;
  if (filter !== 'All') {
    filteredProducts = products.filter(p => p.category === filter);
  }

  // Apply search query on top of category filter
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredProducts = filteredProducts.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Apply sorting logic based on final computed price
  const getFinalPrice = (p) => {
    const price = Number(p.price) || 0;
    const discount = Number(p.discount_percent) || 0;
    return discount > 0 ? price * (1 - discount / 100) : price;
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') {
      return getFinalPrice(a) - getFinalPrice(b);
    }
    if (sortBy === 'price-high') {
      return getFinalPrice(b) - getFinalPrice(a);
    }
    if (sortBy === 'name-a-z') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'name-z-a') {
      return (b.name || '').localeCompare(a.name || '');
    }
    return 0;
  });

  const clearSearch = () => {
    setSearchParams({});
  };

  return (
    <div className="page-wrapper container animate-fade-in-up">
      <div className="products-header">
        {console.info('Rendering Products Grid, count:', sortedProducts.length)}
        <h1 className="title-glow">OUR <span className="text-accent">COLLECTION</span></h1>
        {searchQuery ? (
          <p className="products-subtitle">
            Showing results for <strong>"{searchQuery}"</strong>
            <button className="clear-search-btn" onClick={clearSearch}>✕ Clear search</button>
          </p>
        ) : (
          <p className="products-subtitle">Its time to start your fashion journey.</p>
        )}
      </div>

      <div className="products-controls">
        <div className="products-filter">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="products-sort">
          <label htmlFor="sort-select">Sort By: </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="default">Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name-a-z">Name: A to Z</option>
            <option value="name-z-a">Name: Z to A</option>
          </select>
        </div>
      </div>

      <div className="products-grid">
        {sortedProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {loading ? (
        <div className="no-products"><p>Loading products...</p></div>
      ) : sortedProducts.length === 0 && (
        <div className="no-products">
          <p>{searchQuery ? `No products found for "${searchQuery}".` : 'No gear found for this category.'}</p>
        </div>
      )}
    </div>
  );
};

export default Products;
