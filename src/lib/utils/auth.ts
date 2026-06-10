import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';
import { isAdministrator, isOfficialRole, type SessionUser } from '$lib/types/user';

export { OFFICIAL_ROLES, isOfficialRole, isAdministrator } from '$lib/types/user';
export type { SessionUser } from '$lib/types/user';

const STORAGE_KEY = 'user';

export async function hydrateSession(): Promise<SessionUser | null> {
	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session?.user) {
			return null;
		}

		const { data: profile } = await supabase
			.from('users')
			.select('id, full_name, role, email')
			.eq('id', session.user.id)
			.maybeSingle();

		const user: SessionUser = {
			id: session.user.id,
			username: profile?.full_name ?? session.user.email?.split('@')[0] ?? 'User',
			email: session.user.email ?? profile?.email ?? undefined,
			role: profile?.role ?? 'Resident',
			isAuthenticated: true
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		return user;
	} catch {
		return null;
	}
}

export async function requireOfficial(): Promise<SessionUser> {
	const user = await hydrateSession();
	if (!user || !isOfficialRole(user.role)) {
		if (user?.role === 'Resident') {
			goto('/residents');
		} else {
			goto('/login?role=officer');
		}
		throw new Error('Unauthorized');
	}
	return user;
}

export async function requireAdministrator(): Promise<SessionUser> {
	const user = await requireOfficial();
	if (!isAdministrator(user.role)) {
		await goto('/dashboard');
		throw new Error('Administrator required');
	}
	return user;
}

export async function signOut(redirectTo = '/') {
	try {
		await supabase.auth.signOut();
	} finally {
		localStorage.removeItem(STORAGE_KEY);
		goto(redirectTo);
	}
}

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	const headers = new Headers(init.headers ?? {});
	if (session?.access_token) {
		headers.set('Authorization', `Bearer ${session.access_token}`);
	}
	return fetch(input, { ...init, headers });
}
