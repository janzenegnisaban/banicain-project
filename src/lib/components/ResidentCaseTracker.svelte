<script lang="ts">
  import type { Report } from '$lib/types/report';
  import { LABELS } from '$lib/constants/barangay';
  import IncidentWorkflowSteps from '$lib/components/IncidentWorkflowSteps.svelte';
  import PriorityBadge from '$lib/components/PriorityBadge.svelte';
  import {
    parseEvidenceEntries,
    parseResidentMetadata,
    type MediaAttachment
  } from '$lib/utils/reportParsing';

  export let report: Report;
  /** `dashboard` = light card; `panel` = dark glass on residents page */
  export let variant: 'dashboard' | 'panel' = 'dashboard';
  export let defaultExpanded = false;

  let showAttachments = defaultExpanded;
  let showTimeline = defaultExpanded;
  let lightboxMedia: MediaAttachment | null = null;

  $: evidence = parseEvidenceEntries(report.evidence ?? []);
  $: residentMeta = parseResidentMetadata(report.notes ?? '');
  $: submissionAttachments = residentMeta.attachmentsCount;
  $: updates = Array.isArray(report.updates) ? [...report.updates].reverse() : [];
  $: mediaItems = evidence.media;
  $: hasTracking = updates.length > 0 || mediaItems.length > 0;

  function formatUpdateLabel(note: string): string {
    if (note.startsWith('Progress report:')) {
      return note.replace(/^Progress report:\s*/i, '');
    }
    return note;
  }

  function isProgressUpdate(note: string): boolean {
    return /progress report:/i.test(note);
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div
  class={variant === 'panel'
    ? 'rounded-2xl border border-white/10 bg-black/25 p-4 space-y-4'
    : 'rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-4'}
>
  <div class="rounded-xl border {variant === 'panel' ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-emerald-100 bg-white'} p-3">
    <IncidentWorkflowSteps status={report.status} compact />
  </div>

  <!-- Status / progress notes -->
  <div>
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 text-left"
      on:click={() => (showTimeline = !showTimeline)}
    >
      <span
        class="text-sm font-semibold {variant === 'panel' ? 'text-white' : 'text-slate-800'}"
      >
        {LABELS.progressReport}s & status
        {#if updates.length}
          <span class="ml-1 text-xs font-normal opacity-70">({updates.length})</span>
        {/if}
      </span>
      <span class="text-xs {variant === 'panel' ? 'text-emerald-300' : 'text-emerald-700'}">
        {showTimeline ? 'Hide' : 'Show'}
      </span>
    </button>

    {#if showTimeline}
      <div class="mt-3 space-y-3">
        {#if updates.length === 0}
          <p class="text-sm {variant === 'panel' ? 'text-slate-400' : 'text-slate-500'}">
            No official updates yet. You will see progress notes here when barangay officials review your case.
          </p>
        {:else}
          {#each updates as update, idx (idx)}
            <div
              class="flex gap-3 rounded-lg p-3 {variant === 'panel'
                ? 'bg-white/5 border border-white/10'
                : 'bg-white border border-slate-100'}"
            >
              <span
                class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {isProgressUpdate(update.note)
                  ? 'bg-emerald-500'
                  : 'bg-sky-400'}"
              ></span>
              <div class="min-w-0 flex-1">
                {#if isProgressUpdate(update.note)}
                  <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">
                    {LABELS.progressReport}
                  </p>
                {/if}
                <p class="text-sm {variant === 'panel' ? 'text-slate-100' : 'text-slate-800'}">
                  {formatUpdateLabel(update.note)}
                </p>
                <p class="text-xs mt-1 {variant === 'panel' ? 'text-slate-500' : 'text-slate-400'}">
                  {update.date}{update.time ? ` · ${update.time}` : ''}
                </p>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>

  <!-- Attachments -->
  <div>
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 text-left"
      on:click={() => (showAttachments = !showAttachments)}
    >
      <span
        class="text-sm font-semibold {variant === 'panel' ? 'text-white' : 'text-slate-800'}"
      >
        Case attachments
        {#if mediaItems.length}
          <span class="ml-1 text-xs font-normal opacity-70">({mediaItems.length})</span>
        {:else if submissionAttachments}
          <span class="ml-1 text-xs font-normal opacity-70">({submissionAttachments} submitted)</span>
        {/if}
      </span>
      <span class="text-xs {variant === 'panel' ? 'text-emerald-300' : 'text-emerald-700'}">
        {showAttachments ? 'Hide' : 'Show'}
      </span>
    </button>

    {#if showAttachments}
      <div class="mt-3">
        {#if mediaItems.length === 0}
          <p class="text-sm {variant === 'panel' ? 'text-slate-400' : 'text-slate-500'}">
            {#if submissionAttachments > 0}
              {submissionAttachments} file(s) were submitted with this report. They may still be processing.
            {:else}
              No photo or video attachments on this report.
            {/if}
          </p>
        {:else}
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {#each mediaItems as media (media.id)}
              <button
                type="button"
                class="group relative overflow-hidden rounded-xl border {variant === 'panel'
                  ? 'border-white/15 bg-black/40'
                  : 'border-slate-200 bg-white'} text-left transition hover:ring-2 hover:ring-emerald-400"
                on:click={() => media.type === 'image' && (lightboxMedia = media)}
              >
                {#if media.type === 'image'}
                  <img
                    src={media.url}
                    alt={media.name}
                    class="h-28 w-full object-cover"
                    loading="lazy"
                  />
                {:else}
                  <video
                    src={media.url}
                    class="h-28 w-full object-cover"
                    controls
                    preload="metadata"
                    on:click|stopPropagation
                  >
                    <track kind="captions" />
                  </video>
                {/if}
                <div
                  class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5"
                >
                  <p class="text-[10px] text-white truncate">{media.name}</p>
                  {#if media.size}
                    <p class="text-[9px] text-white/70">{formatFileSize(media.size)}</p>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
          <p class="text-xs mt-2 {variant === 'panel' ? 'text-slate-500' : 'text-slate-400'}">
            Tap an image to view full size. Videos play inline.
          </p>
        {/if}
      </div>
    {/if}
  </div>

  {#if !hasTracking}
    <p class="text-xs {variant === 'panel' ? 'text-slate-500' : 'text-slate-400'}">
      Check back here for official progress notes and your submitted evidence as the case moves forward.
    </p>
  {/if}
</div>

{#if lightboxMedia}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Attachment preview"
    on:click={() => (lightboxMedia = null)}
    on:keydown={(e) => e.key === 'Escape' && (lightboxMedia = null)}
  >
    <button
      type="button"
      class="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
      on:click={() => (lightboxMedia = null)}
    >
      Close
    </button>
    <img
      src={lightboxMedia.url}
      alt={lightboxMedia.name}
      class="max-h-[90vh] max-w-full rounded-lg object-contain"
    />
  </div>
{/if}
