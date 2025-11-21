<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let users: Array<any> = [];
  const dispatch = createEventDispatcher();

  function edit(u: any) { dispatch('edit', u); }
  function del(id: string) { dispatch('delete', id); }
</script>

<div class="mt-4">
  {#if users.length === 0}
    <p class="text-sm text-gray-500">No users yet.</p>
  {:else}
    <div class="space-y-3">
      {#each users as u}
        <div class="p-3 bg-white rounded-md flex items-center justify-between border">
          <div>
            <div class="font-medium">{u.name} <span class="text-sm text-gray-500">({u.email})</span></div>
            <div class="text-xs text-gray-400">Role: {u.role ?? 'user'}</div>
          </div>
          <div class="flex gap-2">
            <button class="text-sm text-blue-600" on:click={()=>edit(u)}>Edit</button>
            <button class="text-sm text-red-600" on:click={()=>del(u.id)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>