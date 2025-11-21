<script lang="ts">
	import '../app.css';
	import { fade } from 'svelte/transition';
	import { navigating } from '$app/stores';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>B-SAFE</title>
	<link rel="icon" href="/b-safe-logo.svg" />
</svelte:head>

<!-- Show loading indicator when navigating between pages -->
{#if $navigating}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
  >
    <div class="bg-white p-6 rounded-xl shadow-xl">
      <LoadingIndicator size="lg" color="primary" />
      <p class="mt-4 text-center text-gray-700 font-medium">Loading...</p>
    </div>
  </div>
{/if}

{@render children?.()}
