-- LOOKWALK Centralized PostgreSQL Schema

-- 1. Users table (Admin accounts)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price REAL NOT NULL,
  category VARCHAR(100) NOT NULL,
  image TEXT,                 -- Main image URL or base64
  images JSONB DEFAULT '[]',   -- Array of additional images
  description TEXT,
  in_stock INTEGER DEFAULT 1, -- 1 = In stock, 0 = Out of stock
  sizes JSONB DEFAULT '[]',    -- Array of sizes (e.g. ["S", "M"])
  variants JSONB DEFAULT '[]',-- Array of color variants with nested stocks
  discount_percent INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer JSONB,             -- { name, email, phone }
  delivery_address JSONB,     -- { address, cityState, pincode }
  payment_info JSONB,         -- { gpayPhone, upiId, transactionId, gpayName }
  items JSONB,                -- Array of items: [ { productId, name, price, quantity, size, color, image } ]
  total REAL NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',  -- 'pending' | 'received'
  delivery_status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
  shipping_zone VARCHAR(50) DEFAULT 'local',     -- 'local' | 'std'
  tracking_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'unread',           -- 'unread' | 'read'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Settings table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL
);

-- 6. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
