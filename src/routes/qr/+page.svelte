<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import { BARANGAY_NAME, LABELS } from '$lib/constants/barangay';

  let portalUrl = '';
  let qrImageUrl = '';

  onMount(() => {
    portalUrl = `${window.location.origin}/residents`;
    qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(portalUrl)}`;
  });
</script>

<svelte:head>
  <title>Scan QR — B-SAFE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center px-4 py-12">
  <PageTransition duration={300}>
    <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-center text-white">
        <img src="/b-safe-logo.svg" alt="B-SAFE" class="w-16 h-16 mx-auto mb-3" />
        <h1 class="text-2xl font-bold">Scan to Report</h1>
        <p class="text-emerald-100 text-sm mt-1">{BARANGAY_NAME}</p>
      </div>

      <div class="p-8 text-center">
        <p class="text-gray-600 text-sm mb-6">
          Point your phone camera at this QR code to open the resident incident portal instantly — no app install required.
        </p>

        {#if qrImageUrl}
          <div class="inline-block p-4 bg-white border-2 border-emerald-100 rounded-2xl shadow-inner mb-6">
            <img src={qrImageUrl} alt="QR code linking to B-SAFE resident portal" width="280" height="280" class="mx-auto" />
          </div>
        {:else}
          <div class="h-[280px] flex items-center justify-center text-gray-400">Generating QR…</div>
        {/if}

        <p class="text-xs text-gray-500 break-all mb-6">{portalUrl}</p>

        <div class="space-y-3">
          <button
            type="button"
            class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all"
            on:click={() => goto('/residents')}
          >
            Open {LABELS.incident} Form
          </button>
          <button
            type="button"
            class="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            on:click={() => goto('/login?role=resident')}
          >
            Sign in to track reports
          </button>
          <button
            type="button"
            class="w-full py-2 text-sm text-gray-500 hover:text-emerald-700 transition-colors"
            on:click={() => goto('/')}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  </PageTransition>
</div>
