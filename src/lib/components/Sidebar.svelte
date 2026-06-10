<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { sidebarCollapsed } from '$lib/stores/sidebar';
  import { signOut } from '$lib/utils/auth';
  import type { SessionUser } from '$lib/types/user';

  export let user: SessionUser | null = null;

  let currentTime = new Date();
  $: isCollapsed = $sidebarCollapsed;
  $: initials = user?.username
    ? user.username
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'BS';

  const navItems = [
    { title: 'Dashboard', icon: '📊', href: '/dashboard', description: 'Overview and statistics' },
    { title: 'Incident Reports', icon: '📋', href: '/reports', description: 'Manage incident reports' },
    { title: 'Analytics', icon: '📈', href: '/analytics', description: 'Data analysis and insights' },
    ...(user?.role === 'Administrator' || user?.role === 'Barangay Captain'
      ? [{ title: 'Users', icon: '👥', href: '/users', description: 'Manage team accounts' }]
      : [])
  ];

  onMount(() => {
    const timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 1000);
    return () => clearInterval(timeInterval);
  });

  function goHome() {
    goto('/');
  }

  function toggleSidebar() {
    sidebarCollapsed.update((collapsed) => !collapsed);
  }

  async function handleLogout() {
    await signOut('/login?role=officer');
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<div class="sidebar-container fixed left-0 top-0 h-full bg-white/90 backdrop-blur-xl border-r border-emerald-200/50 shadow-xl transition-all duration-500 z-50 {isCollapsed ? 'w-24' : 'w-80'} lg:translate-x-0 {isCollapsed ? '-translate-x-full lg:translate-x-0' : ''} flex flex-col">
  <div class="p-5 border-b border-emerald-200/30">
    <div class="flex items-center {isCollapsed ? 'justify-center' : 'justify-between'}">
      {#if !isCollapsed}
        <button
          on:click={goHome}
          class="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
          aria-label="Go to home page"
        >
          <img src="/barangay-logo.png" alt="Brgy. Banicain — B-SAFE" class="w-10 h-10 object-contain" />
          <div class="text-left">
            <h2 class="text-xl font-bold text-emerald-700 leading-tight">B-SAFE</h2>
            <p class="text-[10px] uppercase tracking-wider text-emerald-500/80">Official Portal</p>
          </div>
        </button>
      {:else}
        <button on:click={goHome} class="hover:opacity-80 transition-opacity cursor-pointer" aria-label="Go to home page">
          <img src="/barangay-logo.png" alt="Brgy. Banicain — B-SAFE" class="w-10 h-10 object-contain" />
        </button>
      {/if}

      {#if !isCollapsed}
        <button
          on:click={toggleSidebar}
          class="p-2 rounded-lg hover:bg-emerald-100 transition-colors duration-200 flex-shrink-0"
          aria-label="Collapse sidebar"
        >
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
          </svg>
        </button>
      {:else}
        <button
          on:click={toggleSidebar}
          class="p-2 rounded-lg hover:bg-emerald-100 transition-colors duration-200 mx-auto mt-2"
          aria-label="Expand sidebar"
        >
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <div class="p-5 border-b border-emerald-200/30">
    {#if !isCollapsed}
      <div class="text-center">
        <div class="text-3xl font-bold text-emerald-600 mb-2">{formatTime(currentTime)}</div>
        <div class="text-sm text-gray-600">{formatDate(currentTime)}</div>
      </div>
    {:else}
      <div class="text-center">
        <div class="text-lg font-bold text-emerald-600 mb-1">{formatTime(currentTime).split(' ')[0]}</div>
        <div class="text-xs text-gray-500">{formatTime(currentTime).split(' ')[1]}</div>
      </div>
    {/if}
  </div>

  <nav class="flex-1 p-5 space-y-3 overflow-y-auto">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-item flex items-center {isCollapsed ? 'justify-center' : ''} p-4 rounded-xl transition-all duration-300 hover:bg-emerald-50 hover:shadow-md group {$page.url.pathname === item.href ? 'bg-emerald-100 shadow-md ring-1 ring-emerald-200/60' : ''}"
      >
        <div class="text-2xl {isCollapsed ? '' : 'mr-4'} group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
          {item.icon}
        </div>
        {#if !isCollapsed}
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-base text-gray-700 group-hover:text-emerald-700 transition-colors duration-200">
              {item.title}
            </div>
            <div class="text-xs text-gray-500 mt-0.5">{item.description}</div>
          </div>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="p-5 border-t border-emerald-200/30 space-y-3">
    {#if !isCollapsed}
      <div class="flex items-center space-x-4 p-4 rounded-xl bg-emerald-50">
        <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
          <span class="text-white text-sm font-bold">{initials}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-700 truncate">{user?.username ?? 'Official'}</div>
          <div class="text-xs text-gray-500 mt-0.5 truncate">{user?.role ?? 'Barangay Official'}</div>
        </div>
      </div>

      <button
        class="w-full flex items-center justify-center space-x-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors duration-300 font-medium"
        on:click={handleLogout}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        <span>Sign Out</span>
      </button>
    {:else}
      <div class="space-y-3">
        <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <span class="text-white text-xs font-bold">{initials}</span>
        </div>
        <button
          class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto hover:bg-red-600 transition-colors duration-300"
          on:click={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
        </button>
      </div>
    {/if}
  </div>
</div>

{#if !isCollapsed}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
    on:click={toggleSidebar}
    on:keydown={(e) => e.key === 'Enter' && toggleSidebar()}
    role="button"
    tabindex="0"
    aria-label="Close sidebar"
  ></div>
{/if}

<button
  class="fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
  on:click={toggleSidebar}
  aria-label="Toggle sidebar menu"
>
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
  </svg>
</button>

<style>
  .sidebar-container {
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nav-item {
    position: relative;
    overflow: hidden;
  }

  .nav-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent);
    transition: left 0.5s;
  }

  .nav-item:hover::before {
    left: 100%;
  }

  @media (max-width: 1024px) {
    .sidebar-container {
      transform: translateX(-100%);
    }

    .sidebar-container:not(.collapsed) {
      transform: translateX(0);
    }
  }
</style>
