<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
  <Sidebar />
  
  <div class="lg:ml-64 p-4 lg:p-6">
    <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/50">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">Settings</h1>
      <p class="text-gray-600 mb-6">Configure system settings and preferences.</p>
      
      <div class="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
        <h2 class="text-xl font-semibold text-emerald-700 mb-4">⚙️ System Configuration</h2>
        <p class="text-emerald-600">This section will contain:</p>
        <ul class="list-disc list-inside mt-2 space-y-1 text-emerald-600">
          <li>General system settings</li>
          <li>Notification preferences</li>
          <li>Security settings</li>
          <li>Backup and restore</li>
          <li>System maintenance</li>
        </ul>
      </div>
    </div>
  </div>
</div>
