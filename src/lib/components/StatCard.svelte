<script lang="ts">
  export let title = '';
  export let value = '';
  export let change = 0;
  export let subtitle = '';
  export let onClick = null;
  export let bgColor = 'bg-white/80';
  export let textColor = 'text-gray-600';
  export let valueColor = 'text-gray-800';
</script>

{#if onClick}
  <button 
    class="{bgColor} backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-500 hover:shadow-xl cursor-pointer hover:scale-[1.02] border border-white/50 hover:border-emerald-200/50 relative overflow-hidden w-full text-left group"
    on:click={onClick}
  >
    <div class="absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl"></div>
    <h2 class="{textColor} text-sm font-medium mb-2 flex items-center group-hover:text-emerald-700 transition-colors duration-300">
      <span class="inline-block w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mr-2 animate-pulse-glow"></span>
      {title}
    </h2>
    <div class="flex items-center">
      <div class="text-3xl font-bold {valueColor} transition-all duration-300 group-hover:text-emerald-600">{value}</div>
      {#if change !== 0}
        <div class="ml-3 text-xs font-medium {change > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'} px-3 py-1 rounded-full transition-all duration-300">
          {change > 0 ? '+' : ''}{change}%
        </div>
      {/if}
    </div>
    <div class="text-xs text-gray-500 mt-2 font-medium group-hover:text-gray-600 transition-colors duration-300">{subtitle}</div>
  </button>
{:else}
  <div class="{bgColor} backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-500 hover:shadow-xl border border-white/50 hover:border-emerald-200/50 relative overflow-hidden group">
    <div class="absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl"></div>
    <h2 class="{textColor} text-sm font-medium mb-2 flex items-center group-hover:text-emerald-700 transition-colors duration-300">
      <span class="inline-block w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mr-2 animate-pulse-glow"></span>
      {title}
    </h2>
    <div class="flex items-center">
      <div class="text-3xl font-bold {valueColor} transition-all duration-300 group-hover:text-emerald-600">{value}</div>
      {#if change !== 0}
        <div class="ml-3 text-xs font-medium {change > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'} px-3 py-1 rounded-full transition-all duration-300">
          {change > 0 ? '+' : ''}{change}%
        </div>
      {/if}
    </div>
    <div class="text-xs text-gray-500 mt-2 font-medium group-hover:text-gray-600 transition-colors duration-300">{subtitle}</div>
  </div>
{/if}