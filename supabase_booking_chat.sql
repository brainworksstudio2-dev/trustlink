-- 1. Add status to service_requests
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- 2. Create messages table for Chat
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Messages Policies
-- Users can insert messages if they are the sender
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

-- Users can view messages if they are the sender or receiver
CREATE POLICY "Users can view messages they are involved in" ON public.messages
    FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 5. Enable Realtime for messages table
-- Note: You may need to manually enable realtime for 'messages' in the Supabase Dashboard 
-- under Database > Replication > Source -> Toggle 'messages'.
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
