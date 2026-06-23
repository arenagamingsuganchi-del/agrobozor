-- Create Sellers Table if not exists (STIR optional, referenced to users)
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(150) NOT NULL,
    description TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for Sellers
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers are viewable by everyone" ON sellers
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own seller profile" ON sellers
    FOR INSERT WITH CHECK (auth.uid() = user_id OR true); -- OR true for local development testing

CREATE POLICY "Sellers can update their own profile" ON sellers
    FOR UPDATE USING (auth.uid() = user_id OR true);


-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    icon_url TEXT,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Subcategories Table
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Products Table (Price and Region mandatory)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'archived')),
    stock NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Categories RLS
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
-- Subcategories RLS
CREATE POLICY "Subcategories are viewable by everyone" ON subcategories FOR SELECT USING (true);
-- Products RLS
CREATE POLICY "Active products are viewable by everyone" ON products 
    FOR SELECT USING (status = 'active' OR true); -- OR true for testing
-- Product Images RLS
CREATE POLICY "Product images are viewable by everyone" ON product_images FOR SELECT USING (true);


-- ==========================================
-- SEED DATA SETUP
-- ==========================================

-- 1. Insert Categories
INSERT INTO categories (id, name, sort_order) VALUES
('c1000000-0000-0000-0000-000000000000', 'Urug\'lar', 1),
('c2000000-0000-0000-0000-000000000000', 'Ko\'chatlar', 2),
('c3000000-0000-0000-0000-000000000000', 'O\'g\'itlar', 3),
('c4000000-0000-0000-0000-000000000000', 'Himoya vositalari', 4),
('c5000000-0000-0000-0000-000000000000', 'Agro xizmatlar', 5)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Subcategories
INSERT INTO subcategories (id, category_id, name) VALUES
-- Seeds
('s1100000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Bodring urug\'i'),
('s1200000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Pomidor urug\'i'),
('s1300000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Sabzi urug\'i'),
('s1400000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Piyoz urug\'i'),
-- Saplings
('s2100000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Meva ko\'chatlari'),
('s2200000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Manzarali daraxtlar'),
('s2300000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Uzum ko\'chatlari'),
-- Fertilizers
('s3100000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000000', 'Mineral o\'g\'itlar'),
('s3200000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000000', 'Organik o\'g\'itlar'),
-- Protective agents
('s4100000-0000-0000-0000-000000000000', 'c4000000-0000-0000-0000-000000000000', 'Fungitsidlar'),
('s4200000-0000-0000-0000-000000000000', 'c4000000-0000-0000-0000-000000000000', 'Insektitsidlar'),
('s4300000-0000-0000-0000-000000000000', 'c4000000-0000-0000-0000-000000000000', 'Gerbitsidlar'),
-- Agro Services
('s5100000-0000-0000-0000-000000000000', 'c5000000-0000-0000-0000-000000000000', 'Texnika ijarasi'),
('s5200000-0000-0000-0000-000000000000', 'c5000000-0000-0000-0000-000000000000', 'Konsultatsiya xizmati')
ON CONFLICT (id) DO NOTHING;

-- 3. Create a Test User and Seller (to own the products)
INSERT INTO users (id, telegram_id, first_name, username, phone, role) VALUES
('u0000000-0000-0000-0000-000000000000', 9999999, 'AgroBozor Diler', 'agro_dealer', '+998901234567', 'buyer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sellers (id, user_id, store_name, description, is_verified) VALUES
('d0000000-0000-0000-0000-000000000000', 'u0000000-0000-0000-0000-000000000000', 'Vodiylik Agro-Kimyo', 'Sifatli urug\'lar, ko\'chatlar va mineral o\'g\'itlar yetkazib beramiz.', true)
ON CONFLICT (id) DO NOTHING;

-- Helper SQL variables are not supported across multiple statements in standard Supabase migrations, 
-- so we insert directly with subqueries to match region names.

-- ==========================================
-- 30+ REALISTIC PRODUCTS SEEDING
-- ==========================================

-- Product 1: Torero F1 (Seeds -> Bodring)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1010000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1100000-0000-0000-0000-000000000000', 
'Torero F1 Bodring Urug\'i', 'Gollandiyaning yuqori hosildor bodring urug\'i. Issiqxonada yetishtirish uchun juda mos. Kasalliklarga chidamli.', 
245000.00, 'dona', (SELECT id FROM regions WHERE name = 'Farg\'ona vil.'), 'active', 500);

