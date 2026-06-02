import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { isAdministrator, isOfficialRole, type SessionUser } from '$lib/types/user';

export { OFFICIAL_ROLES, isOfficialRole, isAdministrator } from '$lib/types/user';
export type { SessionUser } from '$lib/types/user';

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.slice(7);
	const {
		data: { user },
		error
	} = await supabase.auth.getUser(token);

	if (error || !user) {
		return null;
	}

	const { data: profile } = await supabase
		.from('users')
		.select('id, full_name, role, email')
		.eq('id', user.id)
		.maybeSingle();

	return {
		id: user.id,
		username: profile?.full_name ?? user.email?.split('@')[0] ?? 'User',
		email: user.email ?? profile?.email ?? undefined,
		role: profile?.role ?? 'Resident',
		isAuthenticated: true
	};
}

export function authError(message: string, status = 401) {
	return json({ error: message }, { status });
}

export async function requireOfficialUser(request: Request): Promise<SessionUser | Response> {
	const user = await getSessionUser(request);
	if (!user || !isOfficialRole(user.role)) {
		return authError('Official access required', 403);
	}
	return user;
}

export async function requireAdministratorUser(request: Request): Promise<SessionUser | Response> {
	const user = await getSessionUser(request);
	if (!user || !isAdministrator(user.role)) {
		return authError('Administrator access required', 403);
	}
	return user;
}

export function isAuthResponse(value: SessionUser | Response): value is Response {
	return value instanceof Response;
}
