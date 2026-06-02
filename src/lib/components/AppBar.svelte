<script lang="ts">
  export let title = '';
  export let subtitle = '';
  export let username = '';
  export let role = '';
  /** 'glass' = sticky top bar (dashboard); 'gradient' = rounded hero header (reports) */
  export let variant: 'glass' | 'gradient' = 'glass';
  export let sticky = true;
  export let showUser = true;
</script>

{#if variant === 'gradient'}
  <header class="mb-8 relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 p-6 lg:p-8">
    <div
      class="absolute top-0 right-0 w-80 h-80 -mt-16 -mr-16 bg-emerald-400 opacity-20 rounded-full blur-3xl animate-float"
      aria-hidden="true"
    ></div>
    <div
      class="absolute bottom-0 left-0 w-64 h-64 -mb-12 -ml-12 bg-teal-400 opacity-20 rounded-full blur-3xl animate-float"
      style="animation-delay: 1s;"
      aria-hidden="true"
    ></div>

    <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-3xl lg:text-4xl font-bold text-white mb-1">{title}</h1>
        {#if subtitle}
          <p class="text-emerald-100 text-base lg:text-lg">{subtitle}</p>
        {/if}
        {#if showUser && username}
          <p class="text-emerald-50/90 text-sm mt-2">
            Welcome, <span class="font-semibold text-white">{username}</span>
            {#if role}<span class="text-emerald-100/80"> ({role})</span>{/if}
          </p>
        {/if}
      </div>
      {#if $$slots.actions}
        <div class="flex flex-wrap items-center gap-3">
          <slot name="actions" />
        </div>
      {/if}
    </div>

    {#if $$slots.default}
      <div class="relative z-10 mt-4">
        <slot />
      </div>
    {/if}
  </header>
{:else}
  <header class="{sticky ? 'sticky top-0 z-40' : ''} mb-6 lg:mb-8">
    <div class="bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 shadow-sm">
      <div class="p-4 lg:p-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1
              class="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1"
            >
              {title}
            </h1>
            {#if subtitle}
              <p class="text-gray-600 text-sm lg:text-base">{subtitle}</p>
            {/if}
            {#if showUser && username}
              <div class="flex items-center gap-2 mt-2">
                <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true"></span>
                <p class="text-sm text-gray-500">
                  Welcome, <span class="font-semibold text-emerald-700">{username}</span>
                  {#if role}<span class="text-gray-400"> ({role})</span>{/if}
                </p>
              </div>
            {/if}
          </div>
          {#if $$slots.actions}
            <div class="flex flex-wrap items-center gap-3">
              <slot name="actions" />
            </div>
          {/if}
        </div>

        {#if $$slots.default}
          <div class="mt-4">
            <slot />
          </div>
        {/if}
      </div>
    </div>
  </header>
{/if}
