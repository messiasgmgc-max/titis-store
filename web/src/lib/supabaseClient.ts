import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dusavcbgomdosfjodups.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
