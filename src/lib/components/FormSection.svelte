<script lang="ts">
  export let title = '';
  export let description = '';
  export let step = 1;
  export let totalSteps = 3;
</script>

<section class="rounded-2xl border border-emerald-100/80 bg-white/90 shadow-sm overflow-hidden">
  <div class="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/80">
    <div class="flex items-center gap-3 min-w-0">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
        {step}
      </span>
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-gray-900">{title}</h2>
        {#if description}
          <p class="text-xs text-gray-600 truncate">{description}</p>
        {/if}
      </div>
    </div>
    <span class="text-xs font-medium text-emerald-700 shrink-0">Step {step} of {totalSteps}</span>
  </div>
  <div class="p-5 md:p-6">
    <slot />
  </div>
</section>
