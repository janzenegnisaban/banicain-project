<script lang="ts">
  import { onMount } from 'svelte';
  
  export let chartId = 'barChart';
  export let labels: string[] = [];
  export let values: number[] = [];
  export let color = '#10b981'; // Default to primary green
  export let title = 'Chart';
  export let subtitle = '';
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationFrame: number;
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      renderChart();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  });
  
  function renderChart() {
    if (!ctx || !canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (values.length === 0) return;
    
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...values);
    const barWidth = chartWidth / values.length * 0.8;
    const barSpacing = chartWidth / values.length * 0.2;
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw bars with animation
    values.forEach((value, index) => {
      const x = padding.left + index * (barWidth + barSpacing) + barSpacing / 2;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      // Bar shadow
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.fillRect(x + 2, y + 2, barWidth, barHeight);
      
      // Main bar with gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#34d399');
      gradient.addColorStop(1, '#10b981');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Bar border
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      // Value label on top of bar
      if (value > 0) {
        ctx.fillStyle = '#374151';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + barWidth / 2, y - 8);
      }
    });
    
    // Draw axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis labels
    labels.forEach((label, index) => {
      const x = padding.left + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2;
      const y = height - padding.bottom / 2;
      ctx.fillText(label, x, y);
    });
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const value = Math.round((maxValue / gridLines) * (gridLines - i));
      ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }
  }
  
  // Responsive resize handler
  function handleResize() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = requestAnimationFrame(renderChart);
  }
  
  onMount(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  });
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-md">
  <div class="mb-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
    {#if subtitle}
      <p class="text-sm text-gray-500">{subtitle}</p>
    {/if}
  </div>
  
  <div class="relative">
    <canvas 
      bind:this={canvas}
      class="w-full h-64"
      style="max-height: 256px;"
    ></canvas>
    
    {#if values.length === 0}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <p class="text-gray-500 text-sm">No data available</p>
        </div>
      </div>
    {/if}
  </div>
  
  {#if values.length > 0}
    <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-sm bg-gradient-to-b from-primary-400 to-primary-600 mr-2"></div>
        <span>Data Points: {values.length}</span>
      </div>
      <div class="flex items-center">
        <span class="mr-2">Max: {Math.max(...values)}</span>
        <span>Min: {Math.min(...values)}</span>
      </div>
    </div>
  {/if}
</div>