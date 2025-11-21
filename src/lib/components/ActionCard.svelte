<script lang="ts">
  export let title = '';
  export let description = '';
  export let bgColor = 'bg-gradient-to-r from-emerald-500 to-emerald-600';
  export let hoverColor = 'hover:from-emerald-600 hover:to-emerald-700';
</script>

<div class="p-5 {bgColor} {hoverColor} text-white rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-glow relative overflow-hidden group">
  <!-- Shimmer Effect -->
  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
  
  <!-- Background Glow -->
  <div class="absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
  
  <div class="relative z-10">
    <div class="font-semibold text-lg flex items-center mb-2">
      <span class="inline-block w-2 h-2 bg-white rounded-full mr-3 group-hover:animate-pulse-glow"></span>
      {title}
    </div>
    <div class="text-sm text-white/90 group-hover:text-white transition-colors duration-300">{description}</div>
  </div>
</div>