import type { PageLoad } from './$types';
import type { Report } from '$lib/types/report';
import { getSupabaseReportsSnapshot } from '$lib/services/reportSnapshot';

async function fetchReportsFromApi(fetchFn: typeof fetch) {
	const response = await fetchFn('/api/reports');
	if (!response.ok) {
		return { reports: [] as Report[], source: 'api' as const, error: 'Failed to fetch reports from API' };
	}
	const payload = await response.json().catch(() => ({}));
	return {
		reports: (payload.reports ?? []) as Report[],
		source: (payload.source ?? 'api') as 'supabase' | 'api',
		error: payload.error ?? undefined
	};
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		const reports = await getSupabaseReportsSnapshot();
		return { reports, source: 'supabase' as const };
	} catch (error) {
		console.error('[Dashboard] Supabase reports fetch failed. Falling back to API.', error);
		return fetchReportsFromApi(fetch);
	}
};

