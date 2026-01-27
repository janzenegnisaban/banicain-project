<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import type { Report } from '$lib/types/report';
  import { supabase } from '$lib/supabaseClient';
  import { generateId } from '$lib/utils/id';

  let currentUser: { id: string; username?: string; role?: string } | null = null;
  let isAuthChecked = false;
  let myReports: Report[] = [];
  let myReportsLoading = false;
  let myReportsError = '';
  let searchTerm = '';
  let expandedReports = new Set<string>();

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(init.headers ?? {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  }

  function isAuthenticatedResident(): boolean {
    return currentUser?.role === 'Resident' && !!currentUser?.id;
  }

  function hydrateUser() {
    try {
      const rawUser = localStorage.getItem('user');
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      if (parsed && parsed.role === 'Resident') {
        if (!parsed.id) {
          parsed.id = generateId('resident');
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        currentUser = parsed;
      } else {
        currentUser = null;
      }
    } catch {
      currentUser = null;
    } finally {
      isAuthChecked = true;
    }
  }

  async function fetchMyReports(userId: string) {
    myReportsLoading = true;
    myReportsError = '';
    try {
      const response = await authorizedFetch(`/api/reports?reporterId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error('Failed to load reports');
      const data = await response.json();
      myReports = Array.isArray(data.reports) ? data.reports : [];
    } catch (error) {
      console.error('Failed to fetch resident reports:', error);
      myReportsError = 'Unable to load your reports right now.';
    } finally {
      myReportsLoading = false;
    }
  }

  function formatReportId(id: string | null | undefined): string {
    if (!id) return 'N/A';
    if (id.includes('RPT-') && id.length <= 11) return id;
    return id.length > 6 ? `...${id.slice(-6)}` : id;
  }

  function formatDate(value?: string) {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }

  function getStatusBadgeClasses(status: Report['status']) {
    switch (status) {
      case 'Pending Confirmation':
        return 'bg-amber-400/20 border border-amber-300/40 text-slate-900';
      case 'Solved':
        return 'bg-emerald-400/20 border border-emerald-300/40 text-slate-900';
      case 'Under Investigation':
        return 'bg-amber-400/20 border border-amber-300/40 text-slate-900';
      default:
        return 'bg-blue-400/20 border border-blue-300/40 text-slate-900';
    }
  }

  function getStatusStep(status: Report['status']) {
    switch (status) {
      case 'Pending Confirmation':
        return 1;
      case 'Open':
        return 2;
      case 'Under Investigation':
        return 3;
      case 'Solved':
        return 4;
      default:
        return 1;
    }
  }

  function getLatestUpdate(report: Report) {
    const updates = Array.isArray(report.updates) ? report.updates : [];
    if (updates.length === 0) return null;
    return updates[updates.length - 1];
  }

  function toggleTimeline(reportId: string) {
    const next = new Set(expandedReports);
    if (next.has(reportId)) {
      next.delete(reportId);
    } else {
      next.add(reportId);
    }
    expandedReports = next;
  }

  $: totalReports = myReports.length;
  $: pendingReports = myReports.filter(r => r.status === 'Pending Confirmation').length;
  $: openReports = myReports.filter(r => r.status === 'Open').length;
  $: investigatingReports = myReports.filter(r => r.status === 'Under Investigation').length;
  $: solvedReports = myReports.filter(r => r.status === 'Solved').length;
  $: normalizedSearch = searchTerm.trim().toLowerCase();
  $: filteredReports = normalizedSearch
    ? myReports.filter(report => {
        const haystack = [
          report.title,
          report.type,
          report.location,
          report.description
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : myReports;

  onMount(() => {
    hydrateUser();
    if (currentUser?.id) {
      fetchMyReports(currentUser.id);
    }
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
  <PageTransition duration={300} delay={100}>
    <div class="max-w-5xl mx-auto px-4 py-10">
      <div class="bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 p-8 rounded-2xl shadow-2xl mb-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-80 h-80 -mt-16 -mr-16 bg-emerald-400 opacity-20 rounded-full blur-3xl animate-float"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 -mb-12 -ml-12 bg-teal-400 opacity-20 rounded-full blur-3xl animate-float" style="animation-delay: 1s;"></div>
        <div class="relative z-10">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">Resident Dashboard</h1>
              <p class="text-emerald-100">Track your submitted reports and their progress.</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                on:click={() => goto('/residents')}
                class="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105"
              >
                Back to Report Form
              </button>
              {#if isAuthenticatedResident()}
                <button
                  on:click={() => currentUser?.id && fetchMyReports(currentUser.id)}
                  class="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105"
                >
                  Refresh
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>

      {#if !isAuthChecked}
        <p class="text-slate-500">Checking your account…</p>
      {:else if !isAuthenticatedResident()}
        <div class="p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-sm">
          <div class="flex flex-col items-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-white mb-2">Sign in to view your report history</h3>
              <p class="text-slate-300 mb-6 max-w-md">
                Only signed-in residents can access report history. Guest submissions remain anonymous.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                on:click={() => goto('/login?role=resident')}
              >
                Sign In
              </button>
              <button
                type="button"
                class="px-6 py-3 bg-white/10 border-2 border-white/30 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300"
                on:click={() => goto('/signup?role=resident')}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      {:else if myReportsLoading}
        <div class="flex items-center space-x-3 text-slate-600">
          <div class="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading your reports…</span>
        </div>
      {:else if myReportsError}
        <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-300/40 text-sm text-rose-600">{myReportsError}</div>
      {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <div class="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-400">Total Reports</p>
            <p class="text-2xl font-semibold text-slate-900 mt-2">{totalReports}</p>
          </div>
          <div class="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-400">Pending</p>
            <p class="text-2xl font-semibold text-slate-900 mt-2">{pendingReports}</p>
          </div>
          <div class="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-400">Open</p>
            <p class="text-2xl font-semibold text-slate-900 mt-2">{openReports}</p>
          </div>
          <div class="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-400">Investigating</p>
            <p class="text-2xl font-semibold text-slate-900 mt-2">{investigatingReports}</p>
          </div>
          <div class="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-400">Solved</p>
            <p class="text-2xl font-semibold text-slate-900 mt-2">{solvedReports}</p>
          </div>
        </div>

        <div class="mb-4 rounded-2xl border border-white/40 bg-white/80 p-4">
          <label for="report-search" class="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">
            Search Reports
          </label>
          <input
            id="report-search"
            type="text"
            bind:value={searchTerm}
            placeholder="Search by title, type, or location..."
            class="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div class="mb-4 rounded-2xl border border-white/40 bg-white/70 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 mb-3">Status Legend</p>
          <div class="flex flex-wrap gap-2 text-xs font-semibold">
            <span class={`px-3 py-1 rounded-full border ${getStatusBadgeClasses('Pending Confirmation')}`}>Pending Confirmation</span>
            <span class={`px-3 py-1 rounded-full border ${getStatusBadgeClasses('Open')}`}>Open</span>
            <span class={`px-3 py-1 rounded-full border ${getStatusBadgeClasses('Under Investigation')}`}>Under Investigation</span>
            <span class={`px-3 py-1 rounded-full border ${getStatusBadgeClasses('Solved')}`}>Solved</span>
          </div>
        </div>
        {#if filteredReports.length === 0}
        <div class="p-6 rounded-2xl border border-white/10 bg-white/70 text-slate-600">
          {#if totalReports === 0}
            You have not submitted any reports yet.
          {:else}
            No reports match your search.
          {/if}
        </div>
        {:else}
        <div class="space-y-6">
          {#each filteredReports as report (report.id)}
            {@const latestUpdate = getLatestUpdate(report)}
            {@const currentStep = getStatusStep(report.status)}
            <div class="rounded-2xl border border-white/40 bg-white/80 p-6 shadow-lg">
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Report #{formatReportId(report.shortId || report.id)}</p>
                  <p class="text-2xl font-semibold text-slate-800 mt-1">{report.title}</p>
                  <p class="text-sm text-slate-500">Filed {formatDate(report.date)} {report.time ? `at ${report.time}` : ''}</p>
                </div>
                <span class={`px-3 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeClasses(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <p class="text-sm text-slate-700 mt-4">{report.description}</p>
              <div class="mt-4 text-sm text-slate-700">
                <span class="font-semibold text-slate-900">Latest update:</span>
                {#if latestUpdate}
                  <span class="ml-2">{latestUpdate.note || 'Update added'}</span>
                {:else}
                  <span class="ml-2 text-slate-500">No updates yet.</span>
                {/if}
              </div>
              <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">Progress</p>
                <div class="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  {#each ['Pending', 'Open', 'Investigating', 'Solved'] as step, index}
                    <div class={`flex items-center gap-2 ${index + 1 <= currentStep ? 'text-slate-900' : 'text-slate-400'}`}>
                      <span class={`w-3 h-3 rounded-full border ${index + 1 <= currentStep ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}></span>
                      <span>{step}</span>
                    </div>
                    {#if index < 3}
                      <span class="text-slate-300">→</span>
                    {/if}
                  {/each}
                </div>
              </div>
              <div class="mt-4 text-xs text-slate-500">
                Location: {report.location || 'Resident provided location'}
              </div>
              <div class="mt-4">
                <button
                  type="button"
                  class="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  on:click={() => toggleTimeline(report.id)}
                >
                  {expandedReports.has(report.id) ? 'Hide timeline' : 'View timeline'}
                </button>
              </div>
              {#if expandedReports.has(report.id)}
                <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-3">Update Timeline</p>
                  {#if Array.isArray(report.updates) && report.updates.length > 0}
                    <div class="space-y-3 text-sm text-slate-700">
                      {#each report.updates as update, idx (idx)}
                        <div class="flex items-start gap-3">
                          <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                          <div>
                            <p class="font-semibold text-slate-900">{update.note || 'Update added'}</p>
                            <p class="text-xs text-slate-500">{formatDate(update.date)}</p>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-sm text-slate-500">No updates yet.</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
        {/if}
      {/if}
    </div>
  </PageTransition>
</div>