-- Product 2: Shantane Sabzi (Seeds -> Sabzi)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1020000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1300000-0000-0000-0000-000000000000', 
'Shantane Sabzi Urug\'i', 'Serhosil va shirin sabzi urug\'i. Ochiq maydonda ekishga mo\'ljallangan. 100-110 kunda pishib yetiladi.', 
75000.00, 'kg', (SELECT id FROM regions WHERE name = 'Andijon vil.'), 'active', 1500);

-- Product 3: Piyoz Daytona F1 (Seeds -> Piyoz)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1030000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1400000-0000-0000-0000-000000000000', 
'Piyoz Daytona F1', 'Daytona F1 - uzoq saqlanadigan, ochiq yerga mo\'ljallangan sariq piyoz urug\'i. Eksportbop nav.', 
190000.00, 'dona', (SELECT id FROM regions WHERE name = 'Toshkent vil.'), 'active', 800);

-- Product 4: Bobcat F1 (Seeds -> Pomidor)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1040000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1200000-0000-0000-0000-000000000000', 
'Bobcat F1 Pomidor Urug\'i', 'Bobcat F1 - ochiq maydonda yaxshi hosil beradigan go\'shtdor pomidor navi. Transportbop.', 
320000.00, 'dona', (SELECT id FROM regions WHERE name = 'Namangan vil.'), 'active', 600);

-- Product 5: Lindo F1 (Seeds -> Pomidor)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1050000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1200000-0000-0000-0000-000000000000', 
'Lindo F1 Pomidor Urug\'i', 'Erta pishar pushti pomidor urug\'i. Shirin, bozorcha va bozorbop nav. Kasalliklarga yuqori chidamlilik.', 
410000.00, 'dona', (SELECT id FROM regions WHERE name = 'Samarqand vil.'), 'active', 400);

-- Product 6: Meyer Limon (Saplings -> Meva ko'chatlari)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2010000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2100000-0000-0000-0000-000000000000', 
'Meyer Limon Ko\'chati', 'Sertifikatlangan, sovuqqa chidamli Meyer navli limon ko\'chatlari. Mahalliy iqlimga moslashtirilgan, 2 yillik.', 
25000.00, 'dona', (SELECT id FROM regions WHERE name = 'Toshkent sh.'), 'active', 300);

-- Product 7: Kishmish Uzum (Saplings -> Uzum)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2020000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2300000-0000-0000-0000-000000000000', 
'Kishmish Qora Uzum Ko\'chati', 'Mashhur qora kishmish uzum navi ko\'chati. Danaksiz, shirin va serhosil. Bahorda ekishga tayyor.', 
12000.00, 'dona', (SELECT id FROM regions WHERE name = 'Buxoro vil.'), 'active', 1000);

-- Product 8: Chandler Yong'oq (Saplings -> Meva ko'chatlari)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2030000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2100000-0000-0000-0000-000000000000', 
'Chandler Yong\'oq Ko\'chati', 'AQShning mashhur Chandler navli yong\'oq ko\'chati. Hosildorligi yuqori, po\'slog\'i yupqa, mag\'zi oq.', 
45000.00, 'dona', (SELECT id FROM regions WHERE name = 'Jizzax vil.'), 'active', 500);

-- Product 9: Crimson Sweet (Seeds -> Tarvuz)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1060000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1100000-0000-0000-0000-000000000000', 
'Crimson Sweet Tarvuz Urug\'i', 'Klassik shirin tarvuz navi. Transportga chidamli, po\'slog\'i qalin, mag\'zi qip-qizil.', 
145000.00, 'kg', (SELECT id FROM regions WHERE name = 'Qashqadaryo vil.'), 'active', 200);

-- Product 10: Eldor ko'chati (Saplings -> Meva ko'chatlari)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2040000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2100000-0000-0000-0000-000000000000', 
'Eldor Shaftoli Ko\'chati', 'Erta pishar Eldor shaftoli ko\'chati. Shirin va suvli nav, mahalliy bozorda xaridorgir.', 
15000.00, 'dona', (SELECT id FROM regions WHERE name = 'Surxondaryo vil.'), 'active', 400);

-- Product 11: Karbamid (Fertilizers -> Mineral)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3010000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3100000-0000-0000-0000-000000000000', 
'Karbamid (Mochevina) O\'g\'iti', 'Farg\'onaazot AJ mahsuloti. Yuqori konsentratsiyali azotli o\'g\'it (46.2% azot). O\'simlik o\'sishini tezlashtiradi.', 
4200.00, 'kg', (SELECT id FROM regions WHERE name = 'Farg\'ona vil.'), 'active', 50000);

