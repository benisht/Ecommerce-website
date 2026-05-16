-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  image TEXT,
  description TEXT,
  in_stock BOOLEAN DEFAULT true,
  sizes TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer JSONB,
  delivery_address JSONB,
  payment_info JSONB,
  items JSONB,
  total DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending',
  delivery_status TEXT DEFAULT 'pending',
  tracking_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
