<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { sidebarCollapsed } from '$lib/stores/sidebar';

  type User = {
    id: string;
    username: string;
    email?: string;
    full_name?: string;
    role: string;
    is_active?: boolean;
    created_at?: string;
  };

  let users: User[] = [];
  let isLoading = true;
  let showAddModal = false;
  let showEditModal = false;
  let showDeleteConfirm = false;
  let editingUser: User | null = null;
  let deletingUser: User | null = null;
  let searchTerm = '';
  let roleFilter = 'All';
  let statusFilter = 'All';
  let isSaving = false;

  const roles = ['Resident', 'Police Officer', 'Crime Analyst', 'Police Chief', 'Administrator'];
  const statuses = ['All', 'Active', 'Inactive'];

  // Form state
  let userForm = {
    username: '',
    email: '',
    full_name: '',
    role: 'Resident',
    password: '',
    is_active: true
  };

  onMount(() => {
    fetchUsers();
  });

  async function fetchUsers() {
    isLoading = true;
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.error) {
        console.error('Error fetching users:', data.error);
        users = [];
      } else {
        users = data;
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      users = [];
    } finally {
      isLoading = false;
    }
  }

  function openAddModal() {
    userForm = {
      username: '',
      email: '',
      full_name: '',
      role: 'Resident',
      password: '',
      is_active: true
    };
    showAddModal = true;
  }

  function openEditModal(user: User) {
    editingUser = user;
    userForm = {
      username: user.username,
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role,
      password: '',
      is_active: user.is_active ?? true
    };
    showEditModal = true;
  }

  function closeModals() {
    showAddModal = false;
    showEditModal = false;
    showDeleteConfirm = false;
    editingUser = null;
    deletingUser = null;
    userForm = {
      username: '',
      email: '',
      full_name: '',
      role: 'Resident',
      password: '',
      is_active: true
    };
  }

  async function saveUser() {
    if (isSaving) return;
    if (!userForm.email || !userForm.username) {
      alert('Email and username are required');
      return;
    }

    isSaving = true;
    try {
    const payload: any = {
      username: userForm.username,
      email: userForm.email,
      full_name: userForm.full_name || userForm.username,
      role: userForm.role,
      is_active: userForm.is_active
    };

    // Include password only when creating new user (not editing)
    if (!editingUser && userForm.password) {
      if (userForm.password.length < 8) {
        alert('Password must be at least 8 characters long');
        isSaving = false;
        return;
      }
      payload.password = userForm.password;
    }

      let response: Response;
      if (editingUser) {
        response = await fetch(`/api/users?id=${editingUser.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        await fetchUsers();
        closeModals();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    } finally {
      isSaving = false;
    }
  }

  function confirmDelete(user: User) {
    deletingUser = user;
    showDeleteConfirm = true;
  }

  async function deleteUser() {
    if (!deletingUser) return;

    try {
      const response = await fetch(`/api/users?id=${deletingUser.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchUsers();
        closeModals();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  }


  function getRoleColor(role: string) {
    const colors: Record<string, string> = {
      'Administrator': 'bg-red-100 text-red-700 border-red-200',
      'Police Officer': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Police Chief': 'bg-purple-100 text-purple-700 border-purple-200',
      'Crime Analyst': 'bg-teal-100 text-teal-700 border-teal-200',
      'Resident': 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  // Filtered users
  $: filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Active' && user.is_active) ||
      (statusFilter === 'Inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Statistics
  $: totalUsers = users.length;
  $: activeUsers = users.filter(u => u.is_active).length;
  $: inactiveUsers = users.filter(u => !u.is_active).length;
  $: adminUsers = users.filter(u => u.role === 'Administrator').length;
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
  <Sidebar />
  
  <div class="transition-all duration-300 {$sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80'} p-4 lg:p-6">
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 p-8 rounded-2xl shadow-2xl mb-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-80 h-80 -mt-16 -mr-16 bg-emerald-400 opacity-20 rounded-full blur-3xl animate-float"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 -mb-12 -ml-12 bg-teal-400 opacity-20 rounded-full blur-3xl animate-float" style="animation-delay: 1s;"></div>
      
      <div class="relative z-10 flex justify-between items-center">
        <div>
          <h1 class="text-4xl font-bold text-white mb-2">User Management</h1>
          <p class="text-emerald-100 text-lg">Add, edit, or delete users and manage roles</p>
        </div>
        <button 
          class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
          on:click={openAddModal}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>Add User</span>
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Users</p>
            <p class="text-2xl font-bold text-gray-800">{totalUsers}</p>
          </div>
          <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Active Users</p>
            <p class="text-2xl font-bold text-emerald-600">{activeUsers}</p>
          </div>
          <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Inactive Users</p>
            <p class="text-2xl font-bold text-gray-600">{inactiveUsers}</p>
          </div>
          <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Administrators</p>
            <p class="text-2xl font-bold text-red-600">{adminUsers}</p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
      <!-- Search and Filters -->
      <div class="mb-6 space-y-4">
        <div class="relative">
          <svg class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            placeholder="Search users by name, email, or username..."
            bind:value={searchTerm}
            class="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        <div class="flex flex-wrap gap-4">
          <select bind:value={roleFilter} class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
            <option value="All">All Roles</option>
            {#each roles as role}
              <option value={role}>{role}</option>
            {/each}
          </select>
          
          <select bind:value={statusFilter} class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
            {#each statuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Users Table -->
      {#if isLoading}
        <div class="text-center py-12">
          <svg class="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-600">Loading users...</p>
        </div>
      {:else if filteredUsers.length === 0}
        <div class="text-center py-12">
          <p class="text-gray-600">No users found</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th class="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredUsers as user (user.id)}
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors" in:fly={{ y: 20, duration: 300 }}>
                  <td class="py-4 px-4">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span class="text-emerald-700 font-semibold">
                          {user.full_name?.[0] || user.username[0] || 'U'}
                        </span>
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">{user.full_name || user.username}</div>
                        <div class="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4 text-gray-700">{user.email || 'N/A'}</td>
                  <td class="py-4 px-4">
                    <span class="px-3 py-1 text-xs font-medium rounded-full border {getRoleColor(user.role)}">
                      {user.role}
                    </span>
                  </td>
                  <td class="py-4 px-4">
                    {#if user.is_active}
                      <span class="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200">
                        Active
                      </span>
                    {:else}
                      <span class="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        Inactive
                      </span>
                    {/if}
                  </td>
                  <td class="py-4 px-4 text-sm text-gray-600">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center justify-end space-x-2">
                      <button 
                        class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit User"
                        on:click={() => openEditModal(user)}
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button 
                        class="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete User"
                        on:click={() => confirmDelete(user)}
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Summary Footer -->
      <div class="mt-6 pt-6 border-t border-gray-200">
        <p class="text-sm text-gray-600">Showing {filteredUsers.length} of {totalUsers} users</p>
      </div>
    </div>
  </div>
</div>

<!-- Add/Edit User Modal -->
{#if showAddModal || showEditModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">{editingUser ? 'Edit User' : 'Add New User'}</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            on:click={closeModals}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Username *</label>
              <input 
                type="text" 
                bind:value={userForm.username}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input 
                type="email" 
                bind:value={userForm.email}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                bind:value={userForm.full_name}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select 
                bind:value={userForm.role}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {#each roles as role}
                  <option value={role}>{role}</option>
                {/each}
              </select>
            </div>
            {#if !editingUser}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password {editingUser ? '' : '(Optional)'}</label>
                <input 
                  type="password" 
                  bind:value={userForm.password}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Set initial password (min 8 chars)'}
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p class="mt-1 text-xs text-gray-500">
                  {editingUser 
                    ? 'Leave blank to keep current password. Use Supabase Dashboard to reset passwords.'
                    : 'If provided, creates an auth account the user can log in with immediately.'}
                </p>
              </div>
            {:else}
              <div class="md:col-span-2">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p class="text-sm text-blue-700">
                    <strong>Note:</strong> Password management is handled by Supabase Auth system. 
                    To reset passwords, use the Supabase Dashboard or Auth API.
                  </p>
                </div>
              </div>
            {/if}
            <div class="flex items-center">
              <input 
                type="checkbox" 
                bind:checked={userForm.is_active}
                id="is_active"
                class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label for="is_active" class="ml-2 text-sm font-medium text-gray-700">Active</label>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button 
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={closeModals}
          >
            Cancel
          </button>
          <button 
            class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={saveUser}
            disabled={isSaving || !userForm.email || !userForm.username}
          >
            {#if isSaving}
              <span class="flex items-center">
                <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            {:else}
              {editingUser ? 'Save Changes' : 'Create User'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && deletingUser}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        
        <h2 class="text-2xl font-bold text-gray-800 text-center mb-2">Delete User?</h2>
        <p class="text-gray-600 text-center mb-6">
          Are you sure you want to delete <strong>{deletingUser.full_name || deletingUser.username}</strong>? This action cannot be undone.
        </p>

        <div class="flex space-x-3">
          <button 
            class="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={closeModals}
          >
            Cancel
          </button>
          <button 
            class="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            on:click={deleteUser}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}


<style>
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
</style>
