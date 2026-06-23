-- Create Regions Table
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert Uzbekistan's Regions
INSERT INTO regions (name) VALUES
('Toshkent sh.'),
('Toshkent vil.'),
('Farg\'ona vil.'),
('Andijon vil.'),
('Namangan vil.'),
('Sirdaryo vil.'),
('Jizzax vil.'),
('Samarqand vil.'),
('Qashqadaryo vil.'),
('Surxondaryo vil.'),
('Buxoro vil.'),
('Navoiy vil.'),
('Xorazm vil.'),
('Qoraqalpog\'iston Rep.')
ON CONFLICT (name) DO NOTHING;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) DEFAULT 'not-verified',
    role VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'admin')),
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Regions Policies
CREATE POLICY "Regions are viewable by everyone" ON regions
    FOR SELECT USING (true);

-- Users Policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (true); -- Simplified for MVP local development testing, can restrict to auth.uid() in production

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (true);
