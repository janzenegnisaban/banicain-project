<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import AppBar from '$lib/components/AppBar.svelte';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
  import { sidebarCollapsed } from '$lib/stores/sidebar';
  import { requireOfficial, requireAdministrator, type SessionUser } from '$lib/utils/auth';

  export let title = '';
  export let subtitle = '';
  export let variant: 'glass' | 'gradient' = 'glass';
  export let requireAdmin = false;
  export let sticky = true;
  export let showUser = true;
  /** When true, content sits flush under AppBar without extra horizontal padding wrapper */
  export let flush = false;

  let currentUser: SessionUser | null = null;
  let authReady = false;

  onMount(async () => {
    try {
      currentUser = requireAdmin ? await requireAdministrator() : await requireOfficial();
      authReady = true;
    } catch {
      // Redirect is triggered inside requireOfficial/requireAdministrator; avoid infinite loading state
      await goto(requireAdmin ? '/dashboard' : '/login?role=officer');
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
      <PageTransition duration={300} delay={100}>
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
{/if}
