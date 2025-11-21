<script lang="ts">
  type Transaction = {
    incidentType: string;
    status: string;
    location: string;
    date: string;
  };

  export let transactions: Transaction[] = [];
  
  // Function to get status color class for crime reports
  function getStatusColor(status: string) {
    switch(status) {
      case 'Solved': return 'bg-green-500';
      case 'Open': return 'bg-yellow-500';
      case 'Cold': return 'bg-blue-500';
      case 'Urgent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
</script>

<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-gray-200">
    <thead>
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incident Type</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#each transactions as transaction}
        <tr>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.incidentType}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(transaction.status)} text-white">
              {transaction.status}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.location}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.date}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>