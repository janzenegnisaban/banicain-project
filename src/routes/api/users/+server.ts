import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';

type User = {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: string;
  is_active?: boolean;
  created_at?: string;
};

// Fetch all users from Supabase
export const GET: RequestHandler = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return json({ error: error.message }, { status: 500 });
    }

    // Map Supabase users to our User type
    const users: User[] = (data || []).map((user: any) => ({
      id: user.id,
      username: user.email?.split('@')[0] || user.full_name || 'Unknown',
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'Resident',
      is_active: user.is_active ?? true,
      created_at: user.created_at
    }));

    return json(users);
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
};

// Create new user
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, email, full_name, role } = body;

    if (!username || !email) {
      return json({ error: 'Username and email are required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Insert new user (Note: Password management is handled by Supabase Auth, not this table)
    const insertData = {
      email,
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
      console.error('Error creating user:', error);
      return json({ error: error.message }, { status: 500 });
    }

    const user: User = {
      id: data.id,
      username: data.email?.split('@')[0] || data.full_name || 'Unknown',
      email: data.email,
      full_name: data.full_name,
      role: data.role || 'Resident',
      is_active: data.is_active ?? true,
      created_at: data.created_at
    };

    return json(user, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    return json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
};

// Update user
export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { username, email, full_name, role, is_active } = body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    // Note: Password management is handled by Supabase Auth, not this table

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

    const user: User = {
      id: data.id,
      username: data.email?.split('@')[0] || data.full_name || 'Unknown',
      email: data.email,
      full_name: data.full_name,
      role: data.role || 'Resident',
      is_active: data.is_active ?? true,
      created_at: data.created_at
    };

    return json(user);
  } catch (error: any) {
    console.error('Error in PUT /api/users:', error);
    return json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
};

// Delete user
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/users:', error);
    return json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
};

// Note: Password reset is handled by Supabase Auth system, not this users table
// If you need password reset functionality, use Supabase Auth API directly
export const PATCH: RequestHandler = async ({ request, url }) => {
  return json({ 
    error: 'Password management is handled by Supabase Auth. Use Supabase Auth API for password operations.' 
  }, { status: 400 });
};