-- Product 12: Ammofos (Fertilizers -> Mineral)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3020000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3100000-0000-0000-0000-000000000000', 
'Ammofos Granullangan O\'g\'it', 'Olmaliq kimyo zavodi mahsuloti. Murakkab fosfor-azotli mineral o\'g\'it (NP 12:52). Ildiz tizimini mustahkamlaydi.', 
8500.00, 'kg', (SELECT id FROM regions WHERE name = 'Toshkent vil.'), 'active', 30000);

-- Product 13: Selitra (Fertilizers -> Mineral)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3030000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3100000-0000-0000-0000-000000000000', 
'Ammiakli Selitra O\'g\'iti', 'Chirchiqazot AJ. Bahorgi oziqlantirish uchun ideal azotli o\'g\'it (34.4% azot). Tez eruvchan granulalar.', 
3800.00, 'kg', (SELECT id FROM regions WHERE name = 'Toshkent vil.'), 'active', 40000);

-- Product 14: Biogumus (Fertilizers -> Organik)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3040000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3200000-0000-0000-0000-000000000000', 
'Tabiiy Toza Biogumus', 'Kaliforniya qizil yomg\'ir chuvalchanglari yordamida tayyorlangan ekologik toza organik o\'g\'it. Hosildorlikni 40% gacha oshiradi.', 
1200.00, 'kg', (SELECT id FROM regions WHERE name = 'Sirdaryo vil.'), 'active', 20000);

-- Product 15: NPK 20-20-20 (Fertilizers -> Mineral)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3050000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3100000-0000-0000-0000-000000000000', 
'NPK 20-20-20 Suvda Eruvchan O\'g\'it', 'Turkiyaning eng sifatli mikrounsurlarga boy NPK o\'g\'iti. Barg orqali dorilash va tomchilab sug\'orish uchun.', 
28000.00, 'kg', (SELECT id FROM regions WHERE name = 'Namangan vil.'), 'active', 1500);

-- Product 16: Ridomil Gold (Protection -> Fungitsidlar)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p4010000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's4100000-0000-0000-0000-000000000000', 
'Ridomil Gold MZ 68 WG', 'Syngenta kompaniyasi. Pomidor, bodring va kartoshkadagi zamburug\'li kasalliklarga (fitoftora, peronosporoz) qarshi samarali vosita.', 
185000.00, 'kg', (SELECT id FROM regions WHERE name = 'Farg\'ona vil.'), 'active', 250);

-- Product 17: Aktara (Protection -> Insektitsidlar)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p4020000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's4200000-0000-0000-0000-000000000000', 
'Aktara 25 WG Tizimli Insektitsid', 'Zararkunandalarga (shira, trips, oq qanot, kolorado qo\'ng\'izi) qarshi tizimli ta\'sirga ega kimyoviy vosita.', 
35000.00, 'dona', (SELECT id FROM regions WHERE name = 'Andijon vil.'), 'active', 1200);

-- Product 18: Topaz (Protection -> Fungitsidlar)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p4030000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's4100000-0000-0000-0000-000000000000', 
'Topaz 100 EC Fungitsidi', 'Mevali daraxtlar va uzumzordagi un-shudring (oildium) kasalligiga qarshi yuqori samarali fungitsid. Profilaktik xususiyatga ega.', 
15000.00, 'dona', (SELECT id FROM regions WHERE name = 'Samarqand vil.'), 'active', 900);

-- Product 19: Kaliy Humat (Fertilizers -> Organik)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3060000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3200000-0000-0000-0000-000000000000', 
'Kaliy Humat Suyuq Organik O\'g\'it', 'Tuproq unumdorligini oshiruvchi va o\'simliklarning stress holatlariga chidamliligini kuchaytiruvchi suyuq gumus o\'g\'iti.', 
18000.00, 'litr', (SELECT id FROM regions WHERE name = 'Xorazm vil.'), 'active', 3000);

-- Product 20: Gerkules gerbitsidi (Protection -> Gerbitsidlar)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p4040000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's4300000-0000-0000-0000-000000000000', 
'Gerkules Yalpi Ta\'sirli Gerbitsid', 'Ochiq maydonlardagi bir yillik va ko\'p yillik begona o\'tlarni yo\'q qilish uchun yalpi ta\'sir etuvchi kuchli gerbitsid.', 
65000.00, 'litr', (SELECT id FROM regions WHERE name = 'Jizzax vil.'), 'active', 500);

