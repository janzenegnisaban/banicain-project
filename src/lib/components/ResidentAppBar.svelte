<script lang="ts">
  import { goto } from '$app/navigation';
  import type { SessionUser } from '$lib/types/user';
  import { signOut } from '$lib/utils/auth';

  export let title = '';
  export let subtitle = '';
  export let currentUser: SessionUser | null = null;
  export let isGuest = false;
  export let showClock = true;
  export let clockLabel = '';

  async function handleLogout() {
    await signOut('/');
  }

  function goToMyReports() {
    if (typeof window !== 'undefined' && window.location.pathname === '/residents') {
      document.getElementById('my-reports')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    goto('/residents/dashboard');
  }
</script>

<header class="mb-8 relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 p-6 lg:p-8">
  <div
    class="absolute top-0 right-0 w-80 h-80 -mt-16 -mr-16 bg-emerald-400 opacity-20 rounded-full blur-3xl animate-float"
    aria-hidden="true"
  ></div>
  <div
    class="absolute bottom-0 left-0 w-64 h-64 -mb-12 -ml-12 bg-teal-400 opacity-20 rounded-full blur-3xl animate-float"
    style="animation-delay: 1s;"
    aria-hidden="true"
  ></div>

  <div class="relative z-10">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex-1 min-w-0">
        {#if isGuest}
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-100 text-xs font-semibold mb-3">
            Guest mode — sign in to track reports
          </span>
        {:else if currentUser}
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-emerald-50 text-xs font-semibold mb-3">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            Signed in as {currentUser.username}
          </span>
        {/if}

        <h1 class="text-2xl lg:text-3xl font-bold text-white mb-1">{title}</h1>
        {#if subtitle}
          <p class="text-emerald-100 text-sm lg:text-base">{subtitle}</p>
        {/if}
        {#if showClock && clockLabel}
          <p class="mt-2 text-white/80 text-sm">{clockLabel}</p>
        {/if}
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <slot name="actions" />

        {#if currentUser && !isGuest}
          <button
            type="button"
            on:click={goToMyReports}
            class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02]"
          >
            My Reports
          </button>
        {:else if isGuest}
          <button
            type="button"
            on:click={() => goto('/login?role=resident')}
            class="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-emerald-50"
          >
            Sign In
          </button>
        {/if}

        <button
          type="button"
          on:click={() => goto('/')}
          class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-all duration-200"
          aria-label="Back to home"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
          Home
        </button>

        {#if currentUser && !isGuest}
          <button
            type="button"
            on:click={handleLogout}
            class="inline-flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-all duration-200"
            aria-label="Sign out"
          >
            Sign Out
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>
