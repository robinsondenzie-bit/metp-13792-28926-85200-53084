-- Create admin_messages table for admin-user communication
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.admin_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Admins can send messages
CREATE POLICY "Admins can send messages"
ON public.admin_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = sender_id);

-- Users can view their own messages
CREATE POLICY "Users can view their messages"
ON public.admin_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON public.admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_receiver ON public.admin_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON public.admin_messages(created_at DESC);

-- Enable realtime for admin messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;