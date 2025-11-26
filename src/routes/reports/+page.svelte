<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { sidebarCollapsed } from '$lib/stores/sidebar';
  import { parseEvidenceEntries, parseResidentMetadata, buildResidentMetadata, createMediaAttachmentPayload, serializeMediaAttachment, summarizeMediaAttachment } from '$lib/utils/reportParsing';
  import type { EvidenceBuckets, ResidentMetadataResult } from '$lib/utils/reportParsing';
  import { jsPDF } from 'jspdf';
  import type { Report, ReportUpdate } from '$lib/types/report';
  
  export let data: {
    reports: Report[];
    source: 'supabase' | 'api';
    error?: string;
  };

  let crimeReports: Report[] = [];

  // Sample crime reports data
  const defaultCrimeReports: Report[] = [
    {
      id: 'CR-2024-001',
      title: 'Armed Robbery at Central Bank',
      type: 'Armed Robbery',
      status: 'Under Investigation',
      priority: 'Critical',
      location: 'Central Business District',
      date: '2024-01-15',
      time: '14:30',
      officer: 'Detective Sarah Johnson',
      description: 'Armed robbery at Central Bank involving three suspects with automatic weapons. No casualties reported.',
      evidence: ['CCTV footage', 'Ballistic analysis', 'Witness statements', 'Fingerprints'],
      suspects: ['Unknown - wearing masks'],
      victims: ['Central Bank', 'Bank employees'],
      damage: '$250,000',
      notes: 'FBI has been notified. Multi-agency investigation in progress.',
      updates: [
        { date: '2024-01-15', time: '15:45', note: 'Initial response team arrived on scene' },
        { date: '2024-01-15', time: '16:20', note: 'Forensic team collecting evidence' },
        { date: '2024-01-16', time: '09:15', note: 'Ballistic analysis completed' }
      ]
    },
    {
      id: 'CR-2024-002',
      title: 'Vehicle Theft Ring',
      type: 'Vehicle Theft',
      status: 'Solved',
      priority: 'High',
      location: 'Downtown Parking Complex',
      date: '2024-01-10',
      time: '22:15',
      officer: 'Officer Mike Rodriguez',
      description: 'Organized vehicle theft operation targeting luxury vehicles in downtown area.',
      evidence: ['GPS tracking data', 'Surveillance footage', 'Recovered vehicles'],
      suspects: ['Carlos Mendez', 'Javier Lopez', 'Maria Santos'],
      victims: ['Multiple vehicle owners'],
      damage: '$180,000',
      notes: 'All suspects apprehended. Vehicles recovered successfully.',
      updates: [
        { date: '2024-01-10', time: '23:30', note: 'First suspect apprehended' },
        { date: '2024-01-11', time: '02:15', note: 'All suspects in custody' },
        { date: '2024-01-12', time: '14:20', note: 'Case closed - all vehicles recovered' }
      ]
    },
    {
      id: 'CR-2024-003',
      title: 'Cyber Fraud Network',
      type: 'Cyber Crime',
      status: 'Under Investigation',
      priority: 'Critical',
      location: 'Online',
      date: '2024-01-08',
      time: '10:45',
      officer: 'Detective Alex Chen',
      description: 'Large-scale cyber fraud operation targeting elderly citizens through phishing schemes.',
      evidence: ['Digital forensics', 'Bank records', 'Email trails', 'IP addresses'],
      suspects: ['International cyber group'],
      victims: ['Over 200 elderly citizens'],
      damage: '$500,000',
      notes: 'Interpol cooperation required. International investigation ongoing.',
      updates: [
        { date: '2024-01-08', time: '11:30', note: 'Cyber forensics team activated' },
        { date: '2024-01-09', time: '16:45', note: 'Interpol notification sent' },
        { date: '2024-01-10', time: '09:20', note: 'Additional victims identified' }
      ]
    },
    {
      id: 'CR-2024-004',
      title: 'Domestic Violence Incident',
      type: 'Domestic Violence',
      status: 'Open',
      priority: 'High',
      location: 'Residential Area - Oak Street',
      date: '2024-01-12',
      time: '19:20',
      officer: 'Officer Lisa Thompson',
      description: 'Domestic violence incident involving physical assault and property damage.',
      evidence: ['Medical reports', 'Photographs', 'Witness statements'],
      suspects: ['John Smith'],
      victims: ['Jane Smith'],
      damage: 'Personal injuries + $5,000 property damage',
      notes: 'Restraining order issued. Suspect has prior history.',
      updates: [
        { date: '2024-01-12', time: '20:15', note: 'Victim transported to hospital' },
        { date: '2024-01-12', time: '21:30', note: 'Suspect apprehended' },
        { date: '2024-01-13', time: '10:00', note: 'Restraining order processed' }
      ]
    },
    {
      id: 'CR-2024-005',
      title: 'Drug Trafficking Operation',
      type: 'Drug Trafficking',
      status: 'Under Investigation',
      priority: 'Critical',
      location: 'Warehouse District',
      date: '2024-01-14',
      time: '03:45',
      officer: 'Detective Robert Wilson',
      description: 'Large-scale drug trafficking operation discovered in abandoned warehouse.',
      evidence: ['Drug samples', 'Surveillance footage', 'Financial records'],
      suspects: ['Organized crime syndicate'],
      victims: 'Community safety',
      damage: 'Public health risk',
      notes: 'DEA involvement required. Multi-agency task force assembled.',
      updates: [
        { date: '2024-01-14', time: '04:30', note: 'DEA notified' },
        { date: '2024-01-14', time: '08:15', note: 'Task force assembled' },
        { date: '2024-01-15', time: '12:00', note: 'Additional locations identified' }
      ]
    },
    {
      id: 'CR-2024-006',
      title: 'Homicide Investigation',
      type: 'Homicide',
      status: 'Under Investigation',
      priority: 'Critical',
      location: 'Industrial Zone - Abandoned Factory',
      date: '2024-01-16',
      time: '08:30',
      officer: 'Detective Maria Garcia',
      description: 'Body discovered in abandoned factory. Preliminary investigation suggests foul play.',
      evidence: ['Forensic evidence', 'Security footage', 'Witness interviews', 'Medical examiner report'],
      suspects: ['Unknown'],
      victims: ['John Doe - Unidentified male'],
      damage: 'Loss of life',
      notes: 'Homicide unit activated. Waiting for autopsy results.',
      updates: [
        { date: '2024-01-16', time: '09:15', note: 'Homicide unit arrived on scene' },
        { date: '2024-01-16', time: '11:30', note: 'Body transported to morgue' },
        { date: '2024-01-17', time: '14:20', note: 'Autopsy scheduled for tomorrow' }
      ]
    },
    {
      id: 'CR-2024-007',
      title: 'Burglary Spree',
      type: 'Burglary',
      status: 'Solved',
      priority: 'Medium',
      location: 'Residential District - Multiple homes',
      date: '2024-01-13',
      time: '02:15',
      officer: 'Officer David Kim',
      description: 'Series of residential burglaries targeting electronics and jewelry.',
      evidence: ['Footprints', 'Tool marks', 'Stolen items recovered', 'Neighbor statements'],
      suspects: ['Tommy Wilson', 'Rick Martinez'],
      victims: ['Multiple homeowners'],
      damage: '$45,000',
      notes: 'Suspects apprehended during attempted burglary. All stolen items recovered.',
      updates: [
        { date: '2024-01-13', time: '03:45', note: 'First suspect apprehended' },
        { date: '2024-01-13', time: '05:20', note: 'Second suspect in custody' },
        { date: '2024-01-14', time: '16:30', note: 'All stolen items recovered and returned' }
      ]
    },
    {
      id: 'CR-2024-008',
      title: 'Assault and Battery',
      type: 'Assault',
      status: 'Open',
      priority: 'High',
      location: 'Downtown Bar District',
      date: '2024-01-15',
      time: '23:45',
      officer: 'Officer James Wilson',
      description: 'Physical altercation between two groups resulting in serious injuries.',
      evidence: ['Medical reports', 'Witness statements', 'Bar security footage'],
      suspects: ['Multiple unidentified individuals'],
      victims: ['Michael Brown', 'Sarah Johnson'],
      damage: 'Serious injuries requiring hospitalization',
      notes: 'Investigation ongoing. Multiple witnesses being interviewed.',
      updates: [
        { date: '2024-01-15', time: '23:55', note: 'Emergency services arrived' },
        { date: '2024-01-16', time: '01:30', note: 'Victims transported to hospital' },
        { date: '2024-01-16', time: '10:15', note: 'Witness interviews conducted' }
      ]
    }
  ];

  crimeReports = data?.reports?.length ? data.reports : defaultCrimeReports;

  // Filter states
  let statusFilter = 'All';
  let priorityFilter = 'All';
  let typeFilter = 'All';
  let searchTerm = '';
  let showFilters = false;
  let selectedReport: Report | null = null;
  let showReportModal = false;
  let showNewReportModal = false;
  let showEditModal = false;
  let showDeleteConfirm = false;
  let reportToDelete: Report | null = null;
  let editingReport: Report | null = null;
  let showMediaViewer = false;
  let selectedMedia: { url: string; name: string; type: 'image' | 'video' } | null = null;
  let mediaZoom = 1;
  let es: EventSource | null = null;
  let streamReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let selectedEvidence: EvidenceBuckets = { media: [], text: [] };
  let selectedResidentDetails: ResidentMetadataResult | null = null;
  type ReportViewModel = {
    report: Report;
    resident: ResidentMetadataResult;
    evidence: EvidenceBuckets;
  };
  
  // Edit form state
  let editForm = {
    title: '',
    type: '',
    status: 'Open' as 'Open' | 'Under Investigation' | 'Solved',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    location: '',
    officer: '',
    description: '',
    damage: '',
    notes: '',
    evidence: [] as string[],
    suspects: [] as string[],
    victims: [] as string[],
    date: '',
    time: ''
  };

  // File upload state
  let uploadedFiles: File[] = [];
  let filePreviewUrls: string[] = [];
  let isExporting = false;
  let isSaving = false;
  let editExistingEvidence: EvidenceBuckets = { media: [], text: [] };
  let editResidentMetadata: ResidentMetadataResult | null = null;
  let originalNotes: string = '';

  // Resident submission form state
  let residentForm = {
    name: '',
    contact: '',
    address: '',
    typeOfReport: '',
    description: '',
    date: '',
    time: ''
  };
  let residentFiles: File[] = [];
  let residentFilePreviewUrls: string[] = [];
  let isSubmittingResident = false;

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
    'Armed Robbery',
    'Vehicle Theft',
    'Cyber Crime',
    'Domestic Violence',
    'Drug Trafficking',
    'Homicide',
    'Assault'
  ];

  const statusSteps = ['Open', 'Under Investigation', 'Solved'];

  function getStepIndex(status: string) {
    return Math.max(0, statusSteps.indexOf(status));
  }

  function createNewReport() {
    // Open resident submission modal
    const now = new Date();
    residentForm = {
      name: '',
      contact: '',
      address: '',
      typeOfReport: '',
      description: '',
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5)
    };
    residentFiles = [];
    residentFilePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    residentFilePreviewUrls = [];
    showNewReportModal = true;
  }

  function closeNewReportModal() {
    showNewReportModal = false;
    residentFilePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    residentFiles = [];
    residentFilePreviewUrls = [];
  }

  function handleResidentFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input || !input.files || input.files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    const newFiles = Array.from(input.files);
    console.log(`Selected ${newFiles.length} file(s)`);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    newFiles.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return;
        }
        validFiles.push(file);
      } else {
        alert(`File ${file.name} is not a valid image or video file.`);
      }
    });
    
    if (validFiles.length === 0) {
      console.log('No valid files to add');
      return;
    }
    
    // Add valid files to the array
    residentFiles = [...residentFiles, ...validFiles];
    
    // Create preview URLs for valid files
    validFiles.forEach(file => {
      try {
        const url = URL.createObjectURL(file);
        residentFilePreviewUrls = [...residentFilePreviewUrls, url];
        console.log(`Created preview URL for ${file.name}`);
      } catch (error) {
        console.error(`Error creating preview for ${file.name}:`, error);
      }
    });
    
    // Reset the input so the same file can be selected again
    input.value = '';
    
    console.log(`Total files: ${residentFiles.length}, Total previews: ${residentFilePreviewUrls.length}`);
  }

  function removeResidentFile(index: number) {
    if (residentFilePreviewUrls[index]) {
      URL.revokeObjectURL(residentFilePreviewUrls[index]);
    }
    residentFiles = residentFiles.filter((_, i) => i !== index);
    residentFilePreviewUrls = residentFilePreviewUrls.filter((_, i) => i !== index);
  }

  let isDragging = false;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isDragging = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Create a fake input event to reuse the existing handler
    const fakeInput = {
      target: { files } as HTMLInputElement
    } as unknown as Event;
    handleResidentFileUpload(fakeInput);
  }

  async function submitResidentReport() {
    if (isSubmittingResident) return;
    if (!residentForm.name || !residentForm.contact || !residentForm.typeOfReport) {
      alert('Please fill in required fields: Name, Contact, and Type of Report');
      return;
    }

    isSubmittingResident = true;
    console.log('Submitting report with', residentFiles.length, 'files');

    try {
      // Convert uploaded files to media attachments
      const attachmentPayloads = await Promise.all(
        residentFiles.map(async (file, index) => {
          try {
            console.log(`Processing file ${index + 1}/${residentFiles.length}: ${file.name}`);
            const dataUrl = await readFileAsDataUrl(file);
            const payload = createMediaAttachmentPayload({
              id: `resident-${Date.now()}-${index}`,
              name: file.name,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              dataUrl,
              size: file.size
            });
            console.log(`Successfully processed ${file.name}`);
            return payload;
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            throw error;
          }
        })
      );
      
      console.log(`Successfully converted ${attachmentPayloads.length} files to attachments`);

      // Build resident metadata
      const metadata = buildResidentMetadata({
        reporter: {
          name: residentForm.name,
          address: residentForm.address,
          contact: residentForm.contact,
          typeOfReport: residentForm.typeOfReport
        },
        message: residentForm.description,
        attachments: attachmentPayloads.map(summarizeMediaAttachment)
      });

      // Create report payload
      const payload = {
        title: residentForm.typeOfReport 
          ? `${residentForm.typeOfReport} - ${residentForm.name}`
          : `Community Report - ${residentForm.name}`,
        type: residentForm.typeOfReport || 'Incident',
        status: 'Open',
        priority: 'High',
        location: residentForm.address || 'Location to be determined',
        date: residentForm.date || new Date().toISOString().slice(0, 10),
        time: residentForm.time || new Date().toTimeString().slice(0, 5),
        officer: 'Unassigned',
        description: residentForm.description || 'Resident-submitted incident report.',
        damage: 'Resident Submission',
        notes: metadata,
        evidence: attachmentPayloads.map(serializeMediaAttachment),
        suspects: [],
        victims: []
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Report submitted successfully:', data.report);
        upsertReport(data.report);
        closeNewReportModal();
        alert(`Report submitted successfully! ${residentFiles.length > 0 ? `(${residentFiles.length} file(s) attached)` : ''}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to submit report:', errorData);
        alert(errorData.message || errorData.error || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting resident report:', error);
      alert(`Error submitting report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      isSubmittingResident = false;
    }
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const newFiles = Array.from(input.files);
    
    // Filter only image and video files
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    if (validFiles.length === 0) {
      alert('Please select image or video files only.');
      input.value = '';
      return;
    }
    
    // Create preview URLs immediately for valid files
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    // Update arrays reactively by reassigning
    uploadedFiles = [...uploadedFiles, ...validFiles];
    filePreviewUrls = [...filePreviewUrls, ...newPreviewUrls];
    
    // Reset the input so the same file can be selected again if needed
    input.value = '';
    
    console.log('Files uploaded:', validFiles.length, 'Preview URLs:', newPreviewUrls.length);
  }

  function removeFile(index: number) {
    if (filePreviewUrls[index]) {
      URL.revokeObjectURL(filePreviewUrls[index]);
    }
    uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
    filePreviewUrls = filePreviewUrls.filter((_, i) => i !== index);
  }

  async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function upsertReport(updated: Report) {
    const idx = crimeReports.findIndex(r => r.id === updated.id);
    if (idx >= 0) {
      crimeReports = [
        ...crimeReports.slice(0, idx),
        updated,
        ...crimeReports.slice(idx + 1)
      ];
    } else {
      crimeReports = [updated, ...crimeReports];
    }
  }

  async function hydrateReportsFromApi() {
    try {
      const res = await fetch('/api/reports');
      const data: { reports?: Report[] } = await res.json();
      if (data?.reports) {
        const incomingIds = new Set(data.reports.map(report => report.id));
        crimeReports = [...data.reports, ...crimeReports.filter(r => !incomingIds.has(r.id))];
      }
    } catch {
      // ignore fetch errors for now
    }
  }

  function connectReportStream() {
    if (typeof window === 'undefined') return;

    if (streamReconnectTimer) {
      clearTimeout(streamReconnectTimer);
      streamReconnectTimer = null;
    }

    if (es) {
      es.close();
      es = null;
    }

    try {
      es = new EventSource('/api/reports/stream');
      es.onmessage = (evt: MessageEvent) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.type === 'init' && payload.reports) {
            crimeReports = payload.reports;
          } else if (payload?.type === 'created' && payload.report) {
            upsertReport(payload.report);
          } else if (payload?.type === 'updated' && payload.report) {
            upsertReport(payload.report);
            if (showReportModal && selectedReport?.id === payload.report.id) {
              selectedReport = payload.report;
            }
            if (showEditModal && editingReport?.id === payload.report.id) {
              editingReport = payload.report;
            }
          } else if (payload?.type === 'deleted' && payload.id) {
            crimeReports = crimeReports.filter(r => r.id !== payload.id);
            if (showReportModal && selectedReport?.id === payload.id) {
              closeReportModal();
            }
            if (showEditModal && editingReport?.id === payload.id) {
              closeEditModal();
            }
          }
        } catch {
          // swallow malformed payloads
        }
      };
      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        streamReconnectTimer = setTimeout(() => {
          connectReportStream();
        }, 3000);
      };
    } catch {
      // SSE connection failed
    }
  }

  onMount(() => {
    if (data?.source !== 'supabase' || crimeReports.length === 0) {
      hydrateReportsFromApi();
    }

    connectReportStream();

    return () => {
      if (streamReconnectTimer) {
        clearTimeout(streamReconnectTimer);
        streamReconnectTimer = null;
      }
      if (es) {
        es.close();
        es = null;
      }
    };
  });

  // Computed filtered reports
  $: filteredReports = crimeReports.filter(report => {
    const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || report.priority === priorityFilter;
    const matchesType = typeFilter === 'All' || report.type === typeFilter;
    const matchesSearch = searchTerm === '' || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.officer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesType && matchesSearch;
  });

  // Statistics
  $: totalReports = crimeReports.length;
  $: solvedReports = crimeReports.filter(r => r.status === 'Solved').length;
  $: openReports = crimeReports.filter(r => r.status === 'Open').length;
  $: investigatingReports = crimeReports.filter(r => r.status === 'Under Investigation').length;
  $: criticalReports = crimeReports.filter(r => r.priority === 'Critical').length;

  function viewReport(report: Report) {
    selectedReport = report;
    showReportModal = true;
  }

  function closeReportModal() {
    showReportModal = false;
    selectedReport = null;
  }

  $: selectedEvidence = selectedReport ? parseEvidenceEntries(selectedReport.evidence ?? []) : { media: [], text: [] };
  $: selectedResidentDetails = selectedReport ? parseResidentMetadata(selectedReport.notes ?? '') : null;
  $: filteredViewModels = filteredReports.map(report => ({
    report,
    resident: parseResidentMetadata(report.notes ?? ''),
    evidence: parseEvidenceEntries(report.evidence ?? [])
  }));

  function openEditModal(report: Report | null = null) {
    editingReport = report;
    if (report) {
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
        victims: Array.isArray(report.victims) ? report.victims : (typeof report.victims === 'string' ? [report.victims] : []),
        date: report.date || new Date().toISOString().slice(0, 10),
        time: report.time || new Date().toTimeString().slice(0, 5)
      };
      // Parse existing evidence for display
      editExistingEvidence = parseEvidenceEntries(report.evidence ?? []);
      // Store parsed metadata for saving
      editResidentMetadata = parsedMetadata;
    } else {
      const now = new Date();
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
        victims: [],
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5)
      };
      editExistingEvidence = { media: [], text: [] };
      editResidentMetadata = null;
      originalNotes = '';
    }
    uploadedFiles = [];
    filePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    filePreviewUrls = [];
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingReport = null;
    // Clean up file preview URLs
    filePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    uploadedFiles = [];
    filePreviewUrls = [];
    editExistingEvidence = { media: [], text: [] };
    editResidentMetadata = null;
    originalNotes = '';
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
      victims: [],
      date: '',
      time: ''
    };
  }

  async function saveReport() {
    if (isSaving) return;
    isSaving = true;

    try {
      // Convert uploaded files to base64 and add to evidence
      const fileEvidence: string[] = [];
      for (const file of uploadedFiles) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          fileEvidence.push(JSON.stringify({
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name,
            dataUrl,  // Use 'dataUrl' to match parser expectations
            size: file.size
          }));
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }

      // Combine existing evidence (from original report) with new attachments
      // Use the original report's evidence array, not editForm.evidence which may contain parsed data
      const originalEvidence = editingReport && Array.isArray(editingReport.evidence) ? [...editingReport.evidence] : [];
      const updatedEvidence = [...originalEvidence, ...fileEvidence];

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

      const payload = {
        ...editForm,
        notes: finalNotes,
        evidence: updatedEvidence,
        date: editForm.date || new Date().toISOString().slice(0, 10),
        time: editForm.time || new Date().toTimeString().slice(0, 5),
        updateNote: editingReport ? 'Report details updated' : 'New report created'
      };

      let response: Response;
      if (editingReport) {
        // Update existing report
        response = await fetch(`/api/reports?id=${editingReport.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new report
        response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        upsertReport(data.report);
        closeEditModal();
        if (showReportModal && selectedReport?.id === data.report.id) {
          selectedReport = data.report;
        }
        // Clear uploaded files
        uploadedFiles = [];
        filePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        filePreviewUrls = [];
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to save report');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Error saving report');
    } finally {
      isSaving = false;
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
        crimeReports = crimeReports.filter(r => r.id !== reportId);
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

  function addArrayItem(arrayName: 'evidence' | 'suspects' | 'victims') {
    editForm[arrayName] = [...editForm[arrayName], ''];
  }

  function removeArrayItem(arrayName: 'evidence' | 'suspects' | 'victims', index: number) {
    editForm[arrayName] = editForm[arrayName].filter((_, i) => i !== index);
  }

  function getPriorityColor(priority: Report['priority']) {
    switch(priority) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  function getStatusColor(status: Report['status']) {
    switch(status) {
      case 'Solved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Under Investigation': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  async function exportReportsToPDF() {
    if (isExporting || filteredReports.length === 0) return;
    isExporting = true;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const baseFont = pdf.getFont().fontName || 'helvetica';
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      const lineHeight = 7;
      const maxWidth = pageWidth - (margin * 2);

      // Helper to add new page if needed
      const checkNewPage = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
        }
      };

      // Title
      pdf.setFontSize(20);
      pdf.setFont(baseFont, 'bold');
      pdf.text('Crime Reports Export', margin, yPos);
      yPos += lineHeight * 2;

      pdf.setFontSize(10);
      pdf.setFont(baseFont, 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      pdf.text(`Total Reports: ${filteredReports.length}`, margin + 80, yPos);
      yPos += lineHeight * 2;

      // Process each report
      for (let i = 0; i < filteredReports.length; i++) {
        const report = filteredReports[i];
        const evidence = parseEvidenceEntries(report.evidence ?? []);
        
        checkNewPage(lineHeight * 15);

        // Report header
        pdf.setFontSize(14);
        pdf.setFont(baseFont, 'bold');
        pdf.text(`${report.id} - ${report.title}`, margin, yPos);
        yPos += lineHeight;

        pdf.setFontSize(10);
        pdf.setFont(baseFont, 'normal');
        
        // Basic info
        pdf.text(`Type: ${report.type}`, margin, yPos);
        pdf.text(`Status: ${report.status}`, margin + 60, yPos);
        pdf.text(`Priority: ${report.priority}`, margin + 120, yPos);
        yPos += lineHeight;

        pdf.text(`Location: ${report.location}`, margin, yPos);
        pdf.text(`Date: ${report.date} ${report.time}`, margin + 80, yPos);
        yPos += lineHeight;

        pdf.text(`Officer: ${report.officer}`, margin, yPos);
        yPos += lineHeight * 1.5;

        // Description
        pdf.setFont(baseFont, 'bold');
        pdf.text('Description:', margin, yPos);
        yPos += lineHeight;
        pdf.setFont(baseFont, 'normal');
        const descLines = pdf.splitTextToSize(report.description || 'N/A', maxWidth);
        pdf.text(descLines, margin, yPos);
        yPos += lineHeight * descLines.length + 2;

        // Suspects
        if (report.suspects && report.suspects.length > 0) {
          checkNewPage(lineHeight * 3);
          pdf.setFont(baseFont, 'bold');
          pdf.text('Suspects:', margin, yPos);
          yPos += lineHeight;
          pdf.setFont(baseFont, 'normal');
          report.suspects.forEach(suspect => {
            pdf.text(`• ${suspect}`, margin + 5, yPos);
            yPos += lineHeight;
          });
          yPos += 2;
        }

        // Victims
        const victimsArray = Array.isArray(report.victims) ? report.victims : [report.victims];
        if (victimsArray.length > 0 && victimsArray[0]) {
          checkNewPage(lineHeight * 3);
          pdf.setFont(baseFont, 'bold');
          pdf.text('Victims:', margin, yPos);
          yPos += lineHeight;
          pdf.setFont(baseFont, 'normal');
          victimsArray.forEach(victim => {
            pdf.text(`• ${victim}`, margin + 5, yPos);
            yPos += lineHeight;
          });
          yPos += 2;
        }

        // Evidence
        if (evidence.text.length > 0) {
          checkNewPage(lineHeight * (evidence.text.length + 2));
          pdf.setFont(baseFont, 'bold');
          pdf.text('Evidence:', margin, yPos);
          yPos += lineHeight;
          pdf.setFont(baseFont, 'normal');
          evidence.text.forEach(ev => {
            pdf.text(`• ${ev}`, margin + 5, yPos);
            yPos += lineHeight;
          });
          yPos += 2;
        }

        // Media evidence - add images
        if (evidence.media.length > 0) {
          pdf.setFont(baseFont, 'bold');
          pdf.text('Media Evidence:', margin, yPos);
          yPos += lineHeight;
          
          for (const media of evidence.media) {
            if (media.type === 'image') {
              try {
                checkNewPage(60);
                
                // Load image - handle both data URLs and HTTP URLs
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve) => {
                  const timeout = setTimeout(() => {
                    pdf.text(`[Image: ${media.name} - Loading timeout]`, margin, yPos);
                    yPos += lineHeight;
                    resolve(null);
                  }, 5000);
                  
                  img.onload = () => {
                    clearTimeout(timeout);
                    try {
                      const imgWidth = 50;
                      const imgHeight = (img.height / img.width) * imgWidth;
                      
                      checkNewPage(imgHeight + lineHeight);
                      
                      pdf.text(media.name, margin, yPos);
                      yPos += lineHeight;
                      
                      // Determine image format
                      let format: 'JPEG' | 'PNG' = 'JPEG';
                      if (media.url.startsWith('data:image/png') || media.url.toLowerCase().includes('.png')) {
                        format = 'PNG';
                      }
                      
                      // Add image to PDF
                      pdf.addImage(img.src, format, margin, yPos, imgWidth, imgHeight);
                      yPos += imgHeight + 5;
                      
                      resolve(null);
                    } catch (error) {
                      console.error('Error adding image to PDF:', error);
                      pdf.text(`[Image: ${media.name} - Error]`, margin, yPos);
                      yPos += lineHeight;
                      resolve(null);
                    }
                  };
                  img.onerror = () => {
                    clearTimeout(timeout);
                    pdf.text(`[Image unavailable: ${media.name}]`, margin, yPos);
                    yPos += lineHeight;
                    resolve(null);
                  };
                  img.src = media.url;
                });
              } catch (error) {
                console.error('Error processing image:', error);
                pdf.text(`[Image: ${media.name}]`, margin, yPos);
                yPos += lineHeight;
              }
            } else if (media.type === 'video') {
              pdf.text(`[Video: ${media.name}]`, margin, yPos);
              yPos += lineHeight;
            }
          }
        }

        // Damage
        if (report.damage) {
          checkNewPage(lineHeight * 2);
          pdf.setFont(baseFont, 'bold');
          pdf.text('Damage:', margin, yPos);
          yPos += lineHeight;
          pdf.setFont(baseFont, 'normal');
          pdf.text(report.damage, margin + 5, yPos);
          yPos += lineHeight * 1.5;
        }

        // Updates
        if (report.updates && report.updates.length > 0) {
          checkNewPage(lineHeight * (report.updates.length * 2 + 2));
          pdf.setFont(baseFont, 'bold');
          pdf.text('Case Updates:', margin, yPos);
          yPos += lineHeight;
          pdf.setFont(baseFont, 'normal');
          report.updates.forEach(update => {
            pdf.text(`${update.date} ${update.time}: ${update.note}`, margin + 5, yPos);
            yPos += lineHeight;
          });
          yPos += 2;
        }

        // Notes
        if (report.notes) {
          checkNewPage(lineHeight * 3);
          pdf.setFont(baseFont, 'bold');
          pdf.text('Notes:', margin, yPos);
          yPos += lineHeight;
          pdf.setFont(baseFont, 'normal');
          const notesLines = pdf.splitTextToSize(report.notes, maxWidth);
          pdf.text(notesLines, margin + 5, yPos);
          yPos += lineHeight * notesLines.length;
        }

        // Separator between reports
        if (i < filteredReports.length - 1) {
          checkNewPage(lineHeight * 3);
          yPos += lineHeight;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPos, pageWidth - margin, yPos);
          yPos += lineHeight * 2;
        }
      }

      // Save PDF
      pdf.save(`crime-reports-export-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export reports. Please try again.');
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
  <Sidebar />
  
  <div class="transition-all duration-300 {$sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80'} p-4 lg:p-6">
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 p-8 rounded-2xl shadow-2xl mb-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-80 h-80 -mt-16 -mr-16 bg-emerald-400 opacity-20 rounded-full blur-3xl animate-float"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 -mb-12 -ml-12 bg-teal-400 opacity-20 rounded-full blur-3xl animate-float" style="animation-delay: 1s;"></div>
      
      <div class="relative z-10">
        <h1 class="text-4xl font-bold text-white mb-2">Crime Reports Management</h1>
        <p class="text-emerald-100 text-lg">Comprehensive case management and investigation tracking system</p>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Reports</p>
            <p class="text-2xl font-bold text-gray-800">{totalReports}</p>
          </div>
          <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Solved Cases</p>
            <p class="text-2xl font-bold text-emerald-600">{solvedReports}</p>
          </div>
          <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Open Cases</p>
            <p class="text-2xl font-bold text-blue-600">{openReports}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Investigating</p>
            <p class="text-2xl font-bold text-purple-600">{investigatingReports}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Critical Priority</p>
            <p class="text-2xl font-bold text-red-600">{criticalReports}</p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
      <!-- Header Controls -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">📋 Case Management</h2>
          <p class="text-gray-600">Manage and track all crime reports and investigations</p>
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            class="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center"
            on:click={() => showFilters = !showFilters}
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            Filters
          </button>
          
          <button 
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl flex items-center"
            on:click={createNewReport}
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            New Report
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="mb-8 space-y-4">
        <!-- Search Bar -->
        <div class="relative">
          <svg class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            placeholder="Search cases, locations, officers, case IDs..."
            bind:value={searchTerm}
            class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-lg"
          />
        </div>
        
        <!-- Advanced Filters -->
        {#if showFilters}
          <div class="bg-gray-50 p-6 rounded-xl border border-gray-200" in:fly={{ y: -20, duration: 300 }}>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label for="filter-status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select id="filter-status" bind:value={statusFilter} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="All">All Status</option>
                  <option value="Open">Open</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>
              <div>
                <label for="filter-priority" class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select id="filter-priority" bind:value={priorityFilter} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label for="filter-type" class="block text-sm font-medium text-gray-700 mb-2">Case Type</label>
                <select id="filter-type" bind:value={typeFilter} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="All">All Types</option>
                  <option value="Armed Robbery">Armed Robbery</option>
                  <option value="Vehicle Theft">Vehicle Theft</option>
                  <option value="Cyber Crime">Cyber Crime</option>
                  <option value="Domestic Violence">Domestic Violence</option>
                  <option value="Drug Trafficking">Drug Trafficking</option>
                  <option value="Homicide">Homicide</option>
                  <option value="Burglary">Burglary</option>
                  <option value="Assault">Assault</option>
                </select>
              </div>
              <div class="flex items-end">
                <button 
                  class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  on:click={() => {
                    statusFilter = 'All';
                    priorityFilter = 'All';
                    typeFilter = 'All';
                    searchTerm = '';
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Reports List -->
      <div class="space-y-6">
        {#each filteredViewModels as { report, resident, evidence } (report.id)}
          <div class="bg-white rounded-xl p-6 border border-gray-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-lg group" in:fly={{ y: 20, duration: 300, delay: 100 }}>
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-3">
                  <h3 class="text-xl font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                    {report.id} - {report.title}
                  </h3>
                  <span class="px-3 py-1 text-xs font-medium rounded-full border {getPriorityColor(report.priority)}">
                    {report.priority}
                  </span>
                  <span class="px-3 py-1 text-xs font-medium rounded-full border {getStatusColor(report.status)}">
                    {report.status}
                  </span>
                </div>
                
                <p class="text-gray-600 mb-4">{report.description}</p>

                <!-- Progress Stepper -->
                <div class="mb-4">
                  <div class="flex items-center gap-3">
                    {#each statusSteps as step, i}
                      <div class="flex items-center">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold {i <= getStepIndex(report.status) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}">
                          {i + 1}
                        </div>
                        <div class="ml-2 text-sm {i <= getStepIndex(report.status) ? 'text-indigo-700 font-medium' : 'text-gray-500'}">{step}</div>
                      </div>
                      {#if i < statusSteps.length - 1}
                        <div class="flex-1 h-1 rounded-full {i < getStepIndex(report.status) ? 'bg-indigo-300' : 'bg-gray-200'}"></div>
                      {/if}
                    {/each}
                  </div>
                </div>
                
                <!-- Case Details Grid -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="text-xs text-gray-500 mb-1">Type</div>
                    <div class="text-sm font-medium text-gray-800">{report.type}</div>
                  </div>
                  <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="text-xs text-gray-500 mb-1">Location</div>
                    <div class="text-sm font-medium text-gray-800">{report.location}</div>
                  </div>
                  <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="text-xs text-gray-500 mb-1">Officer</div>
                    <div class="text-sm font-medium text-gray-800">{report.officer}</div>
                  </div>
                  <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="text-xs text-gray-500 mb-1">Date & Time</div>
                    <div class="text-sm font-medium text-gray-800">{report.date} {report.time}</div>
                  </div>
                  <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="text-xs text-gray-500 mb-1">Damage</div>
                    <div class="text-sm font-medium text-gray-800">{report.damage}</div>
                  </div>
                </div>
                
                <!-- Evidence and Updates -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs text-gray-500 mb-2 font-medium">Evidence Collected</div>
                    {#if evidence.media.length > 0}
                      <div class="grid grid-cols-2 gap-2">
                        {#each evidence.media.slice(0, 4) as media}
                          <button
                            type="button"
                            class="relative group text-left p-0 bg-transparent border-none cursor-pointer"
                            on:click={() => {
                              selectedMedia = { url: media.url, name: media.name, type: media.type };
                              mediaZoom = 1;
                              showMediaViewer = true;
                            }}
                            on:keydown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectedMedia = { url: media.url, name: media.name, type: media.type };
                                mediaZoom = 1;
                                showMediaViewer = true;
                              }
                            }}
                            aria-label="View {media.name} in full screen"
                          >
                            {#if media.type === 'image'}
                              <img src={media.url} alt={media.name} class="w-full h-20 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all" loading="lazy" />
                            {:else}
                              <video src={media.url} class="w-full h-20 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all" controls preload="metadata" on:click|stopPropagation>
                                <track kind="captions" />
                              </video>
                            {/if}
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-1.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <p class="truncate font-medium">{media.name}</p>
                            </div>
                            {#if media.type === 'image'}
                              <div class="absolute top-1 right-1 bg-indigo-600/80 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Zoom</div>
                            {/if}
                          </button>
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

                {#if evidence.media.length}
                  <div class="mt-4">
                    <div class="text-xs text-gray-500 mb-2">Resident Media ({evidence.media.length})</div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {#each evidence.media as media}
                        <button
                          type="button"
                          class="space-y-1 text-left p-0 bg-transparent border-none cursor-pointer group"
                          on:click={() => {
                            selectedMedia = { url: media.url, name: media.name, type: media.type };
                            mediaZoom = 1;
                            showMediaViewer = true;
                          }}
                          on:keydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectedMedia = { url: media.url, name: media.name, type: media.type };
                              mediaZoom = 1;
                              showMediaViewer = true;
                            }
                          }}
                          aria-label="View {media.name} in full screen"
                        >
                          {#if media.type === 'image'}
                            <img src={media.url} alt={media.name} class="w-full h-24 object-cover rounded-lg border border-gray-100 group-hover:border-indigo-400 group-hover:shadow-lg transition-all" loading="lazy" />
                          {:else}
                            <video src={media.url} class="w-full h-24 object-cover rounded-lg border border-gray-100 group-hover:border-indigo-400 group-hover:shadow-lg transition-all" controls preload="metadata" on:click|stopPropagation>
                              <track kind="captions" />
                            </video>
                          {/if}
                          <div class="text-xs text-gray-600 truncate">{media.name}</div>
                          {#if media.type === 'image'}
                            <div class="text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to zoom</div>
                          {/if}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
              
              <!-- Action Buttons -->
              <div class="flex flex-col space-y-2 ml-4">
                <button 
                  class="text-indigo-600 hover:text-indigo-700 p-2 rounded-lg hover:bg-indigo-50 transition-colors" 
                  title="View Details"
                  aria-label="View Details"
                  on:click={() => viewReport(report)}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
                <button 
                  class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors" 
                  title="Edit Case"
                  aria-label="Edit Case"
                  on:click={() => openEditModal(report)}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button 
                  class="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" 
                  title="Delete Case"
                  aria-label="Delete Case"
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

      <!-- Summary Footer -->
          <div class="mt-8 pt-6 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-6 text-sm">
            <span class="text-gray-600">Showing {filteredReports.length} of {crimeReports.length} reports</span>
            <div class="flex items-center space-x-4">
              <span class="text-gray-500">Status Legend:</span>
                  <span class="w-3 h-3 bg-indigo-600 rounded-full"></span>
              <span class="text-xs text-gray-600">Solved</span>
              <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span class="text-xs text-gray-600">Open</span>
              <span class="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span class="text-xs text-gray-600">Investigating</span>
            </div>
          </div>
              <button 
            class="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center disabled:opacity-50"
            on:click={exportReportsToPDF}
            disabled={isExporting || filteredReports.length === 0}
          >
            {#if isExporting}
              <svg class="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exporting...</span>
            {:else}
              <span>Export Reports</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Report Detail Modal -->
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
          <!-- Left Column -->
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Case Information</h3>
              <div class="bg-gray-50 p-4 rounded-lg space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Status:</span>
                  <span class="px-2 py-1 text-xs font-medium rounded-full border {getStatusColor(selectedReport.status)}">
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
                  <span class="text-gray-600">Date & Time:</span>
                  <span class="font-medium">{selectedReport.date} {selectedReport.time}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Assigned Officer:</span>
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

          <!-- Right Column -->
          <div class="space-y-6">
            {#if selectedEvidence.media.length}
              <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Resident Media ({selectedEvidence.media.length})</h3>
                <div class="grid grid-cols-2 gap-4">
                  {#each selectedEvidence.media as media}
                    <button
                      type="button"
                      class="cursor-pointer group text-left"
                      on:click={() => {
                        selectedMedia = { url: media.url, name: media.name, type: media.type };
                        mediaZoom = 1;
                        showMediaViewer = true;
                      }}
                      on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectedMedia = { url: media.url, name: media.name, type: media.type };
                          mediaZoom = 1;
                          showMediaViewer = true;
                        }
                      }}
                      aria-label="View {media.name} in full screen"
                    >
                      {#if media.type === 'image'}
                        <img src={media.url} alt={media.name} class="w-full h-32 object-cover rounded-lg border border-gray-100 group-hover:border-indigo-400 group-hover:shadow-lg transition-all" loading="lazy" />
                      {:else}
                        <video src={media.url} class="w-full h-32 object-cover rounded-lg border border-gray-100 group-hover:border-indigo-400 group-hover:shadow-lg transition-all" controls preload="metadata" on:click|stopPropagation>
                          <track kind="captions" />
                        </video>
                      {/if}
                      <div class="text-xs text-gray-600 mt-1 truncate">{media.name}</div>
                      {#if media.type === 'image'}
                        <div class="text-xs text-indigo-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to zoom</div>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Suspects & Victims</h3>
              <div class="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <div class="text-sm font-medium text-gray-700 mb-2">Suspects:</div>
                  <div class="text-gray-600">
                    {#each selectedReport.suspects as suspect}
                      <div class="mb-1">• {suspect}</div>
                    {/each}
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-700 mb-2">Victims:</div>
                  <div class="text-gray-600">
                    {#each selectedReport.victims as victim}
                      <div class="mb-1">• {victim}</div>
                    {/each}
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-700 mb-2">Damage:</div>
                  <div class="text-gray-600">{selectedReport.damage}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Case Updates</h3>
              <div class="space-y-3 max-h-64 overflow-y-auto">
                {#each selectedReport.updates as update}
                  <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="flex justify-between items-start mb-1">
                      <span class="text-sm font-medium text-gray-700">{update.date} {update.time}</span>
                    </div>
                    <p class="text-sm text-gray-600">{update.note}</p>
                  </div>
                {/each}
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Notes</h3>
              <div class="bg-gray-50 p-4 rounded-lg">
                {#if selectedResidentDetails?.isStructured}
                  {#if selectedResidentDetails.message}
                    <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedResidentDetails.message}</p>
                  {:else}
                    <p class="text-gray-500 italic">Resident did not include additional notes.</p>
                  {/if}
                {:else if selectedReport.notes}
                  <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedReport.notes}</p>
                {:else}
                  <p class="text-gray-500 italic">No notes available.</p>
                {/if}
              </div>
            </div>
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
            Edit Case
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Media Viewer Modal -->
{#if showMediaViewer && selectedMedia}
  <div 
    class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4" 
    in:fade={{ duration: 200 }} 
    role="dialog"
    aria-modal="true"
    aria-label="Media viewer"
    tabindex="-1"
    on:click={() => {
      showMediaViewer = false;
      selectedMedia = null;
      mediaZoom = 1;
    }}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        showMediaViewer = false;
        selectedMedia = null;
        mediaZoom = 1;
      }
    }}
  >
    <div
      class="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center pointer-events-none"
    >
      <!-- Close Button -->
      <button 
        class="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-colors"
        aria-label="Close media viewer"
        on:click={() => {
          showMediaViewer = false;
          selectedMedia = null;
          mediaZoom = 1;
        }}
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <!-- Zoom Controls -->
      {#if selectedMedia.type === 'image'}
        <div class="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <button 
            class="bg-white/90 hover:bg-white text-gray-800 rounded-lg p-2 shadow-lg transition-colors"
            aria-label="Zoom in"
            on:click|stopPropagation={() => {
              if (mediaZoom < 3) mediaZoom += 0.25;
            }}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
            </svg>
          </button>
          <button 
            class="bg-white/90 hover:bg-white text-gray-800 rounded-lg p-2 shadow-lg transition-colors"
            aria-label="Zoom out"
            on:click|stopPropagation={() => {
              if (mediaZoom > 0.5) mediaZoom -= 0.25;
            }}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
            </svg>
          </button>
          <button 
            class="bg-white/90 hover:bg-white text-gray-800 rounded-lg p-2 shadow-lg transition-colors"
            aria-label="Reset zoom"
            on:click|stopPropagation={() => {
              mediaZoom = 1;
            }}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>

        <!-- Zoom Level Indicator -->
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/90 text-gray-800 rounded-lg px-4 py-2 shadow-lg text-sm font-medium">
          {Math.round(mediaZoom * 100)}%
        </div>
      {/if}

      <!-- Media Display -->
      <div 
        class="max-w-full max-h-[95vh] overflow-auto pointer-events-auto" 
        style="transform: scale({mediaZoom}); transform-origin: center;"
      >
        {#if selectedMedia.type === 'image'}
          <img 
            src={selectedMedia.url} 
            alt={selectedMedia.name} 
            class="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
            draggable="false"
          />
        {:else}
          <video 
            src={selectedMedia.url} 
            class="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
            controls
            autoplay
          >
            <track kind="captions" />
          </video>
        {/if}
      </div>

      <!-- Media Name -->
      <div class="absolute bottom-4 right-4 z-10 bg-white/90 text-gray-800 rounded-lg px-4 py-2 shadow-lg text-sm font-medium max-w-xs truncate pointer-events-none">
        {selectedMedia.name}
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
          <h2 class="text-2xl font-bold text-gray-800">{editingReport ? `Edit Report - ${editingReport.id}` : 'New Report'}</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close edit modal"
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
              <label for="edit-title" class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input 
                id="edit-title"
                type="text" 
                bind:value={editForm.title}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="edit-type" class="block text-sm font-medium text-gray-700 mb-2">Type *</label>
              <input 
                id="edit-type"
                type="text" 
                bind:value={editForm.type}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="edit-date" class="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input 
                id="edit-date"
                type="date" 
                bind:value={editForm.date}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="edit-time" class="block text-sm font-medium text-gray-700 mb-2">Time *</label>
              <input 
                id="edit-time"
                type="time" 
                bind:value={editForm.time}
                required
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

          <!-- Suspects -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="suspects-list" class="block text-sm font-medium text-gray-700">Suspects</label>
              <button 
                type="button"
                class="text-sm text-emerald-600 hover:text-emerald-700"
                on:click={() => addArrayItem('suspects')}
              >
                + Add Suspect
              </button>
            </div>
            <div id="suspects-list">
            <div class="space-y-2">
              {#each editForm.suspects as item, index}
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    bind:value={editForm.suspects[index]}
                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Suspect name"
                  />
                  <button 
                    type="button"
                    class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    on:click={() => removeArrayItem('suspects', index)}
                  >
                    Remove
                  </button>
                </div>
              {/each}
            </div>
            </div>
          </div>

          <!-- Victims -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="victims-list" class="block text-sm font-medium text-gray-700">Victims</label>
              <button 
                type="button"
                class="text-sm text-emerald-600 hover:text-emerald-700"
                on:click={() => addArrayItem('victims')}
              >
                + Add Victim
              </button>
            </div>
            <div id="victims-list">
            <div class="space-y-2">
              {#each editForm.victims as item, index}
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    bind:value={editForm.victims[index]}
                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Victim name"
                  />
                  <button 
                    type="button"
                    class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    on:click={() => removeArrayItem('victims', index)}
                  >
                    Remove
                  </button>
                </div>
              {/each}
            </div>
            </div>
          </div>

          <!-- File Upload Section -->
          <div>
            <div class="block text-sm font-medium text-gray-700 mb-2">
              Upload New Files or Videos
              <span class="text-xs text-gray-500 font-normal ml-2">(Add additional photos or videos related to this report)</span>
            </div>
            <div class="mt-2">
              <label for="file-upload" class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg class="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">Click to upload</span> or drag and drop</p>
                  <p class="text-xs text-gray-500">Images or Videos (PNG, JPG, MP4, MOV)</p>
                </div>
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,video/*"
                  multiple
                  on:change={handleFileUpload}
                  class="hidden"
                />
              </label>
            </div>
            
            <!-- File Previews - Show immediately after selection -->
            {#if filePreviewUrls.length > 0}
              <div class="mt-4" transition:fly={{ y: 10, duration: 300 }}>
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm font-medium text-gray-700">
                    New Files Selected ({filePreviewUrls.length})
                  </p>
                  <span class="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">Pending</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-emerald-50/30 rounded-lg border-2 border-emerald-200 border-dashed">
                  {#each filePreviewUrls as url, index}
                    <div class="relative group" transition:scale={{ duration: 200 }}>
                      {#if uploadedFiles[index]?.type.startsWith('image/')}
                        <img 
                          src={url} 
                          alt={uploadedFiles[index]?.name || 'Preview'} 
                          class="w-full h-32 object-cover rounded-lg border-2 border-emerald-400 shadow-md hover:shadow-lg transition-all" 
                          loading="eager"
                        />
                      {:else if uploadedFiles[index]?.type.startsWith('video/')}
                        <video 
                          src={url} 
                          class="w-full h-32 object-cover rounded-lg border-2 border-emerald-400 shadow-md hover:shadow-lg transition-all" 
                          controls 
                          preload="metadata"
                        >
                          <track kind="captions" />
                        </video>
                      {/if}
                      <button
                        type="button"
                        class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all hover:scale-110 z-10"
                        on:click={() => removeFile(index)}
                        aria-label="Remove attachment"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/75 to-transparent text-white text-xs p-2 rounded-b-lg">
                        <p class="truncate font-semibold" title={uploadedFiles[index]?.name}>{uploadedFiles[index]?.name || 'Unknown file'}</p>
                        {#if uploadedFiles[index]?.size}
                          <p class="text-xs text-gray-200 mt-0.5">{(uploadedFiles[index].size / 1024).toFixed(1)} KB</p>
                        {/if}
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
            {:else}
              <div class="mt-4 text-center py-4 text-sm text-gray-500">
                <p>No files selected. Select images or videos above to see previews.</p>
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
            class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={saveReport}
            disabled={isSaving || !editForm.title || !editForm.type}
          >
            {#if isSaving}
              <span class="flex items-center">
                <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            {:else}
              {editingReport ? 'Save Changes' : 'Create Report'}
            {/if}
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

<!-- New Report (Resident Submission) Modal -->
{#if showNewReportModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" in:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" in:scale={{ duration: 300 }}>
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">Submit New Report</h2>
            <p class="text-sm text-gray-600 mt-1">Fill in the information below to submit a new incident report</p>
          </div>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close new report modal"
            on:click={closeNewReportModal}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="resident-name" class="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
              <input 
                id="resident-name"
                type="text" 
                bind:value={residentForm.name}
                required
                placeholder="Enter your full name"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="resident-contact" class="block text-sm font-medium text-gray-700 mb-2">Contact Number/Email *</label>
              <input 
                id="resident-contact"
                type="text" 
                bind:value={residentForm.contact}
                required
                placeholder="Phone number or email"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="resident-address" class="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input 
                id="resident-address"
                type="text" 
                bind:value={residentForm.address}
                placeholder="Your address or incident location"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="resident-type" class="block text-sm font-medium text-gray-700 mb-2">Type of Report *</label>
              <select 
                id="resident-type"
                bind:value={residentForm.typeOfReport}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select report type</option>
                {#each reportTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="resident-date" class="block text-sm font-medium text-gray-700 mb-2">Incident Date</label>
              <input 
                id="resident-date"
                type="date" 
                bind:value={residentForm.date}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="resident-time" class="block text-sm font-medium text-gray-700 mb-2">Incident Time</label>
              <input 
                id="resident-time"
                type="time" 
                bind:value={residentForm.time}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label for="resident-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              id="resident-description"
              bind:value={residentForm.description}
              rows="4"
              placeholder="Describe the incident in detail..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            ></textarea>
          </div>

          <!-- File Upload -->
          <div>
            <label for="resident-file-upload" class="block text-sm font-medium text-gray-700 mb-2">
              Upload Images/Videos
              {#if residentFiles.length > 0}
                <span class="ml-2 text-emerald-600 font-semibold">({residentFiles.length} file{residentFiles.length > 1 ? 's' : ''} selected)</span>
              {/if}
            </label>
            <div 
              class="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 {isDragging ? 'border-emerald-500 bg-emerald-50 border-solid' : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-gray-100'}"
              role="region"
              aria-label="Resident attachments dropzone"
              on:dragover={handleDragOver}
              on:dragleave={handleDragLeave}
              on:drop={handleDrop}
            >
              <input
                type="file"
                id="resident-file-upload"
                accept="image/*,video/*"
                multiple
                on:change={handleResidentFileUpload}
                class="hidden"
              />
              <label for="resident-file-upload" class="cursor-pointer block">
                <svg class="w-12 h-12 mx-auto mb-2 {isDragging ? 'text-emerald-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p class="text-sm {isDragging ? 'text-emerald-700 font-semibold' : 'text-gray-600'} mb-1 font-medium">
                  {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
                </p>
                <p class="text-xs text-gray-500">Images and videos (PNG, JPG, MP4, etc.) - Max 10MB per file</p>
              </label>
            </div>
            
            {#if residentFilePreviewUrls.length > 0}
              <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {#each residentFilePreviewUrls as url, index}
                  <div class="relative">
                    {#if residentFiles[index]?.type.startsWith('image/')}
                      <img src={url} alt={residentFiles[index]?.name} class="w-full h-32 object-cover rounded-lg border border-gray-200" />
                    {:else if residentFiles[index]?.type.startsWith('video/')}
                      <video src={url} class="w-full h-32 object-cover rounded-lg border border-gray-200" controls preload="metadata">
                        <track kind="captions" />
                      </video>
                    {/if}
                    <button
                      type="button"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      on:click={() => removeResidentFile(index)}
                    >
                      ×
                    </button>
                    <p class="text-xs text-gray-600 mt-1 truncate">{residentFiles[index]?.name}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button 
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={closeNewReportModal}
          >
            Cancel
          </button>
          <button 
            class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={submitResidentReport}
            disabled={isSubmittingResident || !residentForm.name || !residentForm.contact || !residentForm.typeOfReport}
          >
            {#if isSubmittingResident}
              <span class="flex items-center">
                <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            {:else}
              Submit Report
            {/if}
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
