<script>
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  
  // Props
  export let duration = 300;
  export let delay = 100;
  
  // Page load animation control
  let pageLoaded = false;
  
  onMount(() => {
    // Slight delay to ensure smooth transition
    setTimeout(() => {
      pageLoaded = true;
    }, delay);
  });
</script>

{#if pageLoaded}
  <div in:fade={{ duration, delay }}>
    <slot></slot>
  </div>
{/if}