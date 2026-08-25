import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dusavcbgomdosfjodups.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
