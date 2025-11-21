<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import type { Report } from '$lib/server/reportsStore';
  import { generateId } from '$lib/utils/id';
  import {
    buildResidentMetadata,
    createMediaAttachmentPayload,
    serializeMediaAttachment,
    summarizeMediaAttachment
  } from '$lib/utils/reportParsing';

  let name = '';
  let address = '';
  let contacts = '';
  let notes = '';
  let typeOfReport = '';
  let attachments: File[] = [];
  let previewUrls: string[] = [];
  let isSubmitting = false;
  let submitted = false;
  let submitError = '';
  let submissionSummary: { attachments: number; submittedAt: string } | null = null;
  const autosaveKey = 'residentReportDraft';
  let autosaveId: number | null = null;
  let now: Date = new Date();
  let nowTimerId: number | null = null;
  let currentUser: { id: string; username?: string; role?: string } | null = null;
  let isAuthChecked = false;
  let myReports: Report[] = [];
  let myReportsLoading = false;
  let myReportsError = '';
  let myReportsStream: EventSource | null = null;

  const reportTypes = [
    'Theft', 
    'Fraud', 
    'Violence', 
    'Burglary', 
    'Vandalism',
    'Accident',
    'Fire Related',
    'Domestic Dispute',
    'Noise Complaint',
    'Public Disturbance',
    'Traffic Incident',
    'Suspicious Activity',
    'Missing Person',
    'Drug Related',
    'Medical Emergency',
    'Animal Control',
    'Environmental Issue'
  ];

  function handleFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    attachments = Array.from(input.files);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = attachments.map(file => URL.createObjectURL(file));
  }

  function removeAttachment(index: number) {
    const [removed] = attachments.splice(index, 1);
    if (previewUrls[index]) URL.revokeObjectURL(previewUrls[index]);
    previewUrls.splice(index, 1);
  }

  function resetForm() {
    name = '';
    address = '';
    contacts = '';
    notes = '';
    typeOfReport = '';
    attachments = [];
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    submitError = '';
    // Also clear draft
    localStorage.removeItem(autosaveKey);
  }

  function getStatusBadgeClasses(status: Report['status']) {
    switch (status) {
      case 'Solved':
        return 'bg-emerald-100 text-emerald-700';
      case 'Under Investigation':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  }

  function getPriorityBadgeClasses(priority: Report['priority']) {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-700';
      case 'High':
        return 'bg-orange-100 text-orange-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Unable to read attachment.'));
      reader.readAsDataURL(file);
    });
  }

  onMount(() => {
    // Real-time date/time
    nowTimerId = window.setInterval(() => {
      now = new Date();
    }, 1000);

    // Load draft if exists
    try {
      const saved = localStorage.getItem(autosaveKey);
      if (saved) {
        const draft = JSON.parse(saved);
        name = draft.name || '';
        address = draft.address || '';
        contacts = draft.contacts || '';
        notes = draft.notes || '';
        typeOfReport = draft.typeOfReport || '';
      }
    } catch {}

    // Autosave every 5s
    autosaveId = window.setInterval(() => {
      const draft = { name, address, contacts, notes, typeOfReport };
      localStorage.setItem(autosaveKey, JSON.stringify(draft));
    }, 5000);

    initializeResidentSession();
  });

  onDestroy(() => {
    if (nowTimerId) clearInterval(nowTimerId);
    if (autosaveId) clearInterval(autosaveId);
    if (myReportsStream) {
      myReportsStream.close();
      myReportsStream = null;
    }
  });

  async function submitReport() {
    if (isSubmitting) return;
    if (!currentUser?.id) {
      submitError = 'Please sign in as a resident to submit a report.';
      goto('/login?role=resident');
      return;
    }
    submitError = '';
    isSubmitting = true;

    try {
      const attachmentPayloads = await Promise.all(
        attachments.map(async (file, index) => {
          const dataUrl = await readFileAsDataUrl(file);
          return createMediaAttachmentPayload({
            id: `resident-${Date.now()}-${index}`,
            name: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            dataUrl,
            size: file.size
          });
        })
      );

      const metadata = buildResidentMetadata({
        reporter: {
          name,
          address,
          contact: contacts,
          typeOfReport
        },
        message: notes,
        attachments: attachmentPayloads.map(summarizeMediaAttachment)
      });

      const payload = {
        title: typeOfReport
          ? `${typeOfReport} - ${name || 'Resident'}`
          : `Community Report - ${name || 'Resident'}`,
        type: typeOfReport || 'Incident',
        priority: 'High',
        location: address || 'Resident provided location',
        description: notes || 'Resident-submitted incident report.',
        damage: 'Resident Submission',
        notes: metadata,
        evidence: attachmentPayloads.map(serializeMediaAttachment),
        reporterId: currentUser.id
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send report');
      }

      const summary = {
        attachments: attachmentPayloads.length,
        submittedAt: new Date().toLocaleString()
      };

      resetForm();
      submissionSummary = summary;
      submitted = true;
      await fetchMyReports(currentUser.id);
    } catch (error) {
      console.error(error);
      submitError = 'Unable to submit your report right now. Please try again in a moment.';
    } finally {
      isSubmitting = false;
    }
  }

  function initializeResidentSession() {
    try {
      const rawUser = localStorage.getItem('user');
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      if (!parsed || parsed.role !== 'Resident') {
        goto('/login?role=resident');
        return;
      }
      if (!parsed.id) {
        parsed.id = generateId('resident');
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      currentUser = parsed;
      isAuthChecked = true;
      fetchMyReports(parsed.id);
      subscribeToMyReports(parsed.id);
    } catch {
      goto('/login?role=resident');
    }
  }

  async function fetchMyReports(userId: string) {
    myReportsLoading = true;
    myReportsError = '';
    try {
      const response = await fetch(`/api/reports?reporterId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error('Failed to load reports');
      }
      const data = await response.json();
      myReports = Array.isArray(data.reports) ? data.reports : [];
    } catch (error) {
      console.error('Failed to fetch resident reports:', error);
      myReportsError = 'Unable to load your reports right now.';
    } finally {
      myReportsLoading = false;
    }
  }

  function subscribeToMyReports(userId: string) {
    if (typeof window === 'undefined') return;
    if (myReportsStream) {
      myReportsStream.close();
    }
    const stream = new EventSource('/api/reports/stream');
    stream.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'init' && Array.isArray(payload.reports)) {
          myReports = payload.reports.filter((report: Report) => report.reporterId === userId);
        } else if (payload?.report && payload.report.reporterId === userId) {
          upsertMyReport(payload.report as Report);
        } else if (payload?.type === 'deleted' && payload.id) {
          myReports = myReports.filter(report => report.id !== payload.id);
        }
      } catch (error) {
        console.error('Failed to parse SSE payload:', error);
      }
    };
    stream.onerror = () => {
      stream.close();
      myReportsStream = null;
    };
    myReportsStream = stream;
  }

  function upsertMyReport(report: Report) {
    const index = myReports.findIndex(r => r.id === report.id);
    if (index >= 0) {
      myReports = [
        ...myReports.slice(0, index),
        report,
        ...myReports.slice(index + 1)
      ];
    } else {
      myReports = [report, ...myReports];
    }
  }

  function latestUpdateNote(report: Report) {
    if (!report.updates || report.updates.length === 0) return 'No updates yet.';
    return report.updates[report.updates.length - 1]?.note ?? 'No updates yet.';
  }

  function formatDateTime(date: Date) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'long', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  }

</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
  <PageTransition duration={300} delay={100}>
  <div class="max-w-5xl mx-auto px-4 py-10">
    <div class="bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 p-8 rounded-2xl shadow-2xl mb-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-80 h-80 -mt-16 -mr-16 bg-emerald-400 opacity-20 rounded-full blur-3xl animate-float"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 -mb-12 -ml-12 bg-teal-400 opacity-20 rounded-full blur-3xl animate-float" style="animation-delay: 1s;"></div>
      <div class="relative z-10">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-white mb-2">Resident Report</h1>
            <p class="text-emerald-100">Submit a new incident report to your Barangay officials</p>
            <div class="mt-3 text-white/90 text-sm">Current: {formatDateTime(now)}</div>
          </div>
          <button
            on:click={() => goto('/')}
            class="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105"
            aria-label="Back to home"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span class="font-medium">Home</span>
          </button>
        </div>
      </div>
    </div>

    {#if !submitted}
      <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50" in:fly={{ y: 20, duration: 300 }}>
        <h2 class="text-xl font-bold text-gray-800 mb-6">Details</h2>

        {#if submitError}
          <div class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        {/if}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">Report Time</label>
            <input type="text" value={formatDateTime(now)} readonly class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input type="text" bind:value={name} placeholder="Your full name" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input type="text" bind:value={address} placeholder="Your address" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Contacts</label>
            <input type="text" bind:value={contacts} placeholder="Phone or email" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Type of Report</label>
            <select bind:value={typeOfReport} class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <option value="" disabled selected>Select type</option>
              {#each reportTypes as t}
                <option value={t}>{t}</option>
              {/each}
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea bind:value={notes} rows="4" placeholder="Add additional details..." class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"></textarea>
          </div>
        </div>

        <div class="mt-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Attachments (images or short videos)</label>
          <p class="text-xs text-gray-500 mb-3">Uploads are encrypted locally and shown to officials along the sides of their dashboard cards.</p>
          <div class="border-2 border-dashed border-gray-300 rounded-2xl p-6 bg-gray-50">
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*" 
              capture="environment"
              on:change={handleFilesSelected} 
              class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
            />
            {#if attachments.length}
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {#each attachments as file, i}
                  <div class="relative group">
                    {#if file.type.startsWith('image/')}
                      <img src={previewUrls[i]} alt={file.name} class="w-full h-32 object-cover rounded-lg border border-gray-200" />
                    {:else}
                      <video src={previewUrls[i]} class="w-full h-32 object-cover rounded-lg border border-gray-200" />
                    {/if}
                    <button type="button" class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition" on:click={() => removeAttachment(i)}>Remove</button>
                    <div class="mt-2 text-xs text-gray-600 truncate">{file.name}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="mt-8 flex items-center justify-end space-x-3">
          <button type="button" class="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50" on:click={() => { resetForm(); submissionSummary = null; }}>Clear</button>
          <button type="button" class="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg disabled:opacity-60" on:click={submitReport} disabled={isSubmitting || !name || !address || !contacts || !typeOfReport}>
            {#if isSubmitting}
              Sending secure report...
            {:else}
              Submit Report with Media
            {/if}
          </button>
        </div>
      </div>
    {:else}
      <!-- Submission confirmation and simple status tracker -->
      <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50" in:scale={{ duration: 300 }}>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-800">Report Submitted</h2>
          <button class="text-emerald-700 hover:text-emerald-800" on:click={() => { submissionSummary = null; submitted = false; resetForm(); }}>File another media report</button>
        </div>
        <p class="text-gray-600">Your report and media evidence were securely shared with officials. They will review it directly from their dashboard.</p>

        {#if submissionSummary}
          <div class="mt-6 grid gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Submitted</div>
              <div class="text-lg font-bold text-gray-800 mt-1">{submissionSummary.submittedAt}</div>
            </div>
            <div class="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div class="text-xs font-semibold uppercase tracking-wide text-blue-700">Attachments sent</div>
              <div class="text-lg font-bold text-gray-800 mt-1">{submissionSummary.attachments}</div>
              <p class="text-xs text-gray-600 mt-1">These files now appear along the side panels of the officials' dashboard cards.</p>
            </div>
          </div>
        {/if}

        <div class="mt-6">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">1</div>
                <div class="h-1 flex-1 bg-emerald-400"></div>
                <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">2</div>
                <div class="h-1 flex-1 bg-emerald-200"></div>
                <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">3</div>
              </div>
              <div class="flex justify-between text-sm text-gray-700 mt-2">
                <div>Seen by Officials</div>
                <div>Processing</div>
                <div>Done</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 flex items-center space-x-3">
          <button class="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50" on:click={() => goto('/')}>
            Back to Home
          </button>
          <div class="text-xs text-gray-500">
            Residents can only submit new reports or return home. Dashboard access is reserved for officials.
          </div>
        </div>
      </div>
    {/if}
  </div>
  </PageTransition>
</div>

<div class="max-w-5xl mx-auto px-4 pb-16 -mt-8">
  <div class="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
    <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">My Reports</h2>
        <p class="text-sm text-gray-500">Track the status of every report you’ve submitted.</p>
      </div>
      {#if currentUser?.id}
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm font-medium"
          on:click={() => currentUser?.id && fetchMyReports(currentUser.id)}
        >
          Refresh
        </button>
      {/if}
    </div>

    {#if !isAuthChecked}
      <p class="text-gray-500">Checking your account...</p>
    {:else if myReportsLoading}
      <div class="flex items-center space-x-3 text-gray-600">
        <div class="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading your reports...</span>
      </div>
    {:else if myReportsError}
      <div class="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{myReportsError}</div>
    {:else if myReports.length === 0}
      <p class="text-gray-600">You haven’t submitted any reports yet. Once you do, their progress will appear here.</p>
    {:else}
      <div class="space-y-4">
        {#each myReports as report (report.id)}
          <div class="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-gray-900">{report.title}</p>
                <p class="text-sm text-gray-500">Filed on {report.date} at {report.time}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeClasses(report.priority)}`}>
                  {report.priority} priority
                </span>
                <span class={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClasses(report.status)}`}>
                  {report.status}
                </span>
              </div>
            </div>
            <p class="mt-3 text-sm text-gray-700">{report.description}</p>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p class="text-gray-500 text-xs uppercase tracking-wide">Location</p>
                <p class="text-gray-900 mt-1">{report.location}</p>
              </div>
              <div>
                <p class="text-gray-500 text-xs uppercase tracking-wide">Officer</p>
                <p class="text-gray-900 mt-1">{report.officer}</p>
              </div>
              <div>
                <p class="text-gray-500 text-xs uppercase tracking-wide">Latest Update</p>
                <p class="text-gray-900 mt-1">{latestUpdateNote(report)}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
</style>


