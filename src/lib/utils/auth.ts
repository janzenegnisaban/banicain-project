import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';
import { isAdministrator, isOfficialRole, isSuperAdmin, type SessionUser } from '$lib/types/user';

export {
	OFFICIAL_ROLES,
	isOfficialRole,
	isAdministrator,
	isSuperAdmin,
	isProtectedAccountRole
} from '$lib/types/user';
export type { SessionUser } from '$lib/types/user';

const STORAGE_KEY = 'user';

function readCachedUser(): SessionUser | null {
	try {
		const cached = localStorage.getItem(STORAGE_KEY);
		if (!cached) return null;
		const parsed = JSON.parse(cached) as SessionUser;
		if (parsed?.id && parsed.isAuthenticated) return parsed;
	} catch {
		// ignore invalid cache
	}
	return null;
}

export async function hydrateSession(): Promise<SessionUser | null> {
	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session?.user) {
			return readCachedUser();
		}

		let profile: { id: string; full_name?: string; role?: string; email?: string } | null = null;
		try {
			const { data } = await supabase
				.from('users')
				.select('id, full_name, role, email')
				.eq('id', session.user.id)
				.maybeSingle();
			profile = data;
		} catch (profileError) {
			console.warn('Profile fetch failed; using auth session defaults', profileError);
		}

		const resolvedRole = profile?.role?.trim() || 'Resident';
		const user: SessionUser = {
			id: session.user.id,
			username: profile?.full_name ?? session.user.email?.split('@')[0] ?? 'User',
			email: session.user.email ?? profile?.email ?? undefined,
			role: resolvedRole,
			isAuthenticated: true
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		return user;
	} catch {
		return readCachedUser();
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

export async function requireSuperAdmin(): Promise<SessionUser> {
	const user = await requireOfficial();
	if (!isSuperAdmin(user.role)) {
		await goto('/dashboard');
		throw new Error('Super admin required');
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
