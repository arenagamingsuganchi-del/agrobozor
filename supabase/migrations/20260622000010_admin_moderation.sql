-- 1. Create Product Moderation Logs Table
CREATE TABLE IF NOT EXISTS product_moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that a reason is mandatory when new_status is 'rejected' (CTO Decision 1 & 3)
    CONSTRAINT reject_reason_required CHECK (
        new_status <> 'rejected' OR (reason IS NOT NULL AND trim(reason) <> '')
    )
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE product_moderation_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Permissive for local development validation)
CREATE POLICY "Allow all on product_moderation_logs" ON product_moderation_logs 
    FOR ALL USING (true) WITH CHECK (true);
