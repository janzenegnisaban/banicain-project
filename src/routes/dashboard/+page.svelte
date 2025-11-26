<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import { goto } from '$app/navigation';
  import { parseEvidenceEntries, parseResidentMetadata } from '$lib/utils/reportParsing';
  import type { EvidenceBuckets, ResidentMetadataResult } from '$lib/utils/reportParsing';
  import type { Report } from '$lib/types/report';
  
  export let data: {
    reports: Report[];
    source: 'supabase' | 'api';
    error?: string;
  };
  
  let currentUser: { username: string; role: string; isAuthenticated: boolean } | null = null;
  let reports: Report[] = data?.reports ?? [];
  let isLoading = reports.length === 0;
  let eventSource: EventSource | null = null;
  let activeTab = 'overview';
  let showCreateModal = false;
  let showEditModal = false;
  let showDeleteConfirm = false;
  let reportToDelete: Report | null = null;
  let editingReport: Report | null = null;
  let selectedReport: Report | null = null;
  let showReportModal = false;
  let selectedEvidence: EvidenceBuckets = { media: [], text: [] };
  let selectedResidentDetails: ResidentMetadataResult | null = null;
  type ReportViewModel = {
    base: Report;
    resident: ResidentMetadataResult;
    evidence: EvidenceBuckets;
  };
  
  // Form states
  let createForm = {
    title: '',
    type: '',
    priority: 'Medium',
    location: '',
    officer: '',
    description: '',
    damage: '',
    notes: '',
    evidence: [] as string[],
    suspects: [] as string[],
    victims: [] as string[]
  };
  
  let editForm = {
    title: '',
    type: '',
    status: 'Open',
    priority: 'Medium',
    location: '',
    officer: '',
    description: '',
    damage: '',
    notes: '',
    evidence: [] as string[],
    suspects: [] as string[],
    victims: [] as string[]
  };
  
  // Official roles that can access dashboard
  const officialRoles = ['Administrator', 'Police Officer', 'Police Chief', 'Crime Analyst'];
  
  // Check user role - only officials can access
  onMount(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        currentUser = JSON.parse(userStr);
        // Only allow officials to access dashboard
        if (!currentUser || !officialRoles.includes(currentUser.role)) {
          // If resident, redirect to residents page
          if (currentUser?.role === 'Resident') {
            goto('/residents');
            return;
          }
          // Otherwise redirect to login
          goto('/login');
          return;
        }
      } else {
        goto('/login');
        return;
      }
    } catch {
      goto('/login');
      return;
    }
    
    // Fetch initial reports if load data was empty
    if (reports.length === 0) {
      fetchReports();
    } else {
      isLoading = false;
    }
    
    // Connect to realtime stream
    connectRealtime();
  });
  
  onDestroy(() => {
    if (eventSource) {
      eventSource.close();
    }
  });
  
  async function fetchReports() {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      reports = data.reports || [];
      isLoading = false;
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      isLoading = false;
    }
  }
  
  function connectRealtime() {
    eventSource = new EventSource('/api/reports/stream');
    
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'init') {
          reports = payload.reports || [];
        } else if (payload.type === 'created') {
          reports = [payload.report, ...reports];
        } else if (payload.type === 'updated') {
          reports = reports.map(r => r.id === payload.report.id ? payload.report : r);
          if (showReportModal && selectedReport?.id === payload.report.id) {
            selectedReport = payload.report;
          }
          if (showEditModal && editingReport?.id === payload.report.id) {
            editingReport = payload.report;
          }
        } else if (payload.type === 'deleted' && payload.id) {
          reports = reports.filter(r => r.id !== payload.id);
          if (showReportModal && selectedReport?.id === payload.id) {
            closeReportModal();
          }
          if (showEditModal && editingReport?.id === payload.id) {
            closeEditModal();
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };
    
    eventSource.onerror = () => {
      // Reconnect after delay
      setTimeout(() => {
        if (eventSource) eventSource.close();
        connectRealtime();
      }, 3000);
    };
  }
  
  function getStatusStep(status: string): number {
    switch (status) {
      case 'Open': return 1;
      case 'Under Investigation': return 2;
      case 'Solved': return 3;
      default: return 1;
    }
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'Open': return 'bg-blue-500';
      case 'Under Investigation': return 'bg-yellow-500';
      case 'Solved': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  }
  
  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }
  
  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }
  
  // Statistics
  $: totalReports = reports.length;
  $: openReports = reports.filter(r => r.status === 'Open').length;
  $: investigatingReports = reports.filter(r => r.status === 'Under Investigation').length;
  $: solvedReports = reports.filter(r => r.status === 'Solved').length;
  $: criticalReports = reports.filter(r => r.priority === 'Critical').length;
  $: highPriorityReports = reports.filter(r => r.priority === 'High').length;
  $: residentReportsCount = reports.reduce((count, report) => {
    const meta = parseResidentMetadata(report.notes ?? '');
    return meta.isStructured ? count + 1 : count;
  }, 0);
  $: residentMediaCount = reports.reduce((count, report) => {
    const buckets = parseEvidenceEntries(report.evidence ?? []);
    return count + buckets.media.length;
  }, 0);
  $: solvedRate = totalReports > 0 ? ((solvedReports / totalReports) * 100).toFixed(1) : '0';
  
  // Analytics data
  $: reportsByType = reports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  $: topReportTypes = Object.entries(reportsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // CRUD Functions
  function openCreateModal() {
    createForm = {
      title: '',
      type: '',
      priority: 'Medium',
      location: '',
      officer: '',
      description: '',
      damage: '',
      notes: '',
      evidence: [],
      suspects: [],
      victims: []
    };
    showCreateModal = true;
  }
  
  function closeCreateModal() {
    showCreateModal = false;
  }
  
  async function createReport() {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      
      if (response.ok) {
        const data = await response.json();
        reports = [data.report, ...reports];
        closeCreateModal();
      } else {
        alert('Failed to create report');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Error creating report');
    }
  }
  
  function viewReport(report: Report) {
    selectedReport = report;
    showReportModal = true;
  }
  
  function closeReportModal() {
    showReportModal = false;
    selectedReport = null;
  }
  
  function openEditModal(report: Report) {
    editingReport = report;
    editForm = {
      title: report.title || '',
      type: report.type || '',
      status: report.status || 'Open',
      priority: report.priority || 'Medium',
      location: report.location || '',
      officer: report.officer || '',
      description: report.description || '',
      damage: report.damage || '',
      notes: report.notes || '',
      evidence: Array.isArray(report.evidence) ? [...report.evidence] : [],
      suspects: Array.isArray(report.suspects) ? [...report.suspects] : [],
      victims: Array.isArray(report.victims) ? report.victims : (typeof report.victims === 'string' ? [report.victims] : [])
    };
    showEditModal = true;
  }
  
  function closeEditModal() {
    showEditModal = false;
    editingReport = null;
    editForm = {
      title: '',
      type: '',
      status: 'Open',
      priority: 'Medium',
      location: '',
      officer: '',
      description: '',
      damage: '',
      notes: '',
      evidence: [],
      suspects: [],
      victims: []
    };
  }
  
  async function saveReport() {
    if (!editingReport) return;
    
    try {
      const response = await fetch(`/api/reports?id=${editingReport.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          updateNote: 'Report details updated'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        reports = reports.map(r => r.id === data.report.id ? data.report : r);
        closeEditModal();
        if (showReportModal && selectedReport?.id === editingReport.id) {
          selectedReport = data.report;
        }
      } else {
        alert('Failed to update report');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Error updating report');
    }
  }
  
  function confirmDelete(report: Report) {
    reportToDelete = report;
    showDeleteConfirm = true;
  }
  
  function cancelDelete() {
    showDeleteConfirm = false;
    reportToDelete = null;
  }
  
  async function deleteReportConfirmed() {
    if (!reportToDelete) return;
    const reportId = reportToDelete.id;
    
    try {
      const response = await fetch(`/api/reports?id=${reportId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        reports = reports.filter(r => r.id !== reportId);
        if (showReportModal && selectedReport?.id === reportId) {
          closeReportModal();
        }
        cancelDelete();
      } else {
        alert('Failed to delete report');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error deleting report');
    }
  }
  
  function addArrayItem(formType: 'create' | 'edit', arrayName: 'evidence' | 'suspects' | 'victims') {
    if (formType === 'create') {
      createForm[arrayName] = [...createForm[arrayName], ''];
    } else {
      editForm[arrayName] = [...editForm[arrayName], ''];
    }
  }
  
  function removeArrayItem(formType: 'create' | 'edit', arrayName: 'evidence' | 'suspects' | 'victims', index: number) {
    if (formType === 'create') {
      createForm[arrayName] = createForm[arrayName].filter((_, i) => i !== index);
    } else {
      editForm[arrayName] = editForm[arrayName].filter((_, i) => i !== index);
    }
  }

  $: selectedEvidence = selectedReport ? parseEvidenceEntries(selectedReport.evidence ?? []) : { media: [], text: [] };
  $: selectedResidentDetails = selectedReport ? parseResidentMetadata(selectedReport.notes ?? '') : null;
  $: reportViewModels = reports.map(report => ({
    base: report,
    resident: parseResidentMetadata(report.notes ?? ''),
    evidence: parseEvidenceEntries(report.evidence ?? [])
  }));
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 relative">
  <Sidebar />
  
  <!-- Main Content Area -->
  <div class="lg:ml-64 transition-all duration-300">
    <PageTransition duration={300} delay={100}>
      <!-- Modern Header with Glassmorphism -->
      <div class="sticky top-0 z-40 mb-8">
        <div class="bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 shadow-sm">
          <div class="p-4 lg:p-6">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 class="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
                  Official Dashboard
                </h1>
                <p class="text-gray-600 text-sm lg:text-base">Comprehensive overview and management system</p>
                {#if currentUser}
                  <div class="flex items-center gap-2 mt-2">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p class="text-sm text-gray-500">Welcome, <span class="font-semibold text-emerald-700">{currentUser.username}</span> ({currentUser.role})</p>
                  </div>
                {/if}
              </div>
              <div class="flex items-center gap-3">
                <button 
                  class="group relative bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  on:click={() => goto('/reports')}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span>Manage Reports</span>
                </button>
                <button 
                  class="group relative bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-200 hover:border-emerald-300 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md"
                  on:click={() => goto('/analytics')}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <span>View Analytics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 lg:p-6 space-y-6">

        <!-- Quick Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <div class="group relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div class="text-white/80 text-sm font-medium">Resident Reports</div>
              </div>
              <p class="text-4xl font-bold text-white mb-1">{residentReportsCount}</p>
              <p class="text-emerald-50 text-sm">Direct submissions from residents</p>
            </div>
          </div>
          
          <div class="group relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h11a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"></path>
                  </svg>
                </div>
                <div class="text-white/80 text-sm font-medium">Media Assets</div>
              </div>
              <p class="text-4xl font-bold text-white mb-1">{residentMediaCount}</p>
              <p class="text-blue-50 text-sm">Images & videos from residents</p>
            </div>
          </div>
        </div>
      
        <!-- Modern Tabs Navigation -->
        <div class="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-emerald-100/50 overflow-hidden">
          <div class="flex flex-wrap bg-gradient-to-r from-gray-50 to-emerald-50/30">
            <button
              class="relative px-6 py-4 font-semibold text-sm transition-all duration-300 {activeTab === 'overview' ? 'text-emerald-700 bg-white shadow-sm' : 'text-gray-600 hover:text-emerald-600 hover:bg-white/50'}"
              on:click={() => activeTab = 'overview'}
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Overview
              </span>
              {#if activeTab === 'overview'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              {/if}
            </button>
            <button
              class="relative px-6 py-4 font-semibold text-sm transition-all duration-300 {activeTab === 'reports' ? 'text-emerald-700 bg-white shadow-sm' : 'text-gray-600 hover:text-emerald-600 hover:bg-white/50'}"
              on:click={() => activeTab = 'reports'}
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Reports
              </span>
              {#if activeTab === 'reports'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              {/if}
            </button>
            <button
              class="relative px-6 py-4 font-semibold text-sm transition-all duration-300 {activeTab === 'analytics' ? 'text-emerald-700 bg-white shadow-sm' : 'text-gray-600 hover:text-emerald-600 hover:bg-white/50'}"
              on:click={() => activeTab = 'analytics'}
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Analytics
              </span>
              {#if activeTab === 'analytics'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              {/if}
            </button>
            <button
              class="relative px-6 py-4 font-semibold text-sm transition-all duration-300 {activeTab === 'team' ? 'text-emerald-700 bg-white shadow-sm' : 'text-gray-600 hover:text-emerald-600 hover:bg-white/50'}"
              on:click={() => activeTab = 'team'}
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                Team
              </span>
              {#if activeTab === 'team'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              {/if}
            </button>
            <button
              class="relative px-6 py-4 font-semibold text-sm transition-all duration-300 {activeTab === 'settings' ? 'text-emerald-700 bg-white shadow-sm' : 'text-gray-600 hover:text-emerald-600 hover:bg-white/50'}"
              on:click={() => activeTab = 'settings'}
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Settings
              </span>
              {#if activeTab === 'settings'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              {/if}
            </button>
          </div>
        </div>
      
      <!-- Tab Content -->
      {#if activeTab === 'overview'}
        <!-- Overview Tab -->
        <div in:fade={{ duration: 300 }}>
          <!-- Modern Statistics Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div class="group bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl border border-emerald-100/50 transition-all duration-300 transform hover:-translate-y-1">
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-gray-800 mb-1">{totalReports}</p>
              <p class="text-sm font-medium text-gray-600 mb-1">Total Reports</p>
              <p class="text-xs text-gray-500">All time records</p>
            </div>
            
            <div class="group bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl border border-blue-100/50 transition-all duration-300 transform hover:-translate-y-1">
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-blue-600 mb-1">{openReports}</p>
              <p class="text-sm font-medium text-gray-600 mb-1">Open Cases</p>
              <p class="text-xs text-gray-500">Requires attention</p>
            </div>
            
            <div class="group bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl border border-yellow-100/50 transition-all duration-300 transform hover:-translate-y-1">
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-yellow-600 mb-1">{investigatingReports}</p>
              <p class="text-sm font-medium text-gray-600 mb-1">Investigating</p>
              <p class="text-xs text-gray-500">In progress</p>
            </div>
            
            <div class="group bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl border border-emerald-100/50 transition-all duration-300 transform hover:-translate-y-1">
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-emerald-600 mb-1">{solvedReports}</p>
              <p class="text-sm font-medium text-gray-600 mb-1">Solved Cases</p>
              <p class="text-xs text-gray-500">{solvedRate}% success rate</p>
            </div>
          </div>
          
          <!-- Priority Alerts with Modern Design -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            <div class="relative bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl shadow-lg border-2 border-red-200/50 hover:border-red-300 transition-all duration-300 overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-red-200/20 rounded-full -mr-12 -mt-12"></div>
              <div class="relative z-10">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Critical Priority
                  </h3>
                  <span class="px-4 py-1.5 bg-red-500 text-white rounded-full text-sm font-bold shadow-md">{criticalReports}</span>
                </div>
                <p class="text-gray-700 text-sm font-medium">Reports requiring immediate attention</p>
              </div>
            </div>
            
            <div class="relative bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl shadow-lg border-2 border-orange-200/50 hover:border-orange-300 transition-all duration-300 overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-orange-200/20 rounded-full -mr-12 -mt-12"></div>
              <div class="relative z-10">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span class="w-2 h-2 bg-orange-500 rounded-full"></span>
                    High Priority
                  </h3>
                  <span class="px-4 py-1.5 bg-orange-500 text-white rounded-full text-sm font-bold shadow-md">{highPriorityReports}</span>
                </div>
                <p class="text-gray-700 text-sm font-medium">Reports needing prompt response</p>
              </div>
            </div>
          </div>
          
          <!-- Recent Activity with Modern Card -->
          <div class="bg-white/90 backdrop-blur-xl p-6 lg:p-8 rounded-2xl shadow-lg border border-emerald-100/50">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div class="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                Recent Activity
              </h3>
              <button class="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View All
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            {#if isLoading}
              <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <p class="mt-4 text-gray-600">Loading...</p>
              </div>
            {:else if reports.length === 0}
              <p class="text-gray-600 text-center py-8">No recent activity</p>
            {:else}
              <div class="space-y-3">
                {#each reports.slice(0, 5) as report}
                  <div class="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-emerald-50/30 rounded-xl hover:from-emerald-50 hover:to-emerald-100/50 border border-gray-100 hover:border-emerald-200 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]">
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-gray-800 mb-1">{report.id} - {report.title}</p>
                      <div class="flex items-center gap-3">
                        <span class="text-xs font-medium {report.status === 'Open' ? 'text-blue-600' : report.status === 'Under Investigation' ? 'text-yellow-600' : 'text-emerald-600'}">
                          {report.status}
                        </span>
                        <span class="text-xs text-gray-400">•</span>
                        <span class="text-xs text-gray-600">{report.priority} Priority</span>
                      </div>
                    </div>
                    <span class="px-3 py-1.5 text-xs font-semibold rounded-lg {getPriorityColor(report.priority)} shadow-sm">
                      {report.priority}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      
      {:else if activeTab === 'reports'}
        <!-- Reports Tab -->
        <div in:fade={{ duration: 300 }}>
          <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">📋 All Reports</h2>
                <p class="text-gray-600">Manage and track all crime reports</p>
              </div>
              <div class="flex items-center space-x-3">
                <button 
                  class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
                  on:click={openCreateModal}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span>Create Report</span>
                </button>
                <button 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
                  on:click={() => goto('/reports')}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span>View All Reports</span>
                </button>
              </div>
            </div>
            
            {#if isLoading}
              <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p class="mt-4 text-gray-600">Loading reports...</p>
              </div>
            {:else if reports.length === 0}
              <div class="text-center py-12">
                <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="mt-4 text-gray-600 text-lg">No reports yet</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each reportViewModels.slice(0, 10) as { base: report, resident, evidence } (report.id)}
                  <div class="bg-white rounded-xl p-6 border border-gray-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-lg" in:fly={{ y: 20, duration: 300 }}>
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                          <h3 class="text-lg font-semibold text-gray-800">{report.id} - {report.title}</h3>
                          <span class="px-3 py-1 text-xs font-medium rounded-full border {getPriorityColor(report.priority)}">
                            {report.priority}
                          </span>
                          <span class="px-3 py-1 text-xs font-medium rounded-full {report.status === 'Open' ? 'bg-blue-100 text-blue-700' : report.status === 'Under Investigation' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}">
                            {report.status}
                          </span>
                        </div>
                        
                        <p class="text-gray-600 mb-4">{report.description}</p>
                        
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="text-xs text-gray-500 mb-1">Type</div>
                            <div class="text-sm font-medium text-gray-800">{report.type}</div>
                          </div>
                          <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="text-xs text-gray-500 mb-1">Location</div>
                            <div class="text-sm font-medium text-gray-800">{report.location}</div>
                          </div>
                          <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="text-xs text-gray-500 mb-1">Date</div>
                            <div class="text-sm font-medium text-gray-800">{formatDate(report.date)}</div>
                          </div>
                          <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="text-xs text-gray-500 mb-1">Officer</div>
                            <div class="text-sm font-medium text-gray-800">{report.officer}</div>
                          </div>
                        </div>

                        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div class="text-xs text-gray-500 mb-2">Evidence Collected</div>
                            {#if evidence.text.length}
                              <div class="flex flex-wrap gap-1">
                                {#each evidence.text as item}
                                  <span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                                    {item}
                                  </span>
                                {/each}
                              </div>
                            {:else}
                              <p class="text-sm text-gray-500 italic">No text evidence listed yet.</p>
                            {/if}
                          </div>
                          <div>
                            <div class="text-xs text-gray-500 mb-2">Latest Update</div>
                            <p class="text-sm text-gray-600 italic">
                              {report.updates[report.updates.length - 1]?.note || 'No updates available'}
                            </p>
                          </div>
                        </div>

                        {#if resident.isStructured}
                          <div class="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                            <div class="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Resident Reporter</div>
                            <p class="text-sm font-semibold text-gray-800">{resident.reporter?.name || 'Anonymous Resident'}</p>
                            <p class="text-sm text-gray-600">{resident.reporter?.contact || 'No contact provided'}</p>
                            {#if resident.reporter?.address}
                              <p class="text-sm text-gray-600">{resident.reporter?.address}</p>
                            {/if}
                            {#if resident.message}
                              <p class="mt-2 text-sm text-gray-700 italic">"{resident.message}"</p>
                            {/if}
                          </div>
                        {/if}

                        {#if evidence.media.length}
                          <div class="mt-4">
                            <div class="text-xs text-gray-500 mb-2">Resident Media ({evidence.media.length})</div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {#each evidence.media as media}
                                <div class="space-y-1">
                                  {#if media.type === 'image'}
                                    <img src={media.url} alt={media.name} class="w-full h-24 object-cover rounded-lg border border-gray-100" loading="lazy" />
                                  {:else}
                                    <video src={media.url} class="w-full h-24 object-cover rounded-lg border border-gray-100" controls preload="metadata">
                                      <track kind="captions" />
                                    </video>
                                  {/if}
                                  <div class="text-xs text-gray-600 truncate">{media.name}</div>
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>
                      <div class="flex flex-col space-y-2 ml-4">
                        <button 
                          class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors" 
                          title="View Details"
                          aria-label="View report details"
                          on:click={() => viewReport(report)}
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </button>
                        <button 
                          class="text-indigo-600 hover:text-indigo-700 p-2 rounded-lg hover:bg-indigo-50 transition-colors" 
                          title="Edit Report"
                          aria-label="Edit report"
                          on:click={() => openEditModal(report)}
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button 
                          class="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" 
                          title="Delete Report"
                          aria-label="Delete report"
                          on:click={() => confirmDelete(report)}
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      
      {:else if activeTab === 'analytics'}
        <!-- Analytics Tab -->
        <div in:fade={{ duration: 300 }}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Report Status Distribution</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between mb-2">
                    <span class="text-sm text-gray-600">Open</span>
                    <span class="text-sm font-medium text-gray-800">{openReports} ({totalReports > 0 ? ((openReports / totalReports) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: {totalReports > 0 ? (openReports / totalReports) * 100 : 0}%"></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between mb-2">
                    <span class="text-sm text-gray-600">Under Investigation</span>
                    <span class="text-sm font-medium text-gray-800">{investigatingReports} ({totalReports > 0 ? ((investigatingReports / totalReports) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-yellow-600 h-2 rounded-full" style="width: {totalReports > 0 ? (investigatingReports / totalReports) * 100 : 0}%"></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between mb-2">
                    <span class="text-sm text-gray-600">Solved</span>
                    <span class="text-sm font-medium text-gray-800">{solvedReports} ({totalReports > 0 ? ((solvedReports / totalReports) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-emerald-600 h-2 rounded-full" style="width: {totalReports > 0 ? (solvedReports / totalReports) * 100 : 0}%"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Top Report Types</h3>
              {#if topReportTypes.length > 0}
                <div class="space-y-3">
                  {#each topReportTypes as [type, count]}
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">{type}</span>
                      <div class="flex items-center space-x-2">
                        <div class="w-24 bg-gray-200 rounded-full h-2">
                          <div class="bg-emerald-600 h-2 rounded-full" style="width: {(count / totalReports) * 100}%"></div>
                        </div>
                        <span class="text-sm font-medium text-gray-800 w-8">{count}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-gray-500 text-center py-4">No data available</p>
              {/if}
            </div>
          </div>
          
          <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center p-4 bg-emerald-50 rounded-lg">
                <p class="text-3xl font-bold text-emerald-600">{solvedRate}%</p>
                <p class="text-sm text-gray-600 mt-2">Solve Rate</p>
              </div>
              <div class="text-center p-4 bg-blue-50 rounded-lg">
                <p class="text-3xl font-bold text-blue-600">{criticalReports}</p>
                <p class="text-sm text-gray-600 mt-2">Critical Cases</p>
              </div>
              <div class="text-center p-4 bg-yellow-50 rounded-lg">
                <p class="text-3xl font-bold text-yellow-600">{investigatingReports}</p>
                <p class="text-sm text-gray-600 mt-2">Active Investigations</p>
              </div>
            </div>
          </div>
        </div>
      
      {:else if activeTab === 'team'}
        <!-- Team Tab -->
        <div in:fade={{ duration: 300 }}>
          <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">👥 Team Management</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                <div class="flex items-center space-x-4 mb-4">
                  <div class="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">A</span>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">Administrator</h3>
                    <p class="text-sm text-gray-600">System Admin</p>
                  </div>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Reports Managed:</span>
                    <span class="font-medium">{totalReports}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Status:</span>
                    <span class="font-medium text-emerald-600">Active</span>
                  </div>
                </div>
              </div>
              
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <div class="flex items-center space-x-4 mb-4">
                  <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">PO</span>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">Police Officers</h3>
                    <p class="text-sm text-gray-600">Field Operations</p>
                  </div>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Active Cases:</span>
                    <span class="font-medium">{investigatingReports}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Status:</span>
                    <span class="font-medium text-blue-600">Active</span>
                  </div>
                </div>
              </div>
              
              <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                <div class="flex items-center space-x-4 mb-4">
                  <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">CA</span>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">Crime Analysts</h3>
                    <p class="text-sm text-gray-600">Data Analysis</p>
                  </div>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Reports Analyzed:</span>
                    <span class="font-medium">{totalReports}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Status:</span>
                    <span class="font-medium text-purple-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 class="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div class="flex flex-wrap gap-3">
                <button class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
                  Add Team Member
                </button>
                <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  View All Members
                </button>
                <button class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  Manage Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      
      {:else if activeTab === 'settings'}
        <!-- Settings Tab -->
        <div in:fade={{ duration: 300 }}>
          <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">⚙️ System Settings</h2>
            
            <div class="space-y-6">
              <div class="border-b border-gray-200 pb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">General Settings</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-700">System Notifications</p>
                      <p class="text-sm text-gray-500">Enable email and push notifications</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="sr-only peer" checked />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-700">Auto-assign Reports</p>
                      <p class="text-sm text-gray-500">Automatically assign reports to available officers</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="sr-only peer" />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div class="border-b border-gray-200 pb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">User Preferences</h3>
                <div class="space-y-4">
                  <div>
                    <label for="default-view" class="block text-sm font-medium text-gray-700 mb-2">Default View</label>
                    <select id="default-view" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                      <option>Overview</option>
                      <option>Reports</option>
                      <option>Analytics</option>
                    </select>
                  </div>
                  
                  <div>
                    <label for="reports-per-page" class="block text-sm font-medium text-gray-700 mb-2">Reports Per Page</label>
                    <select id="reports-per-page" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                      <option>100</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
                <div class="space-y-4">
                  <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input id="username" type="text" value={currentUser?.username || ''} readonly class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" />
                  </div>
                  
                  <div>
                    <label for="role" class="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input id="role" type="text" value={currentUser?.role || ''} readonly class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" />
                  </div>
                  
                  <div class="flex space-x-3 pt-4">
                    <button class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                      Save Changes
                    </button>
                    <button class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
      </div>
    </PageTransition>
  </div>
</div>

<!-- Create Report Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Create New Report</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            on:click={closeCreateModal}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="create-title" class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input 
                id="create-title"
                type="text" 
                bind:value={createForm.title}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label for="create-type" class="block text-sm font-medium text-gray-700 mb-2">Type *</label>
              <input 
                id="create-type"
                type="text" 
                bind:value={createForm.type}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label for="create-priority" class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select 
                id="create-priority"
                bind:value={createForm.priority}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label for="create-location" class="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input 
                id="create-location"
                type="text" 
                bind:value={createForm.location}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="create-officer" class="block text-sm font-medium text-gray-700 mb-2">Officer</label>
              <input 
                id="create-officer"
                type="text" 
                bind:value={createForm.officer}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label for="create-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              id="create-description"
              bind:value={createForm.description}
              rows="4"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            ></textarea>
          </div>

          <div>
            <label for="create-damage" class="block text-sm font-medium text-gray-700 mb-2">Damage</label>
            <input 
              id="create-damage"
              type="text" 
              bind:value={createForm.damage}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="create-notes" class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea 
              id="create-notes"
              bind:value={createForm.notes}
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button 
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={closeCreateModal}
          >
            Cancel
          </button>
          <button 
            class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            on:click={createReport}
            disabled={!createForm.title || !createForm.type}
          >
            Create Report
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- View Report Modal -->
{#if showReportModal && selectedReport}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">{selectedReport.id} - {selectedReport.title}</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            on:click={closeReportModal}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Report Information</h3>
              <div class="bg-gray-50 p-4 rounded-lg space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Status:</span>
                  <span class="px-2 py-1 text-xs font-medium rounded-full {selectedReport.status === 'Open' ? 'bg-blue-100 text-blue-700' : selectedReport.status === 'Under Investigation' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}">
                    {selectedReport.status}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Priority:</span>
                  <span class="px-2 py-1 text-xs font-medium rounded-full border {getPriorityColor(selectedReport.priority)}">
                    {selectedReport.priority}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Type:</span>
                  <span class="font-medium">{selectedReport.type}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Location:</span>
                  <span class="font-medium">{selectedReport.location}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Date:</span>
                  <span class="font-medium">{formatDate(selectedReport.date)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Officer:</span>
                  <span class="font-medium">{selectedReport.officer}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Description</h3>
              <p class="text-gray-600 bg-gray-50 p-4 rounded-lg">{selectedReport.description}</p>
            </div>

            {#if selectedResidentDetails?.isStructured}
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Resident Submission</h3>
                <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-lg space-y-2">
                  <p class="text-sm text-gray-700"><span class="font-semibold">Name:</span> {selectedResidentDetails.reporter?.name || 'Anonymous Resident'}</p>
                  {#if selectedResidentDetails.reporter?.contact}
                    <p class="text-sm text-gray-700"><span class="font-semibold">Contact:</span> {selectedResidentDetails.reporter?.contact}</p>
                  {/if}
                  {#if selectedResidentDetails.reporter?.address}
                    <p class="text-sm text-gray-700"><span class="font-semibold">Address:</span> {selectedResidentDetails.reporter?.address}</p>
                  {/if}
                  {#if selectedResidentDetails.message}
                    <p class="text-sm text-gray-600 italic">"{selectedResidentDetails.message}"</p>
                  {/if}
                </div>
              </div>
            {/if}

            {#if selectedEvidence.text.length}
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Evidence</h3>
                <div class="flex flex-wrap gap-2">
                  {#each selectedEvidence.text as item}
                    <span class="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-200">
                      {item}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <div class="space-y-6">
            {#if selectedEvidence.media.length}
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Resident Media ({selectedEvidence.media.length})</h3>
                <div class="grid grid-cols-2 gap-4">
                  {#each selectedEvidence.media as media}
                    <div>
                      {#if media.type === 'image'}
                        <img src={media.url} alt={media.name} class="w-full h-32 object-cover rounded-lg border border-gray-100" loading="lazy" />
                      {:else}
                        <video src={media.url} class="w-full h-32 object-cover rounded-lg border border-gray-100" controls preload="metadata">
                          <track kind="captions" />
                        </video>
                      {/if}
                      <div class="text-xs text-gray-600 mt-1 truncate">{media.name}</div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if selectedReport.updates && selectedReport.updates.length > 0}
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Latest Updates</h3>
                <div class="space-y-3 max-h-64 overflow-y-auto">
                  {#each selectedReport.updates.slice(-5) as update}
                    <div class="bg-gray-50 p-3 rounded-lg">
                      <div class="flex justify-between items-start mb-1">
                        <span class="text-sm font-medium text-gray-700">{update.date} {update.time}</span>
                      </div>
                      <p class="text-sm text-gray-600">{update.note}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button 
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={closeReportModal}
          >
            Close
          </button>
          <button 
            class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            on:click={() => {
              if (selectedReport) {
                closeReportModal();
                openEditModal(selectedReport);
              }
            }}
          >
            Edit Report
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Report Modal -->
{#if showEditModal && editingReport}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Edit Report - {editingReport.id}</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            on:click={closeEditModal}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="edit-title" class="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input 
                id="edit-title"
                type="text" 
                bind:value={editForm.title}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="edit-type" class="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <input 
                id="edit-type"
                type="text" 
                bind:value={editForm.type}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="edit-status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                id="edit-status"
                bind:value={editForm.status}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
            <div>
              <label for="edit-priority" class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select 
                id="edit-priority"
                bind:value={editForm.priority}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label for="edit-location" class="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input 
                id="edit-location"
                type="text" 
                bind:value={editForm.location}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="edit-officer" class="block text-sm font-medium text-gray-700 mb-2">Officer</label>
              <input 
                id="edit-officer"
                type="text" 
                bind:value={editForm.officer}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label for="edit-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              id="edit-description"
              bind:value={editForm.description}
              rows="4"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            ></textarea>
          </div>

          <div>
            <label for="edit-damage" class="block text-sm font-medium text-gray-700 mb-2">Damage</label>
            <input 
              id="edit-damage"
              type="text" 
              bind:value={editForm.damage}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label for="edit-notes" class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea 
              id="edit-notes"
              bind:value={editForm.notes}
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button 
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={closeEditModal}
          >
            Cancel
          </button>
          <button 
            class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            on:click={saveReport}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && reportToDelete}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        
        <h2 class="text-2xl font-bold text-gray-800 text-center mb-2">Delete Report?</h2>
        <p class="text-gray-600 text-center mb-6">
          Are you sure you want to delete <strong>{reportToDelete.id} - {reportToDelete.title}</strong>? This action cannot be undone.
        </p>

        <div class="flex space-x-3">
          <button 
            class="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={cancelDelete}
          >
            Cancel
          </button>
          <button 
            class="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            on:click={deleteReportConfirmed}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
</style>
