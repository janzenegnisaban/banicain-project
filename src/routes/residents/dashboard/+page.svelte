<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import ResidentAppBar from '$lib/components/ResidentAppBar.svelte';
  import PriorityBadge from '$lib/components/PriorityBadge.svelte';
  import ResidentCaseTracker from '$lib/components/ResidentCaseTracker.svelte';
  import type { Report } from '$lib/types/report';
  import type { SessionUser } from '$lib/types/user';
  import { authorizedFetch as authFetch, hydrateSession } from '$lib/utils/auth';

  let currentUser: SessionUser | null = null;
  let isAuthChecked = false;
  let myReports: Report[] = [];
  let myReportsLoading = false;
  let myReportsError = '';
  let searchTerm = '';
  let reportsPollId: number | null = null;

  function isAuthenticatedResident(): boolean {
    return currentUser?.role === 'Resident' && !!currentUser?.id;
  }

  async function fetchMyReports(userId: string, silent = false) {
    if (!silent) {
      myReportsLoading = true;
      myReportsError = '';
    }
    try {
      const response = await authFetch(`/api/reports?reporterId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error('Failed to load reports');
      const data = await response.json();
      myReports = Array.isArray(data.reports) ? data.reports : [];
    } catch (error) {
      console.error('Failed to fetch resident reports:', error);
      if (!silent) myReportsError = 'Unable to load your reports right now.';
    } finally {
      if (!silent) myReportsLoading = false;
    }
  }

  function startReportsPolling(userId: string) {
    if (reportsPollId) clearInterval(reportsPollId);
    reportsPollId = window.setInterval(() => fetchMyReports(userId, true), 30000);
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
        return 'bg-amber-100 border border-amber-200 text-amber-800';
      case 'Solved':
        return 'bg-emerald-100 border border-emerald-200 text-emerald-800';
      case 'Under Investigation':
        return 'bg-yellow-100 border border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-100 border border-blue-200 text-blue-800';
    }
  }

  $: totalReports = myReports.length;
  $: pendingReports = myReports.filter((r) => r.status === 'Pending Confirmation').length;
  $: openReports = myReports.filter((r) => r.status === 'Open').length;
  $: investigatingReports = myReports.filter((r) => r.status === 'Under Investigation').length;
  $: solvedReports = myReports.filter((r) => r.status === 'Solved').length;
  $: normalizedSearch = searchTerm.trim().toLowerCase();
  $: filteredReports = normalizedSearch
    ? myReports.filter((report) => {
        const haystack = [report.title, report.type, report.location, report.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : myReports;

  onMount(async () => {
    currentUser = await hydrateSession();
    isAuthChecked = true;
    if (currentUser?.role === 'Resident' && currentUser.id) {
      fetchMyReports(currentUser.id);
      startReportsPolling(currentUser.id);
    }
  });

  onDestroy(() => {
    if (reportsPollId) clearInterval(reportsPollId);
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
  <PageTransition duration={300} delay={100}>
    <div class="max-w-5xl mx-auto px-4 py-10">
      <ResidentAppBar
        title="My Reports"
        subtitle="Track your submitted reports and their progress."
        {currentUser}
        isGuest={!isAuthenticatedResident()}
        showClock={false}
      >
        <svelte:fragment slot="actions">
          <button
            type="button"
            on:click={() => goto('/residents')}
            class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-all"
          >
            New Report
          </button>
          <button
            type="button"
            on:click={() => currentUser?.id && fetchMyReports(currentUser.id)}
            class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-all"
          >
            Refresh
          </button>
        </svelte:fragment>
      </ResidentAppBar>

      {#if !isAuthChecked}
        <p class="text-slate-500">Checking your account…</p>
      {:else if !isAuthenticatedResident()}
        <div class="p-8 rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div class="flex flex-col items-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Sign in to view your report history</h3>
              <p class="text-gray-600 mb-6 max-w-md">
                Only signed-in residents can access report history. Guest submissions remain anonymous.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                on:click={() => goto('/login?role=resident')}
              >
                Sign In
              </button>
              <button
                type="button"
                class="px-6 py-3 bg-white border-2 border-emerald-200 hover:border-emerald-300 text-emerald-700 font-semibold rounded-xl transition-all"
                on:click={() => goto('/signup')}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      {:else if myReportsLoading}
        <div class="flex items-center space-x-3 text-slate-600 bg-white/80 rounded-2xl p-6 border border-white/50">
          <div class="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading your reports…</span>
        </div>
      {:else if myReportsError}
        <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{myReportsError}</div>
      {:else}
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-6">
          {#each [
            { label: 'Total', value: totalReports },
            { label: 'Pending', value: pendingReports },
            { label: 'Open', value: openReports },
            { label: 'Investigating', value: investigatingReports },
            { label: 'Solved', value: solvedReports }
          ] as stat}
            <div class="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p class="text-2xl font-semibold text-slate-900 mt-2">{stat.value}</p>
            </div>
          {/each}
        </div>

        <div class="mb-4 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm">
          <label for="report-search" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Search Reports
          </label>
          <input
            id="report-search"
            type="text"
            bind:value={searchTerm}
            placeholder="Search by title, type, or location..."
            class="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {#if filteredReports.length === 0}
          <div class="p-8 rounded-2xl border border-dashed border-emerald-200 bg-white/70 text-center">
            <p class="text-gray-600 mb-4">
              {totalReports === 0 ? 'You have not submitted any reports yet.' : 'No reports match your search.'}
            </p>
            {#if totalReports === 0}
              <button
                type="button"
                class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                on:click={() => goto('/residents')}
              >
                Submit your first report
              </button>
            {/if}
          </div>
        {:else}
          <div class="space-y-4">
            {#each filteredReports as report (report.id)}
              <article class="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0 flex-1">
                    <h2 class="text-xl font-semibold text-slate-800">{report.title}</h2>
                    <p class="text-xs text-slate-400 mt-1">Ref {formatReportId(report.shortId || report.id)}</p>
                    <p class="text-sm text-slate-500 mt-1">
                      Filed {formatDate(report.date)}{report.time ? ` at ${report.time}` : ''}
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 self-start">
                    <PriorityBadge priority={report.priority} size="sm" />
                    <span class={`px-3 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeClasses(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                </div>

                <p class="text-sm text-slate-700 mt-4 line-clamp-2">{report.description}</p>

                <div class="mt-4">
                  <ResidentCaseTracker {report} variant="dashboard" defaultExpanded={false} />
                </div>
              </article>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </PageTransition>
</div>
