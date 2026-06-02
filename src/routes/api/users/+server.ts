import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { supabase, isServiceRole } from '$lib/server/supabase';
import { isAuthResponse, requireAdministratorUser, requireOfficialUser } from '$lib/server/auth';

type User = {
	id: string;
	username: string;
	email?: string;
	full_name?: string;
	role: string;
	is_active?: boolean;
	created_at?: string;
};

function mapUser(user: Record<string, unknown>): User {
	return {
		id: user.id as string,
		username: (user.email as string)?.split('@')[0] || (user.full_name as string) || 'Unknown',
		email: user.email as string | undefined,
		full_name: user.full_name as string | undefined,
		role: (user.role as string) || 'Resident',
		is_active: (user.is_active as boolean) ?? true,
		created_at: user.created_at as string | undefined
	};
}

export const GET: RequestHandler = async ({ request }) => {
	const official = await requireOfficialUser(request);
	if (isAuthResponse(official)) {
		return official;
	}

	try {
		const { data, error } = await supabase
			.from('users')
			.select('id, email, full_name, role, is_active, created_at')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching users:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json((data || []).map(mapUser));
	} catch (error: unknown) {
		console.error('Error in GET /api/users:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch users' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const admin = await requireAdministratorUser(request);
	if (isAuthResponse(admin)) {
		return admin;
	}

	try {
		const body = await request.json();
		const { username, email, full_name, role, password } = body;

		if (!username || !email) {
			return json({ error: 'Username and email are required' }, { status: 400 });
		}

		const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();

		if (existing) {
			return json({ error: 'User with this email already exists' }, { status: 400 });
		}

		let authUserId: string | null = null;

		if (password && password.length >= 8) {
			if (!isServiceRole) {
				console.warn('Service role key not available. Creating user in public.users without auth account.');
			} else {
				const { data: authData, error: authError } = await supabase.auth.admin.createUser({
					email: email.toLowerCase().trim(),
					password,
					email_confirm: true,
					user_metadata: {
						full_name: full_name || username,
						role: role || 'Resident'
					}
				});

				if (authError) {
					console.error('Error creating auth user:', authError);
					if (authError.message?.includes('not allowed') || authError.code === 'not_admin') {
						console.warn('Admin privileges not available. Creating user profile without auth account.');
					} else {
						return json({ error: `Failed to create auth account: ${authError.message}` }, { status: 500 });
					}
				} else {
					authUserId = authData?.user?.id ?? null;
				}
			}
		}

		const insertData = {
			id: authUserId || undefined,
			email: email.toLowerCase().trim(),
			full_name: full_name || username,
			role: role || 'Resident',
			is_active: true
		};

		const { data, error } = await supabase
			.from('users')
			.insert(insertData)
			.select('id, email, full_name, role, is_active, created_at')
			.single();

		if (error) {
			console.error('Error creating user profile:', error);
			if (authUserId) {
				await supabase.auth.admin.deleteUser(authUserId);
			}
			return json({ error: error.message }, { status: 500 });
		}

		return json(mapUser(data), { status: 201 });
	} catch (error: unknown) {
		console.error('Error in POST /api/users:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to create user' },
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ request, url }) => {
	const admin = await requireAdministratorUser(request);
	if (isAuthResponse(admin)) {
		return admin;
	}

	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const { email, full_name, role, is_active } = body;

		const updateData: Record<string, unknown> = {};
		if (email !== undefined) updateData.email = email;
		if (full_name !== undefined) updateData.full_name = full_name;
		if (role !== undefined) updateData.role = role;
		if (is_active !== undefined) updateData.is_active = is_active;

		const { data, error } = await supabase
			.from('users')
			.update(updateData)
			.eq('id', id)
			.select('id, email, full_name, role, is_active, created_at')
			.single();

		if (error) {
			console.error('Error updating user:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json(mapUser(data));
	} catch (error: unknown) {
		console.error('Error in PUT /api/users:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to update user' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ url, request }) => {
	const admin = await requireAdministratorUser(request);
	if (isAuthResponse(admin)) {
		return admin;
	}

	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const { error } = await supabase.from('users').delete().eq('id', id);

		if (error) {
			console.error('Error deleting user:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json({ success: true });
	} catch (error: unknown) {
		console.error('Error in DELETE /api/users:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to delete user' },
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async () => {
	return json(
		{
			error:
				'Password management is handled by Supabase Auth. Use Supabase Auth API for password operations.'
		},
		{ status: 400 }
	);
};
