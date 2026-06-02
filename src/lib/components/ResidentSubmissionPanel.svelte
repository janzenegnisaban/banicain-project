<script lang="ts">
  import type { ResidentMetadataResult } from '$lib/utils/reportParsing';
  import { LABELS } from '$lib/constants/barangay';

  export let details: ResidentMetadataResult | null = null;

  $: officialStatus = details?.reporter?.officialInformedStatus
    ?? (details?.reporter?.officialInformed ? 'yes' : undefined);
  $: officialStatusLabel =
    officialStatus === 'yes'
      ? 'Yes — already informed'
      : officialStatus === 'no'
        ? 'No — first report via B-SAFE'
        : null;
</script>

{#if details?.isStructured}
  <div class="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 space-y-3">
    <h3 class="text-sm font-bold uppercase tracking-wide text-emerald-800">Resident Submission</h3>
    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div>
        <dt class="text-gray-500">Reporter</dt>
        <dd class="font-medium text-gray-900">{details.reporter?.name || 'Anonymous'}</dd>
      </div>
      {#if details.reporter?.contact}
        <div>
          <dt class="text-gray-500">Contact</dt>
          <dd class="font-medium text-gray-900">{details.reporter.contact}</dd>
        </div>
      {/if}
      {#if details.reporter?.address}
        <div class="sm:col-span-2">
          <dt class="text-gray-500">Location</dt>
          <dd class="font-medium text-gray-900">{details.reporter.address}</dd>
        </div>
      {/if}
      {#if details.reporter?.typeOfReport}
        <div>
          <dt class="text-gray-500">Incident type</dt>
          <dd class="font-medium text-gray-900">{details.reporter.typeOfReport}</dd>
        </div>
      {/if}
      {#if details.reporter?.incidentDetails}
        <div class="sm:col-span-2">
          <dt class="text-gray-500">{LABELS.incidentDetails}</dt>
          <dd class="text-gray-800 whitespace-pre-wrap">{details.reporter.incidentDetails}</dd>
        </div>
      {/if}
      {#if details.reporter?.witnessName}
        <div>
          <dt class="text-gray-500">{LABELS.witness}</dt>
          <dd class="font-medium text-gray-900">{details.reporter.witnessName}</dd>
        </div>
      {/if}
      {#if officialStatusLabel}
        <div class="sm:col-span-2">
          <dt class="text-gray-500">{LABELS.officialInformedQuestion}</dt>
          <dd class="font-medium text-gray-900">{officialStatusLabel}</dd>
        </div>
      {/if}
      {#if officialStatus === 'yes' && details.reporter?.officialInformed}
        <div class="sm:col-span-2">
          <dt class="text-gray-500">Official name</dt>
          <dd class="font-medium text-gray-900">{details.reporter.officialInformed}</dd>
        </div>
      {/if}
    </dl>
    {#if details.message}
      <div class="pt-2 border-t border-emerald-200/60">
        <p class="text-xs font-semibold uppercase text-emerald-700 mb-1">Notes</p>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">{details.message}</p>
      </div>
    {/if}
    {#if details.attachmentsCount > 0}
      <p class="text-xs text-emerald-700">{details.attachmentsCount} attachment(s) included</p>
    {/if}
  </div>
{/if}
