-- Allow authenticated users to create transactions they are part of
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));