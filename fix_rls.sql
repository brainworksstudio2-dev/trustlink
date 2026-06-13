-- 1. Ensure RLS is enabled for service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 2. Allow clients (the people who made the request) to view their own requests
CREATE POLICY "Clients can view their own requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = user_id);

-- 3. Allow clients to insert their own requests
CREATE POLICY "Clients can insert their own requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Allow assigned workers to view their received requests
CREATE POLICY "Workers can view requests assigned to them"
ON public.service_requests FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM public.workers WHERE user_id = auth.uid()
  )
);

-- 5. IMPORTANT: Allow assigned workers to UPDATE the status of their received requests
CREATE POLICY "Workers can update requests assigned to them"
ON public.service_requests FOR UPDATE
USING (
  worker_id IN (
    SELECT id FROM public.workers WHERE user_id = auth.uid()
  )
);