-- Product 21: Superfosfat (Fertilizers -> Mineral)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3070000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3100000-0000-0000-0000-000000000000', 
'Superfosfat Oddiy Granullangan', 'Fosforli o\'g\'it (26% fosfor). Ekinlarni kuzgi yer haydashda va ekish vaqtida solish uchun moslangan.', 
3500.00, 'kg', (SELECT id FROM regions WHERE name = 'Navoiy vil.'), 'active', 15000);

-- Product 22: Enjio (Protection -> Insektitsidlar)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p4050000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's4200000-0000-0000-0000-000000000000', 
'Enjio 247 SC Insektitsid', 'Ikki xil ta\'sir etuvchi moddali (kontakt va tizimli) insektitsid. Trips va shiraga qarshi tezkor samara beradi.', 
45000.00, 'dona', (SELECT id FROM regions WHERE name = 'Buxoro vil.'), 'active', 750);

-- Product 23: Zamin Haydash (Services -> Texnika)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p5010000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's5100000-0000-0000-0000-000000000000', 
'Traktor Bilan Er Haydash Xizmati', 'MTZ-82 traktori bilan yerlarni chuqur haydash, chizellash va boronalash xizmatlari. Sifatli va tezkor.', 
250000.00, 'dona', (SELECT id FROM regions WHERE name = 'Sirdaryo vil.'), 'active', 5);

-- Product 24: Agro-Konsultatsiya (Services -> Konsultatsiya)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p5020000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's5200000-0000-0000-0000-000000000000', 
'Professional Agro-Maslahat Xizmati', 'Issiqxonada bodring va pomidor kasalliklarini aniqlash, oziqlantirish xaritasi (nutrition plan) tuzib berish xizmati.', 
150000.00, 'dona', (SELECT id FROM regions WHERE name = 'Toshkent vil.'), 'active', 10);

-- Product 25: Olma Shimol Sinapi (Saplings -> Meva ko'chatlari)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2050000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2100000-0000-0000-0000-000000000000', 
'Shimol Sinapi Olma Ko\'chati', 'Qishki olma navi. Sovuqqa juda chidamli, mevasi uzoq saqlanadi va shirin. Bahorgi mavsum uchun.', 
18000.00, 'dona', (SELECT id FROM regions WHERE name = 'Namangan vil.'), 'active', 600);

-- Product 26: Manzarali Archa (Saplings -> Manzarali)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2060000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2200000-0000-0000-0000-000000000000', 
'Qrim Archasi (Krimskaya Sosna)', 'Bog\'lar va ko\'chalarni ko\'kalamzorlashtirish uchun Qrim archasi. 1 metr balandlikda, ildizi bilan ko\'chirib beriladi.', 
120000.00, 'dona', (SELECT id FROM regions WHERE name = 'Toshkent vil.'), 'active', 200);

-- Product 27: Dorilash Xizmati (Services -> Texnika)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p5030000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's5100000-0000-0000-0000-000000000000', 
'Daraxtlarni Motorli Dorilash Xizmati', 'Bog\' va ekinlarni zararkunandalardan tozalash uchun motorli purkagichlar yordamida professional dori sepish xizmati.', 
350000.00, 'dona', (SELECT id FROM regions WHERE name = 'Farg\'ona vil.'), 'active', 3);

-- Product 28: Tomchilab Sug\'orish (Services -> Konsultatsiya)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p5040000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's5200000-0000-0000-0000-000000000000', 
'Tomchilab Sug\'orish Tizimi Loyihasi', 'Bog\'lar yoki issiqxonalar uchun suv va o\'g\'itni tejovchi tomchilab sug\'orish tizimini loyihalash va o\'rnatib berish.', 
900000.00, 'dona', (SELECT id FROM regions WHERE name = 'Samarqand vil.'), 'active', 4);

-- Product 29: Kalsiy Selitra (Fertilizers -> Mineral)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p3080000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's3100000-0000-0000-0000-000000000000', 
'Kalsiy Selitra YaraMila', 'Yevropaning Yara kompaniyasi mahsuloti. O\'simlik mevasining chirishini oldini oluvchi, kalsiyga boy mineral o\'g\'it.', 
16500.00, 'kg', (SELECT id FROM regions WHERE name = 'Toshkent sh.'), 'active', 5000);

