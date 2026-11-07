import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://fohaoxbaudmlgxcvlveh.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_kJwbCLRHf74K7DL2MRSpqQ_mP4l4mZB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
