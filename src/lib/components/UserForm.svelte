<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let editing: any = null;
  const dispatch = createEventDispatcher();

  let name = editing?.name ?? '';
  let email = editing?.email ?? '';
  let role = editing?.role ?? 'user';

  $: if (editing) {
    name = editing.name;
    email = editing.email;
    role = editing.role ?? 'user';
  }

  function save() {
    const payload = { id: editing?.id, name, email, role };
    dispatch('save', payload);
  }
  function cancel() { dispatch('cancel'); }
</script>

<div class="fixed inset-0 flex items-center justify-center bg-black/30">
  <div class="bg-white p-6 rounded-lg w-full max-w-md">
    <h3 class="text-lg font-semibold mb-4">{editing ? 'Edit user' : 'Add user'}</h3>
    <div class="space-y-3">
      <div>
        <label class="block text-sm">Name</label>
        <input class="input" bind:value={name} />
      </div>
      <div>
        <label class="block text-sm">Email</label>
        <input class="input" bind:value={email} type="email" />
      </div>
      <div>
        <label class="block text-sm">Role</label>
        <select class="input" bind:value={role}>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="manager">manager</option>
        </select>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-secondary" on:click={cancel}>Cancel</button>
        <button class="btn-primary" on:click={save}>{editing ? 'Save' : 'Create'}</button>
      </div>
    </div>
  </div>
</div>