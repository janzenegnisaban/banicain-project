<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  
  export let show = false;
  export let onClose = () => {};
  
  // Sample historical crime data
  const historicalData = [
    { month: 'January', year: 2023, count: 267 },
    { month: 'February', year: 2023, count: 251 },
    { month: 'March', year: 2023, count: 278 },
    { month: 'April', year: 2023, count: 263 },
    { month: 'May', year: 2023, count: 251 },
    { month: 'June', year: 2023, count: 243 }
  ];
</script>

{#if show}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={onClose}
    on:keydown={(e) => e.key === 'Escape' && onClose()}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="modal-title"
    in:fade={{ duration: 200 }}
  >
    <section 
      class="bg-white rounded-lg shadow-xl w-full max-w-2xl"
      role="document"
      in:fly={{ y: 20, duration: 300 }}
    >
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 id="modal-title" class="text-2xl font-bold text-gray-800">Crime History</h2>
          <button 
            class="text-gray-500 hover:text-gray-700"
            on:click={onClose}
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Crimes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each historicalData as data, i}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.month}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.year}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.count}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    {#if i < historicalData.length - 1}
                      {#if data.count > historicalData[i + 1].count}
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          +{data.count - historicalData[i + 1].count} (+{((data.count - historicalData[i + 1].count) / historicalData[i + 1].count * 100).toFixed(1)}%)
                        </span>
                      {:else}
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          -{historicalData[i + 1].count - data.count} (-{((historicalData[i + 1].count - data.count) / historicalData[i + 1].count * 100).toFixed(1)}%)
                        </span>
                      {/if}
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button 
            class="bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded"
            on:click={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </section>
  </div>
{/if}