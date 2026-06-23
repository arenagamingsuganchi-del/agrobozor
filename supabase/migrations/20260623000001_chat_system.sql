-- 1. Create Chats Table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    last_message_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Chat Participants Table
CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (chat_id, user_id)
);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce max 2000 characters limit (CTO Decision 5)
    CONSTRAINT message_length_limit CHECK (char_length(content) <= 2000)
);

-- Add foreign key constraint to chats for last_message_id now that messages table exists
ALTER TABLE chats ADD CONSTRAINT fk_chats_last_message FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- 4. Create Indexes on Messages (CTO Performance Request)
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON messages(chat_id, created_at);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies using x-user-id request header (CTO Ownership Security Decision 1)
-- Chats policies
CREATE POLICY "Chats select policy" ON chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_participants.chat_id = chats.id 
              AND chat_participants.user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
        )
    );

CREATE POLICY "Chats insert policy" ON chats
    FOR INSERT WITH CHECK (true); -- Insert allowed, participant validation occurs on participant insert

-- Chat participants policies
CREATE POLICY "Participants select policy" ON chat_participants
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM chat_participants 
            WHERE user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
        )
    );

CREATE POLICY "Participants insert policy" ON chat_participants
    FOR INSERT WITH CHECK (
        user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
        OR EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.chat_id = chat_participants.chat_id
              AND chat_participants.user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
        )
    );

CREATE POLICY "Participants update policy" ON chat_participants
    FOR UPDATE USING (
        user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
    );

-- Messages policies
CREATE POLICY "Messages select policy" ON messages
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM chat_participants 
            WHERE user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
        )
    );

CREATE POLICY "Messages insert policy" ON messages
    FOR INSERT WITH CHECK (
        (sender_id IS NULL OR sender_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid)
        AND chat_id IN (
            SELECT chat_id FROM chat_participants 
            WHERE user_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
        )
    );

CREATE POLICY "Messages update policy" ON messages
    FOR UPDATE USING (
        sender_id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
    );

-- 7. Create Trigger for Chat Health Monitoring (Auto update last message properties)
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats
    SET last_message_at = NEW.created_at,
        last_message_id = NEW.id,
        updated_at = now()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- 8. Create Trigger for Message Rate Limiting (CTO Anti-Spam Request)
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    msg_count INTEGER;
BEGIN
    -- Only limit user messages (sender_id is not null)
    IF NEW.sender_id IS NOT NULL THEN
        SELECT count(*) INTO msg_count
        FROM messages
        WHERE sender_id = NEW.sender_id
          AND created_at >= now() - INTERVAL '10 seconds';
          
        IF msg_count >= 10 THEN
            RAISE EXCEPTION 'Xabarlar yuborish limiti oshib ketdi. Iltimos 10 soniya kuting.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_message_rate_limit
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION check_message_rate_limit();

-- 9. Add Messages Table to Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
