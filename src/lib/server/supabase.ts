import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const supabaseUrl = env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_KEY ?? env.PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
	throw new Error('SUPABASE_URL (or PUBLIC_SUPABASE_URL) is required. Set it in your environment variables.');
}

if (!supabaseKey) {
	throw new Error('SUPABASE_KEY (or PUBLIC_SUPABASE_ANON_KEY) is required. Set it in your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);


