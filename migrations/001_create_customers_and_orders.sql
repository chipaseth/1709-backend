CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone BYTEA,
  address BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled')),
  payment_reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
