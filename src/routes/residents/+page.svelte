<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import type { Report } from '$lib/types/report';
  import { generateId } from '$lib/utils/id';
  import {
    buildResidentMetadata,
    createMediaAttachmentPayload,
    serializeMediaAttachment,
    summarizeMediaAttachment
  } from '$lib/utils/reportParsing';
  import { supabase } from '$lib/supabaseClient';

  let name = '';
  let address = '';
  let contact = '';
  let notes = '';
  let typeOfReport = '';
  let otherType = '';
  let attachments: File[] = [];
  let previewUrls: string[] = [];
  let isSubmitting = false;
  let submitted = false;
  let submitError = '';
  let submissionSummary: { attachments: number; submittedAt: string } | null = null;
  const autosaveKey = 'residentReportDraft';
  const guestReporterKey = 'guestReporterId';
  let autosaveId: number | null = null;
  let now: Date = new Date();
  let nowTimerId: number | null = null;
  let currentUser: { id: string; username?: string; role?: string } | null = null;
  let isAuthChecked = false;
  let myReports: Report[] = [];
  let myReportsLoading = false;
  let myReportsError = '';
  let myReportsStream: EventSource | null = null;
  let addressError = '';
  let contactError = '';
  let selectedLocationShortcut = '';

  const banicainLocations = [
    'Banicain Barangay Hall, Banicain, Olongapo City, Zambales',
    'Banicain Elementary School, Banicain, Olongapo City, Zambales',
    'Banicain Health Center, Banicain, Olongapo City, Zambales',
    'Banicain Market, Banicain, Olongapo City, Zambales',
    'Banicain Church, Banicain, Olongapo City, Zambales',
    'Banicain Basketball Court, Banicain, Olongapo City, Zambales',
    'Banicain Covered Court, Banicain, Olongapo City, Zambales',
    'Banicain Main Road, Banicain, Olongapo City, Zambales',
    'Banicain Purok 1, Banicain, Olongapo City, Zambales',
    'Banicain Purok 2, Banicain, Olongapo City, Zambales',
    'Banicain Purok 3, Banicain, Olongapo City, Zambales',
    'Banicain Purok 4, Banicain, Olongapo City, Zambales',
    'Banicain Purok 5, Banicain, Olongapo City, Zambales',
    'Banicain Purok 6, Banicain, Olongapo City, Zambales',
    'Banicain Purok 7, Banicain, Olongapo City, Zambales',
    'Banicain Purok 8, Banicain, Olongapo City, Zambales'
  ];

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
    'Environmental Issue',
    'Other (not listed)'
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
    contact = '';
    addressError = '';
    contactError = '';
    notes = '';
    typeOfReport = '';
    otherType = '';
    selectedLocationShortcut = '';
    attachments = [];
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    submitError = '';
    // Also clear draft
    localStorage.removeItem(autosaveKey);
  }

  // Reactive statement: when location shortcut is selected, update address
  $: if (selectedLocationShortcut) {
    address = selectedLocationShortcut;
    addressError = '';
  }

  function handleContactInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Only allow numbers, +, and spaces
    const cleaned = value.replace(/[^\d+\s]/g, '');
    if (cleaned !== value) {
      contact = cleaned;
    }
  }

  function getStatusBadgeClasses(status: Report['status']) {
    switch (status) {
      case 'Pending Confirmation':
        return 'bg-amber-400/20 border border-amber-300/40 text-amber-100';
      case 'Solved':
        return 'bg-emerald-400/20 border border-emerald-300/40 text-emerald-100';
      case 'Under Investigation':
        return 'bg-amber-400/20 border border-amber-300/40 text-amber-100';
      default:
        return 'bg-blue-400/20 border border-blue-300/40 text-blue-100';
    }
  }

  function getPriorityBadgeClasses(priority: Report['priority']) {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-500/20 border border-rose-300/40 text-rose-100';
      case 'High':
        return 'bg-orange-500/20 border border-orange-300/40 text-orange-100';
      case 'Medium':
        return 'bg-yellow-400/20 border border-yellow-200/40 text-yellow-50';
      default:
        return 'bg-emerald-500/20 border border-emerald-300/40 text-emerald-100';
    }
  }

  function getRecentUpdates(report: Report, limit = 3) {
    if (!report?.updates) return [];
    const history = Array.isArray(report.updates) ? [...report.updates] : [];
    return history.slice(-limit).reverse();
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Unable to read attachment.'));
      reader.readAsDataURL(file);
    });
  }

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(init.headers ?? {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, {
      ...init,
      headers
    });
  }

  function isValidBanicainAddress(address: string): boolean {
    const normalized = address.toLowerCase();
    return normalized.includes('banicain') && normalized.includes('olongapo');
  }

  function isValidPhilippineMobileNumber(value: string): boolean {
    const cleaned = value.replace(/[\s\-]/g, '');
    return /^09\d{9}$/.test(cleaned) || /^\+639\d{9}$/.test(cleaned);
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
        contact = draft.contact || draft.contacts || '';
        notes = draft.notes || '';
        typeOfReport = draft.typeOfReport || '';
      }
    } catch {}

    // Autosave every 5s
    autosaveId = window.setInterval(() => {
      const draft = { name, address, contact, notes, typeOfReport };
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

  function ensureReporterId(): string {
    if (currentUser?.id) return currentUser.id;
    try {
      const storedGuestId = localStorage.getItem(guestReporterKey);
      if (storedGuestId) {
        currentUser = { id: storedGuestId, role: 'Guest' };
        return storedGuestId;
      }
      const newGuestId = generateId('guest');
      localStorage.setItem(guestReporterKey, newGuestId);
      currentUser = { id: newGuestId, role: 'Guest' };
      return newGuestId;
    } catch {
      const fallbackId = generateId('guest');
      currentUser = { id: fallbackId, role: 'Guest' };
      return fallbackId;
    }
  }

  async function submitReport() {
    if (isSubmitting) return;
    const reporterId = ensureReporterId();
    submitError = '';
    addressError = '';
    contactError = '';

    if (!isValidBanicainAddress(address)) {
      addressError = 'Please enter an address located in Barangay Banicain, Olongapo City.';
      return;
    }

    if (!isValidPhilippineMobileNumber(contact)) {
      contactError = 'Please enter a valid Philippine mobile number (e.g. 09XXXXXXXXX or +639XXXXXXXXX).';
      return;
    }
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
          contact: contact,
          typeOfReport
        },
        message: notes,
        attachments: attachmentPayloads.map(summarizeMediaAttachment)
      });

      const payload = {
        title: (typeOfReport === 'Other (not listed)' ? otherType : typeOfReport)
          ? `${typeOfReport === 'Other (not listed)' ? otherType : typeOfReport} - ${name || 'Resident'}`
          : `Community Report - ${name || 'Resident'}`,
        type: typeOfReport === 'Other (not listed)' ? otherType || 'Incident' : typeOfReport || 'Incident',
        priority: 'High',
        location: address || 'Resident provided location',
        description: notes || 'Resident-submitted incident report.',
        damage: 'Resident Submission',
        notes: metadata,
        evidence: attachmentPayloads.map(serializeMediaAttachment),
        reporterId
      };

      const response = await authorizedFetch('/api/reports', {
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
      await fetchMyReports(reporterId);
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
      if (parsed && parsed.role === 'Resident') {
        if (!parsed.id) {
          parsed.id = generateId('resident');
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        currentUser = parsed;
      } else {
        const storedGuestId = localStorage.getItem(guestReporterKey);
        const guestId = storedGuestId || generateId('guest');
        if (!storedGuestId) {
          localStorage.setItem(guestReporterKey, guestId);
        }
        currentUser = { id: guestId, role: 'Guest' };
      }
      isAuthChecked = true;
      // Only fetch reports if user is authenticated (not guest)
      if (currentUser?.id && currentUser?.role === 'Resident') {
        fetchMyReports(currentUser.id);
        subscribeToMyReports(currentUser.id);
      }
    } catch {
      const fallbackId = generateId('guest');
      currentUser = { id: fallbackId, role: 'Guest' };
      isAuthChecked = true;
      // Don't fetch reports for guests
    }
  }
  
  function isAuthenticatedResident(): boolean {
    return currentUser?.role === 'Resident' && currentUser?.id !== null;
  }

  async function fetchMyReports(userId: string) {
    myReportsLoading = true;
    myReportsError = '';
    try {
      const response = await authorizedFetch(`/api/reports?reporterId=${encodeURIComponent(userId)}`);
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
  
  function formatReportId(id: string | null | undefined): string {
    if (!id) return 'N/A';
    // If it's already a short ID (like RPT-XXXXXX), return as is
    if (id.includes('RPT-') && id.length <= 11) return id;
    // Otherwise, show last 6 characters
    return id.length > 6 ? `...${id.slice(-6)}` : id;
  }

  async function handleLogout() {
    try {
      // Close SSE stream if open
      if (myReportsStream) {
        myReportsStream.close();
        myReportsStream = null;
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem(autosaveKey);
      localStorage.removeItem(guestReporterKey);

      // Redirect to landing page
      goto('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect even if logout fails
      localStorage.removeItem('user');
      localStorage.removeItem(autosaveKey);
      localStorage.removeItem(guestReporterKey);
      goto('/');
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
          <div class="flex items-center gap-3">
            {#if isAuthenticatedResident()}
              <button
                on:click={() => goto('/residents/dashboard')}
                class="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105"
                aria-label="Open resident dashboard"
              >
                Dashboard
              </button>
            {/if}
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
            <button
              on:click={handleLogout}
              class="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105"
              aria-label="Logout"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span class="font-medium">Logout</span>
            </button>
          </div>
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
            <label for="report-time" class="block text-sm font-medium text-gray-700 mb-2">Report Time</label>
            <input
              id="report-time"
              type="text"
              value={formatDateTime(now)}
              readonly
              class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
            />
          </div>
          <div>
            <label for="resident-name" class="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              id="resident-name"
              type="text"
              bind:value={name}
              placeholder="Your full name"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label for="resident-address" class="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <div class="mb-2">
              <label for="resident-location-shortcut" class="block text-xs font-medium text-gray-600 mb-1">Quick Select Location (Optional)</label>
              <select
                id="resident-location-shortcut"
                bind:value={selectedLocationShortcut}
                class="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select a location...</option>
                {#each banicainLocations as location}
                  <option value={location}>{location}</option>
                {/each}
              </select>
            </div>
            <input
              id="resident-address"
              type="text"
              bind:value={address}
              placeholder="Your address in Banicain, Olongapo City, Zambales"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {#if addressError}
              <p class="mt-1 text-xs text-red-600">{addressError}</p>
            {:else}
              <p class="mt-1 text-xs text-gray-500">Must be within Brgy. Banicain, Olongapo City, Zambales.</p>
            {/if}
          </div>
          <div>
            <label for="resident-contact" class="block text-sm font-medium text-gray-700 mb-2">Contact</label>
            <input 
              id="resident-contact"
              type="tel" 
              bind:value={contact} 
              on:input={handleContactInput}
              placeholder="09XXXXXXXXX or +639XXXXXXXXX" 
              pattern="[0-9+\s]*"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
            />
            {#if contactError}
              <p class="mt-1 text-xs text-red-600">{contactError}</p>
            {:else}
              <p class="mt-1 text-xs text-gray-500">Philippine mobile number only (numbers and +).</p>
            {/if}
          </div>
          <div>
            <label for="type-of-report" class="block text-sm font-medium text-gray-700 mb-2">Type of Report</label>
            <select
              id="type-of-report"
              bind:value={typeOfReport}
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>Select type</option>
              {#each reportTypes as t}
                <option value={t}>{t}</option>
              {/each}
            </select>
            {#if typeOfReport === 'Other (not listed)'}
              <input
                aria-label="Other report type"
                type="text"
                bind:value={otherType}
                placeholder="Describe the type of incident"
                class="mt-3 w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            {/if}
          </div>
          <div class="md:col-span-2">
            <label for="report-notes" class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              id="report-notes"
              bind:value={notes}
              rows="4"
              placeholder="Add additional details..."
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <div class="mt-6">
          <label for="report-attachments" class="block text-sm font-medium text-gray-700 mb-2">Attachments (images or short videos)</label>
          <p class="text-xs text-gray-500 mb-3">Uploads are encrypted locally and shown to officials along the sides of their dashboard cards.</p>
          <div class="border-2 border-dashed border-gray-300 rounded-2xl p-6 bg-gray-50">
            <input 
              id="report-attachments"
              type="file" 
              multiple
              accept="image/*,video/*"
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
                      <video src={previewUrls[i]} class="w-full h-32 object-cover rounded-lg border border-gray-200">
                        <track kind="captions" srclang="en" label="English" />
                      </video>
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
          <button
            type="button"
            class="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg disabled:opacity-60"
            on:click={submitReport}
            disabled={
              isSubmitting ||
              !name ||
              !address ||
              !contact ||
              !typeOfReport ||
              (typeOfReport === 'Other (not listed)' && !otherType)
            }
          >
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

<div class="max-w-5xl mx-auto px-4 pb-20 -mt-8">
  <div class="relative rounded-[32px] bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-[1px] shadow-[0_20px_80px_rgba(15,23,42,0.45)]">
    <div class="relative rounded-[30px] bg-slate-950/70 backdrop-blur-2xl p-8 md:p-10 text-white overflow-hidden">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -top-24 -right-10 w-72 h-72 bg-primary-500/30 blur-[140px]"></div>
        <div class="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/20 blur-[180px] opacity-70"></div>
      </div>

      <div class="relative z-10 space-y-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-slate-400">Resident History</p>
            <h2 class="text-3xl font-semibold text-white mt-2">My Reports</h2>
            <p class="text-sm text-slate-300">Track the progress of every incident you have filed with Brgy. Banicain.</p>
          </div>
          {#if isAuthenticatedResident()}
            <button
              type="button"
              class="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              on:click={() => currentUser?.id && fetchMyReports(currentUser.id)}
            >
              Refresh
            </button>
          {/if}
        </div>

        {#if !isAuthChecked}
          <p class="text-slate-300">Checking your account…</p>
        {:else if !isAuthenticatedResident()}
          <!-- Guest users - prompt to sign up/login -->
          <div class="p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-sm">
            <div class="flex flex-col items-center text-center space-y-4">
              <div class="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-white mb-2">Sign In to View Your Report History</h3>
                <p class="text-slate-300 mb-6 max-w-md">
                  To track your submitted reports and see their status updates, please sign in or create an account. 
                  Guest submissions are anonymous and cannot be tracked.
                </p>
              </div>
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  on:click={() => goto('/login?role=resident')}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                  </svg>
                  Sign In
                </button>
                <button
                  type="button"
                  class="px-6 py-3 bg-white/10 border-2 border-white/30 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                  on:click={() => goto('/signup?role=resident')}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                  </svg>
                  Create Account
                </button>
              </div>
              <p class="text-xs text-slate-400 mt-4">
                Already have an account? <button class="text-amber-400 hover:text-amber-300 underline" on:click={() => goto('/login?role=resident')}>Sign in here</button>
              </p>
            </div>
          </div>
        {:else if myReportsLoading}
          <div class="flex items-center space-x-3 text-slate-200">
            <div class="h-4 w-4 border-2 border-primary-300 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading your reports…</span>
          </div>
        {:else if myReportsError}
          <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-300/40 text-sm text-rose-100">{myReportsError}</div>
        {:else if myReports.length === 0}
          <div class="p-6 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
            You haven’t submitted any reports yet. Once you do, their journey—from submission to resolution—will appear here.
          </div>
        {:else}
          <div class="space-y-6">
            {#each myReports as report (report.id)}
              <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
                <div class="absolute inset-0 opacity-40 pointer-events-none">
                  <div class="absolute right-0 top-0 w-72 h-72 bg-primary-500/20 blur-[120px]"></div>
                </div>
                <div class="relative space-y-5">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Report #{formatReportId(report.shortId || report.id)}</p>
                      <p class="text-2xl font-semibold text-white mt-1">{report.title}</p>
                      <p class="text-sm text-slate-300">Filed on {report.date} at {report.time}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 text-xs font-semibold">
                      <span class={`px-3 py-1 rounded-full ${getPriorityBadgeClasses(report.priority)}`}>
                        {report.priority} priority
                      </span>
                      <span class={`px-3 py-1 rounded-full ${getStatusBadgeClasses(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <p class="text-sm text-slate-100 leading-relaxed">{report.description}</p>

                  <div class="grid gap-6 lg:grid-cols-[1fr,250px]">
                    <div class="space-y-4">
                      <div class="grid gap-4 sm:grid-cols-3 text-sm text-slate-200">
                        <div>
                          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Location</p>
                          <p class="text-white mt-1">{report.location}</p>
                        </div>
                        <div>
                          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Officer</p>
                          <p class="text-white mt-1">{report.officer || 'Unassigned'}</p>
                        </div>
                        <div>
                          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Latest Update</p>
                          <p class="text-white mt-1">{latestUpdateNote(report)}</p>
                        </div>
                      </div>

                      <div class="flex flex-wrap gap-4 text-xs text-slate-400">
                        <div class="flex items-center gap-2">
                          <span class="inline-flex h-2 w-2 rounded-full bg-emerald-300"></span>
                          <span>Priority channel monitored</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="inline-flex h-2 w-2 rounded-full bg-sky-300"></span>
                          <span>Supabase synced</span>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-2xl bg-black/30 border border-white/10 p-4">
                      <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Recent Updates</p>
                      {#if getRecentUpdates(report).length === 0}
                        <p class="text-sm text-slate-300 mt-3">No timeline entries yet.</p>
                      {:else}
                        <div class="mt-4 space-y-4">
                          {#each getRecentUpdates(report) as update}
                            <div class="flex items-start gap-3 text-sm">
                              <div class="mt-1 h-2.5 w-2.5 rounded-full bg-primary-300"></div>
                              <div>
                                <p class="text-white">{update.note}</p>
                                <p class="text-xs text-slate-400">{update.date} · {update.time}</p>
                              </div>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
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


