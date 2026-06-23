-- Drop old SELECT policy if exists
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON products;

-- Create secure SELECT policy checking status or headers x-user-id (CTO Decision: Product Visibility Rules)
CREATE POLICY "Active products are viewable by everyone" ON products
    FOR SELECT USING (
        status = 'active'
        OR (
            CASE 
                WHEN current_setting('request.headers', true) IS NOT NULL 
                     AND current_setting('request.headers', true) <> '' 
                     AND (current_setting('request.headers', true)::json->>'x-user-id') IS NOT NULL
                THEN 
                    seller_id IN (
                        SELECT id FROM sellers WHERE user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
                    )
                    OR (
                        SELECT role FROM users WHERE id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
                    ) = 'admin'
                ELSE FALSE
            END
        )
    );
