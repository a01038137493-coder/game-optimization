-- Customers 테이블
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  kakao_id TEXT UNIQUE,
  nickname TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders 테이블
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  plan_key TEXT,
  plan_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  original_price INTEGER,
  coupon_code TEXT,
  coupon_discount INTEGER DEFAULT 0,
  buyer_name TEXT,
  buyer_contact TEXT,
  games TEXT,
  memo TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  pay_status TEXT DEFAULT 'unpaid', -- unpaid, paid
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupons 테이블
CREATE TABLE IF NOT EXISTS coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- percent, fixed
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 쿠폰 사용횟수 증가 함수
CREATE OR REPLACE FUNCTION increment_coupon_uses(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE code = p_code;
END;
$$ LANGUAGE plpgsql;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_kakao_id ON customers(kakao_id);
