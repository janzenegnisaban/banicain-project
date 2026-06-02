<script lang="ts">
  import OfficialLayout from '$lib/components/OfficialLayout.svelte';
</script>

<OfficialLayout
  title="Settings"
  subtitle="Configure system preferences and portal options"
  variant="gradient"
>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <section class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50">
      <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">⚙️</span>
        General
      </h2>
      <ul class="space-y-3 text-sm text-gray-600">
        <li class="flex items-center justify-between py-2 border-b border-gray-100">
          <span>Barangay name</span>
          <span class="font-medium text-gray-800">Brgy. Banicain</span>
        </li>
        <li class="flex items-center justify-between py-2 border-b border-gray-100">
          <span>Portal timezone</span>
          <span class="font-medium text-gray-800">Asia/Manila (PHT)</span>
        </li>
        <li class="flex items-center justify-between py-2">
          <span>Default report priority</span>
          <span class="font-medium text-amber-700">High (resident submissions)</span>
        </li>
      </ul>
    </section>

    <section class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50">
      <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">🔔</span>
        Notifications
      </h2>
      <p class="text-sm text-gray-600 leading-relaxed">
        Email and SMS alerts for new resident reports will be configured here in a future release.
        Officials currently receive live updates via the dashboard stream.
      </p>
    </section>

    <section class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 lg:col-span-2">
      <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">🔒</span>
        Security
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <p class="font-semibold text-emerald-800">Supabase Auth</p>
          <p class="text-emerald-700 mt-1">Active — email/password sign-in for residents and officials.</p>
        </div>
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <p class="font-semibold text-emerald-800">Role-based access</p>
          <p class="text-emerald-700 mt-1">Official routes and APIs require authenticated officer roles.</p>
        </div>
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <p class="font-semibold text-amber-800">Guest reports</p>
          <p class="text-amber-700 mt-1">Anonymous submissions allowed; sign-in required to track history.</p>
        </div>
      </div>
    </section>
  </div>
</OfficialLayout>
