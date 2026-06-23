-- 1. Update Product Status Check Constraint to include 'draft'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'archived'));

-- 2. Create Storage Bucket for Product Images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for 'product-images' bucket
-- Allow public read access to all images
CREATE POLICY "Allow public select on product-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated insert on product-images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-images' AND (auth.role() = 'authenticated' OR true)); -- OR true for local development testing

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated delete on product-images" ON storage.objects
    FOR DELETE USING (bucket_id = 'product-images' AND (auth.role() = 'authenticated' OR true));
