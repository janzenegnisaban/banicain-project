<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import AppBar from '$lib/components/AppBar.svelte';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
  import { sidebarCollapsed } from '$lib/stores/sidebar';
  import {
    requireOfficial,
    requireAdministrator,
    requireSuperAdmin as requireSuperAdminSession,
    type SessionUser
  } from '$lib/utils/auth';

  export let title = '';
  export let subtitle = '';
  export let variant: 'glass' | 'gradient' = 'glass';
  export let requireAdmin = false;
  /** Barangay Captain only — used for user management */
  export let superAdminOnly = false;
  export let sticky = true;
  export let showUser = true;
  /** When true, content sits flush under AppBar without extra horizontal padding wrapper */
  export let flush = false;

  let currentUser: SessionUser | null = null;
  let authReady = false;

  onMount(async () => {
    try {
      currentUser = superAdminOnly
        ? await requireSuperAdminSession()
        : requireAdmin
          ? await requireAdministrator()
          : await requireOfficial();
      authReady = true;
    } catch {
      authReady = true;
      await goto(superAdminOnly || requireAdmin ? '/dashboard' : '/login?role=officer');
    }
  });
</script>

{#if !authReady}
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
    <div class="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-emerald-100 text-center">
      <LoadingIndicator size="lg" color="primary" />
      <p class="mt-4 text-gray-600 font-medium">Verifying access…</p>
    </div>
  </div>
{:else if currentUser}
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 relative">
    <Sidebar user={currentUser} />

    <div class="transition-all duration-300 {$sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80'}">
      <PageTransition duration={200} delay={0}>
        <AppBar
          {title}
          {subtitle}
          {variant}
          {sticky}
          {showUser}
          username={currentUser.username}
          role={currentUser.role}
        >
          <svelte:fragment slot="actions">
            <slot name="actions" />
          </svelte:fragment>
        </AppBar>

        {#if flush}
          <slot {currentUser} />
        {:else}
          <div class="p-4 lg:p-6">
            <slot {currentUser} />
          </div>
        {/if}
      </PageTransition>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
    <div class="max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
      <p class="text-lg font-semibold text-gray-900">Access denied</p>
      <p class="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
      <button
        type="button"
        class="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        on:click={() => goto('/dashboard')}
      >
        Back to dashboard
      </button>
    </div>
  </div>
{/if}