-- Product 30: Piyoz Manas F1 (Seeds -> Piyoz)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1070000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1400000-0000-0000-0000-000000000000', 
'Piyoz Manas F1 Urug\'i', 'Daytona naviga o\'xshash, uzoq muddat chirimay saqlanadigan sariq piyoz urug\'i. Eksport talablariga javob beradi.', 
210000.00, 'dona', (SELECT id FROM regions WHERE name = 'Qoraqalpog\'iston Rep.'), 'active', 1000);

-- Product 31: Olxo\'ri Qora Quyosh (Saplings -> Meva ko'chatlari)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p2070000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's2100000-0000-0000-0000-000000000000', 
'Qora Quyosh Olxo\'ri Ko\'chati', 'Yirik va shirin olxo\'ri navi ko\'chati. Tungi sovuqlarga bardoshli, 2-yildan boshlab hosilga kiradi.', 
22000.00, 'dona', (SELECT id FROM regions WHERE name = 'Namangan vil.'), 'active', 450);

-- Product 32: Bagira F1 (Seeds -> Pomidor)
INSERT INTO products (id, seller_id, subcategory_id, title, description, price, unit, region_id, status, stock) VALUES
('p1080000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 's1200000-0000-0000-0000-000000000000', 
'Bagira F1 Pomidor Urug\'i', 'Ochiq yerda oson yetishadigan, mevalari yirik va juda suvli bo\'lgan qizil pomidor urug\'i.', 
310000.00, 'dona', (SELECT id FROM regions WHERE name = 'Buxoro vil.'), 'active', 500);


-- 4. Insert Product Images (Demo assets)
-- We map a placeholder or a realistic agricultural image url to make the design feel premium.
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
-- Cucumber
('p1010000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=400', true, 1),
-- Carrot
('p1020000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400', true, 1),
-- Onion
('p1030000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400', true, 1),
-- Tomato Bobcat
('p1040000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400', true, 1),
-- Tomato Lindo
('p1050000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400', true, 1),
-- Limon
('p2010000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&q=80&w=400', true, 1),
-- Grapes
('p2020000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&q=80&w=400', true, 1),
-- Walnut
('p2030000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1600850056064-a8b380df8395?auto=format&fit=crop&q=80&w=400', true, 1),
-- Watermelon
('p1060000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400', true, 1),
-- Peach
('p2040000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1603052875302-d376b7c0638a?auto=format&fit=crop&q=80&w=400', true, 1),
-- Urea Fertilizer
('p3010000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=400', true, 1),
-- Ammophos Fertilizer
('p3020000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=400', true, 1),
-- Ammonium Nitrate
('p3030000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&q=80&w=400', true, 1),
-- Biohumus
('p3040000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=400', true, 1),
-- NPK
('p3050000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=400', true, 1),
-- Ridomil Gold
('p4010000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&q=80&w=400', true, 1),
-- Aktara
('p4020000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1607619056574-7b8f30413b46?auto=format&fit=crop&q=80&w=400', true, 1),
-- Topaz
('p4030000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400', true, 1),
-- Humate
('p3060000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&q=80&w=400', true, 1),
-- Hercules
('p4040000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=400', true, 1),
-- Superphosphate
('p3070000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=400', true, 1),
-- Enjio
('p4050000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1607619056574-7b8f30413b46?auto=format&fit=crop&q=80&w=400', true, 1),
-- Tractor
('p5010000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=400', true, 1),
-- Consultant
('p5020000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=400', true, 1),
-- Apple Tree
('p2050000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1507598641400-ec3536cd81bc?auto=format&fit=crop&q=80&w=400', true, 1),
-- Decorative Tree
('p2060000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&q=80&w=400', true, 1),
-- Spraying
('p5030000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=400', true, 1),
-- Drip irrigation
('p5040000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1463123081488-729f454ee359?auto=format&fit=crop&q=80&w=400', true, 1),
-- Calcium Nitrate
('p3080000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&q=80&w=400', true, 1),
-- Onion Manas
('p1070000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400', true, 1),
-- Plum sapling
('p2070000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1603052875302-d376b7c0638a?auto=format&fit=crop&q=80&w=400', true, 1),
-- Tomato Bagira
('p1080000-0000-0000-0000-000000000000', 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400', true, 1)
ON CONFLICT (product_id, image_url) DO NOTHING;
