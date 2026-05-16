-- RUN THESE SCRIPTS IN SUPABASE SQL EDITOR

-- 1. Create Products Table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  image TEXT,
  description TEXT,
  inStock BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Orders Table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer JSONB, -- {name, email, phone}
  deliveryAddress JSONB, -- {address, cityState, pincode}
  paymentInfo JSONB, -- {upiId, gpayPhone, transactionId}
  items JSONB, -- Array of items
  total DECIMAL(10,2),
  paymentStatus TEXT DEFAULT 'pending',
  deliveryStatus TEXT DEFAULT 'pending',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Contacts Table
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Make sure to enable RLS (Row Level Security) and set proper policies
-- For public read on products, and admin access for others.
