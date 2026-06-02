<script lang="ts">
  import type { ReportPriority } from '$lib/types/report';

  export let priority: ReportPriority | string = 'Medium';
  export let size: 'sm' | 'md' = 'md';

  const styles: Record<string, string> = {
    Critical: 'bg-red-100 text-red-800 border-red-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };

  $: cls = styles[priority] ?? styles.Medium;
  $: sizeCls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
</script>

<span class="inline-flex items-center gap-1 rounded-full border font-semibold {cls} {sizeCls}">
  {priority}
</span>
