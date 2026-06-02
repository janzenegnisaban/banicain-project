<script lang="ts">
  import type { ReportStatus } from '$lib/types/report';

  export let status: ReportStatus | string = 'Pending Confirmation';
  export let compact = false;

  const steps = [
    { key: 'Pending Confirmation', label: 'Submitted', short: 'Submitted' },
    { key: 'Open', label: 'Confirmed', short: 'Open' },
    { key: 'Under Investigation', label: 'Investigating', short: 'Active' },
    { key: 'Solved', label: 'Resolved', short: 'Done' }
  ];

  function stepIndex(value: string): number {
    const idx = steps.findIndex((s) => s.key === value);
    return idx >= 0 ? idx : 0;
  }

  $: current = stepIndex(status);
</script>

<div class={compact ? 'space-y-2' : 'space-y-3'}>
  <div class="flex items-center justify-between gap-1">
    {#each steps as step, index}
      <div class="flex flex-1 flex-col items-center gap-1.5 min-w-0">
        <div
          class="h-3 w-3 rounded-full border-2 transition-colors {index <= current
            ? 'bg-emerald-500 border-emerald-500'
            : 'bg-white border-gray-300'}"
        ></div>
        <span class="text-[10px] sm:text-xs font-medium text-center leading-tight {index <= current ? 'text-emerald-800' : 'text-gray-400'}">
          {compact ? step.short : step.label}
        </span>
      </div>
      {#if index < steps.length - 1}
        <div class="h-0.5 flex-1 mb-5 {index < current ? 'bg-emerald-400' : 'bg-gray-200'}"></div>
      {/if}
    {/each}
  </div>
</div>
