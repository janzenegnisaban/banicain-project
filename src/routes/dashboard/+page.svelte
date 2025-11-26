<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import { goto } from '$app/navigation';
  import { sidebarCollapsed } from '$lib/stores/sidebar';
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
  
  // File upload for edit form
  let editAttachments: File[] = [];
  let editPreviewUrls: string[] = [];
  let editExistingEvidence: EvidenceBuckets = { media: [], text: [] };
  let editResidentMetadata: ResidentMetadataResult | null = null;
  let originalNotes: string = '';
  
  // Official roles that can access dashboard
  const officialRoles = ['Administrator', 'Police Officer', 'Police Chief', 'Crime Analyst'];
  
  // Team management state
  let showAddTeamMemberModal = false;
  let showViewAllMembersModal = false;
  let teamMembers: Array<{ id: string; username: string; email?: string; full_name?: string; role: string; is_active?: boolean; created_at?: string }> = [];
  let isLoadingTeamMembers = false;
  let isSavingTeamMember = false;
  
  // Team member form
  let teamMemberForm = {
    username: '',
    email: '',
    full_name: '',
    role: 'Police Officer',
    password: ''
  };
  
  const officialRoleOptions = ['Police Officer', 'Crime Analyst', 'Police Chief', 'Administrator'];
  
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
    
    // Initialize mock team members
    initializeMockTeamMembers();
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
    
    // Parse notes to check if it's resident metadata
    const parsedMetadata = parseResidentMetadata(report.notes ?? '');
    originalNotes = report.notes || '';
    
    // If it's structured metadata, show the message instead of JSON
    const displayNotes = parsedMetadata.isStructured 
      ? (parsedMetadata.message || parsedMetadata.rawNotes || '')
      : (report.notes || '');
    
    editForm = {
      title: report.title || '',
      type: report.type || '',
      status: report.status || 'Open',
      priority: report.priority || 'Medium',
      location: report.location || '',
      officer: report.officer || '',
      description: report.description || '',
      damage: report.damage || '',
      notes: displayNotes, // Show readable text instead of JSON
      evidence: Array.isArray(report.evidence) ? [...report.evidence] : [],
      suspects: Array.isArray(report.suspects) ? [...report.suspects] : [],
      victims: Array.isArray(report.victims) ? report.victims : (typeof report.victims === 'string' ? [report.victims] : [])
    };
    // Parse existing evidence for display
    editExistingEvidence = parseEvidenceEntries(report.evidence ?? []);
    // Store parsed metadata for saving
    editResidentMetadata = parsedMetadata;
    // Clear previous attachments
    editAttachments = [];
    editPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    editPreviewUrls = [];
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
    // Clean up preview URLs
    editPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    editAttachments = [];
    editPreviewUrls = [];
    editExistingEvidence = { media: [], text: [] };
    editResidentMetadata = null;
    originalNotes = '';
  }
  
  function handleEditFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const newFiles = Array.from(input.files);
    // Add new files to attachments
    editAttachments = [...editAttachments, ...newFiles];
    // Create preview URLs immediately
    editPreviewUrls = [...editPreviewUrls, ...newFiles.map(file => URL.createObjectURL(file))];
    
    // Reset the input so the same file can be selected again if needed
    input.value = '';
  }
  
  function removeEditAttachment(index: number) {
    URL.revokeObjectURL(editPreviewUrls[index]);
    editAttachments = editAttachments.filter((_, i) => i !== index);
    editPreviewUrls = editPreviewUrls.filter((_, i) => i !== index);
  }
  
  async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  async function saveReport() {
    if (!editingReport) return;
    
    try {
      // Process file attachments
      const attachmentDataUrls: string[] = [];
      for (const file of editAttachments) {
        const dataUrl = await readFileAsDataUrl(file);
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        attachmentDataUrls.push(JSON.stringify({
          type: fileType,
          name: file.name,
          dataUrl: dataUrl  // Use 'dataUrl' to match parser expectations
        }));
      }
      
      // Combine existing evidence (from original report) with new attachments
      // Use the original report's evidence array, not editForm.evidence which may contain parsed data
      const originalEvidence = Array.isArray(editingReport.evidence) ? [...editingReport.evidence] : [];
      const updatedEvidence = [...originalEvidence, ...attachmentDataUrls];
      
      // Handle notes: if it was originally resident metadata, update the message field
      let finalNotes = editForm.notes;
      if (editResidentMetadata?.isStructured && originalNotes) {
        try {
          // Parse the original JSON structure
          const metadata = JSON.parse(originalNotes);
          // Update only the message field, preserve the rest
          metadata.message = editForm.notes;
          finalNotes = JSON.stringify(metadata);
        } catch {
          // If parsing fails, just use the edited notes as-is
          finalNotes = editForm.notes;
        }
      }
      
      const response = await fetch(`/api/reports?id=${editingReport.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          notes: finalNotes,
          evidence: updatedEvidence,
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
  
  // Team Management Functions
  function initializeMockTeamMembers() {
    // Mock data: 3 Police Officers and 2 Crime Analysts
    teamMembers = [
      {
        id: '1',
        username: 'officer1',
        email: 'officer1@bsafe.local',
        full_name: 'Officer Michael Torres',
        role: 'Police Officer',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        username: 'officer2',
        email: 'officer2@bsafe.local',
        full_name: 'Officer Sarah Martinez',
        role: 'Police Officer',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        username: 'officer3',
        email: 'officer3@bsafe.local',
        full_name: 'Officer James Anderson',
        role: 'Police Officer',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        username: 'analyst1',
        email: 'analyst1@bsafe.local',
        full_name: 'Analyst Patricia Garcia',
        role: 'Crime Analyst',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '5',
        username: 'analyst2',
        email: 'analyst2@bsafe.local',
        full_name: 'Analyst Robert Chen',
        role: 'Crime Analyst',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }
  
  async function fetchTeamMembers() {
    isLoadingTeamMembers = true;
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.error) {
        console.error('Error fetching team members:', data.error);
        // Use mock data if API fails
        if (teamMembers.length === 0) {
          initializeMockTeamMembers();
        }
      } else {
        // Filter to only show official roles
        const apiMembers = data.filter((user: any) => 
          officialRoles.includes(user.role)
        );
        // Merge with mock data if API returns fewer members
        if (apiMembers.length > 0) {
          teamMembers = apiMembers;
        } else if (teamMembers.length === 0) {
          initializeMockTeamMembers();
        }
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      // Use mock data if fetch fails
      if (teamMembers.length === 0) {
        initializeMockTeamMembers();
      }
    } finally {
      isLoadingTeamMembers = false;
    }
  }
  
  function openAddTeamMemberModal() {
    teamMemberForm = {
      username: '',
      email: '',
      full_name: '',
      role: 'Police Officer',
      password: ''
    };
    showAddTeamMemberModal = true;
  }
  
  function closeAddTeamMemberModal() {
    showAddTeamMemberModal = false;
    teamMemberForm = {
      username: '',
      email: '',
      full_name: '',
      role: 'Police Officer',
      password: ''
    };
  }
  
  function openViewAllMembersModal() {
    showViewAllMembersModal = true;
    fetchTeamMembers();
  }
  
  // Fetch team members when Team tab is active
  $: if (activeTab === 'team' && teamMembers.length === 0) {
    fetchTeamMembers();
  }
  
  function closeViewAllMembersModal() {
    showViewAllMembersModal = false;
  }
  
  async function saveTeamMember() {
    if (isSavingTeamMember) return;
    if (!teamMemberForm.email || !teamMemberForm.username || !teamMemberForm.password) {
      alert('Email, username, and password are required');
      return;
    }
    
    if (teamMemberForm.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    isSavingTeamMember = true;
    try {
      const payload = {
        username: teamMemberForm.username,
        email: teamMemberForm.email,
        full_name: teamMemberForm.full_name || teamMemberForm.username,
        role: teamMemberForm.role,
        password: teamMemberForm.password
      };
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const newUser = await response.json();
        teamMembers = [...teamMembers, newUser];
        closeAddTeamMemberModal();
        alert('Team member created successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create team member');
      }
    } catch (error) {
      console.error('Error creating team member:', error);
      alert('Error creating team member');
    } finally {
      isSavingTeamMember = false;
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
  <div class="transition-all duration-300 {$sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80'}">
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Account Info
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
                            <div class="text-xs text-gray-500 mb-2 font-medium">Evidence Collected</div>
                            {#if evidence.media.length > 0}
                              <div class="grid grid-cols-2 gap-2">
                                {#each evidence.media.slice(0, 4) as media}
                                  <div class="relative group">
                                    {#if media.type === 'image'}
                                      <img src={media.url} alt={media.name} class="w-full h-20 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" loading="lazy" />
                                    {:else}
                                      <video src={media.url} class="w-full h-20 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" controls preload="metadata">
                                        <track kind="captions" />
                                      </video>
                                    {/if}
                                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-1.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                      <p class="truncate font-medium">{media.name}</p>
                                    </div>
                                  </div>
                                {/each}
                              </div>
                              {#if evidence.media.length > 4}
                                <p class="text-xs text-gray-500 mt-2 font-medium">+{evidence.media.length - 4} more item{evidence.media.length - 4 > 1 ? 's' : ''}</p>
                              {/if}
                            {:else if evidence.text.length}
                              <div class="flex flex-wrap gap-1">
                                {#each evidence.text as item}
                                  <span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                                    {item}
                                  </span>
                                {/each}
                              </div>
                            {:else}
                              <p class="text-sm text-gray-500 italic">No evidence collected yet.</p>
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

                        {#if evidence.media.length > 4}
                          <div class="mt-4">
                            <div class="text-xs text-gray-500 mb-2 font-medium">All Resident Media ({evidence.media.length})</div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {#each evidence.media as media}
                                <div class="relative group">
                                  {#if media.type === 'image'}
                                    <img src={media.url} alt={media.name} class="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" loading="lazy" />
                                  {:else}
                                    <video src={media.url} class="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" controls preload="metadata">
                                      <track kind="captions" />
                                    </video>
                                  {/if}
                                  <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-1.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p class="truncate font-medium">{media.name}</p>
                                  </div>
                                  <div class="text-xs text-gray-600 truncate mt-1 group-hover:hidden">{media.name}</div>
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
            
            {#if isLoadingTeamMembers}
              <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <p class="mt-4 text-gray-600">Loading team members...</p>
              </div>
            {:else if teamMembers.length === 0}
              <div class="text-center py-12">
                <p class="text-gray-600 mb-4">No team members found.</p>
                <button 
                  class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  on:click={openAddTeamMemberModal}
                >
                  Add Your First Team Member
                </button>
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {#each teamMembers as member}
                  {@const initials = member.full_name ? member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : member.username.slice(0, 2).toUpperCase()}
                  {@const isAdmin = member.role === 'Administrator'}
                  {@const isOfficer = member.role === 'Police Officer' || member.role === 'Police Chief'}
                  {@const isAnalyst = member.role === 'Crime Analyst'}
                  <div class="p-6 rounded-xl border {isAdmin ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : isOfficer ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}">
                    <div class="flex items-center space-x-4 mb-4">
                      <div class="w-12 h-12 rounded-full flex items-center justify-center {isAdmin ? 'bg-emerald-500' : isOfficer ? 'bg-blue-500' : 'bg-purple-500'}">
                        <span class="text-white font-bold">{initials}</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-800 truncate">{member.full_name || member.username}</h3>
                        <p class="text-sm text-gray-600 truncate">{member.role}</p>
                      </div>
                    </div>
                    <div class="space-y-2 text-sm">
                      {#if member.email}
                        <div class="flex justify-between">
                          <span class="text-gray-600">Email:</span>
                          <span class="font-medium text-gray-800 truncate ml-2" title={member.email}>{member.email}</span>
                        </div>
                      {/if}
                      <div class="flex justify-between">
                        <span class="text-gray-600">Status:</span>
                        {#if member.is_active !== false}
                          <span class="font-medium {isAdmin ? 'text-emerald-600' : isOfficer ? 'text-blue-600' : 'text-purple-600'}">Active</span>
                        {:else}
                          <span class="font-medium text-red-600">Inactive</span>
                        {/if}
                      </div>
                      {#if member.created_at}
                        <div class="flex justify-between">
                          <span class="text-gray-600">Joined:</span>
                          <span class="font-medium text-gray-800">{new Date(member.created_at).toLocaleDateString()}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
            
            <div class="p-6 bg-gray-50 rounded-xl">
              <h3 class="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div class="flex flex-wrap gap-3">
                <button 
                  class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  on:click={openAddTeamMemberModal}
                >
                  Add Team Member
                </button>
                <button 
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  on:click={openViewAllMembersModal}
                >
                  View All Members
                </button>
              </div>
            </div>
          </div>
        </div>
      
      {:else if activeTab === 'settings'}
        <!-- Account Info Tab -->
        <div in:fade={{ duration: 300 }}>
          <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
            <div class="mb-8">
              <h2 class="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">Account Information</h2>
              <p class="text-gray-600">View and manage your account details</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Profile Card -->
              <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                <div class="flex items-center space-x-4 mb-6">
                  <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span class="text-white text-2xl font-bold">
                      {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 class="text-xl font-bold text-gray-800">{currentUser?.username || 'User'}</h3>
                    <p class="text-sm text-gray-600">{currentUser?.role || 'No role assigned'}</p>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span class="text-sm font-medium text-gray-600">Account Status</span>
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                      {currentUser?.isAuthenticated ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Account Details Card -->
              <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Account Details
                </h3>
                <div class="space-y-4">
                  <div>
                    <div class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Username</div>
                    <div class="text-base font-semibold text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">
                      {currentUser?.username || 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <div class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Role</div>
                    <div class="text-base font-semibold text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">
                      {currentUser?.role || 'N/A'}
                    </div>
                  </div>
                  
                  {#if currentUser?.isAuthenticated !== undefined}
                    <div>
                      <div class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</div>
                      <div class="text-base font-semibold text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">
                        {currentUser.isAuthenticated ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  {/if}
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

            {#if selectedEvidence.text.length > 0 && selectedEvidence.media.length === 0}
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Text Evidence</h3>
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
            <label for="edit-notes" class="block text-sm font-medium text-gray-700 mb-2">
              Notes
              {#if editResidentMetadata?.isStructured}
                <span class="text-xs text-emerald-600 font-normal ml-2">(Resident submission - editing message)</span>
              {:else}
                <span class="text-xs text-gray-500 font-normal ml-2">(Add any additional information or updates about this report)</span>
              {/if}
            </label>
            <textarea 
              id="edit-notes"
              bind:value={editForm.notes}
              rows="6"
              placeholder="Enter notes here... Use clear, simple language that anyone can understand."
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base leading-relaxed resize-y"
            ></textarea>
            <p class="mt-2 text-xs text-gray-500">Tip: Write in plain language. Avoid technical jargon.</p>
          </div>
          
          <!-- Existing Evidence Section -->
          {#if editExistingEvidence.media.length > 0}
            <div class="mb-6">
              <div class="flex items-center justify-between mb-3">
                <div class="block text-sm font-medium text-gray-700">
                  Existing Evidence ({editExistingEvidence.media.length})
                </div>
                <span class="text-xs text-gray-500">Current attachments</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                {#each editExistingEvidence.media as media, index}
                  <div class="relative group">
                    {#if media.type === 'image'}
                      <img src={media.url} alt={media.name} class="w-full h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm hover:border-gray-400 transition-all" loading="lazy" />
                    {:else}
                      <video src={media.url} class="w-full h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm hover:border-gray-400 transition-all" controls preload="metadata">
                        <track kind="captions" />
                      </video>
                    {/if}
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/70 to-transparent text-white text-xs p-2 rounded-b-lg">
                      <p class="truncate font-medium" title={media.name}>{media.name}</p>
                      {#if media.size}
                        <p class="text-xs text-gray-300 mt-0.5">{(media.size / 1024).toFixed(1)} KB</p>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          <!-- File Upload Section -->
          <div>
            <div class="block text-sm font-medium text-gray-700 mb-2">
              Upload New Files or Videos
              <span class="text-xs text-gray-500 font-normal ml-2">(Add additional photos or videos related to this report)</span>
            </div>
            <div class="mt-2">
              <label for="edit-file-upload" class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg class="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">Click to upload</span> or drag and drop</p>
                  <p class="text-xs text-gray-500">Images or Videos (PNG, JPG, MP4, MOV)</p>
                </div>
                <input 
                  id="edit-file-upload"
                  type="file" 
                  accept="image/*,video/*"
                  multiple
                  class="hidden"
                  on:change={handleEditFilesSelected}
                />
              </label>
            </div>
            
            {#if editPreviewUrls.length > 0}
              <div class="mt-4">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm font-medium text-gray-700">
                    New Files Selected ({editPreviewUrls.length})
                  </p>
                  <span class="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">Pending</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-emerald-50/30 rounded-lg border-2 border-emerald-200 border-dashed">
                  {#each editPreviewUrls as url, index}
                    <div class="relative group">
                      {#if editAttachments[index].type.startsWith('image/')}
                        <img src={url} alt={editAttachments[index].name} class="w-full h-32 object-cover rounded-lg border-2 border-emerald-400 shadow-md hover:shadow-lg transition-all" />
                      {:else}
                        <video src={url} class="w-full h-32 object-cover rounded-lg border-2 border-emerald-400 shadow-md hover:shadow-lg transition-all" controls preload="metadata">
                          <track kind="captions" />
                        </video>
                      {/if}
                      <button
                        type="button"
                        class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all hover:scale-110 z-10"
                        on:click={() => removeEditAttachment(index)}
                        aria-label="Remove attachment"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/75 to-transparent text-white text-xs p-2 rounded-b-lg">
                        <p class="truncate font-semibold" title={editAttachments[index].name}>{editAttachments[index].name}</p>
                        <p class="text-xs text-gray-200 mt-0.5">{(editAttachments[index].size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  {/each}
                </div>
                <div class="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p class="font-medium">These files will be added when you save changes</p>
                </div>
              </div>
            {/if}
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

<!-- Add Team Member Modal -->
{#if showAddTeamMemberModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Add Team Member</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            on:click={closeAddTeamMemberModal}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <form on:submit|preventDefault={saveTeamMember} class="space-y-6">
          <div>
            <label for="team-username" class="block text-sm font-medium text-gray-700 mb-2">Username *</label>
            <input
              id="team-username"
              type="text"
              bind:value={teamMemberForm.username}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div>
            <label for="team-email" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              id="team-email"
              type="email"
              bind:value={teamMemberForm.email}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div>
            <label for="team-fullname" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              id="team-fullname"
              type="text"
              bind:value={teamMemberForm.full_name}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter full name"
            />
          </div>
          
          <div>
            <label for="team-role" class="block text-sm font-medium text-gray-700 mb-2">Role *</label>
            <select
              id="team-role"
              bind:value={teamMemberForm.role}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            >
              {#each officialRoleOptions as role}
                <option value={role}>{role}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label for="team-password" class="block text-sm font-medium text-gray-700 mb-2">Password *</label>
            <input
              id="team-password"
              type="password"
              bind:value={teamMemberForm.password}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter password (min 8 characters)"
              required
              minlength="8"
            />
            <p class="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              class="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              on:click={closeAddTeamMemberModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSavingTeamMember}
            >
              {isSavingTeamMember ? 'Creating...' : 'Create Team Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- View All Members Modal -->
{#if showViewAllMembersModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">All Team Members</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            on:click={closeViewAllMembersModal}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {#if isLoadingTeamMembers}
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p class="mt-4 text-gray-600">Loading team members...</p>
          </div>
        {:else if teamMembers.length === 0}
          <div class="text-center py-12">
            <p class="text-gray-600">No team members found.</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each teamMembers as member}
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold text-lg">
                      {member.full_name ? member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : member.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{member.full_name || member.username}</h3>
                    <p class="text-sm text-gray-600">{member.email || 'No email'}</p>
                    <p class="text-xs text-gray-500 mt-1">
                      <span class="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {member.role}
                      </span>
                      {#if member.is_active !== false}
                        <span class="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full ml-2">
                          Active
                        </span>
                      {:else}
                        <span class="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full ml-2">
                          Inactive
                        </span>
                      {/if}
                    </p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
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
