-- 1. Create Carts and Cart Items
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cart_id, product_id)
);

-- 2. Create Orders and Order Items with Snapshot fields
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    total_price NUMERIC(15, 2) NOT NULL CHECK (total_price >= 0),
    delivery_address TEXT NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    product_price NUMERIC(15, 2) NOT NULL CHECK (product_price >= 0),
    product_image TEXT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Permissive for local development validation)
CREATE POLICY "Allow all on carts" ON carts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cart_items" ON cart_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analytics_events" ON analytics_events FOR ALL USING (true) WITH CHECK (true);

-- 6. Order Number Sequence Generator Setup
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ABZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- 7. Strict Order State Machine Trigger Setup
CREATE OR REPLACE FUNCTION enforce_order_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
    -- If status hasn't changed, let it pass
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Strict Transitions:
    -- pending -> confirmed OR cancelled
    -- confirmed -> completed
    IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'confirmed' AND NEW.status = 'completed' THEN
        RETURN NEW;
    END IF;

    -- Otherwise, raise an error to reject the update
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_order_status_transitions ON orders;
CREATE TRIGGER check_order_status_transitions
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION enforce_order_status_transitions();
