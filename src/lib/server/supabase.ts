import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const supabaseUrl = env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL;
// Prefer service role key for server-side operations (bypasses RLS)
// Fall back to anon key only if service role is not available
const supabaseKey = env.SUPABASE_KEY ?? env.PUBLIC_SUPABASE_ANON_KEY;
const publicAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;
const isServiceRole = Boolean(env.SUPABASE_KEY);

if (!supabaseUrl) {
	throw new Error('SUPABASE_URL (or PUBLIC_SUPABASE_URL) is required. Set it in your environment variables.');
}

if (!supabaseKey) {
	throw new Error('SUPABASE_KEY (or PUBLIC_SUPABASE_ANON_KEY) is required. Set it in your environment variables.');
}

// Warn if using anon key for server operations (will be subject to RLS)
if (!isServiceRole && process.env.NODE_ENV !== 'production') {
	console.warn(
		'[Supabase] WARNING: Using anon key for server operations. Set SUPABASE_KEY (service role key) to bypass RLS policies.'
	);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

export function getSupabaseClientForRequest(authHeader?: string): SupabaseClient {
	if (!authHeader || isServiceRole) {
		return supabase;
	}

	if (!publicAnonKey) {
		console.warn(
			'[Supabase] Authorization header provided but PUBLIC_SUPABASE_ANON_KEY is missing. Falling back to default server client.'
		);
		return supabase;
	}

	return createClient(supabaseUrl, publicAnonKey, {
		global: {
			headers: {
				Authorization: authHeader
			}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export { isServiceRole };
