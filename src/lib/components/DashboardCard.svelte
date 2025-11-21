<script lang="ts">
  export let title = '';
</script>

<div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg mb-6 transition-all duration-500 hover:shadow-xl hover:bg-white/90 border border-white/50 hover:border-emerald-200/50 group">
  {#if title}
    <h2 class="text-gray-800 font-semibold mb-4 flex items-center group-hover:text-emerald-700 transition-colors duration-300">
      <span class="inline-block w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mr-3 animate-pulse-glow"></span>
      {title}
    </h2>
  {/if}
  <slot></slot>
</div>