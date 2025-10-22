// Temporary override to avoid TS "never" errors when Supabase types are out of sync.
declare module '@/integrations/supabase/client' {
  export const supabase: any;
}
