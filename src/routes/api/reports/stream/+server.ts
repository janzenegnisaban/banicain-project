import type { RequestHandler } from './$types';
import { getReports, registerClient, replaceReports, seedIfEmpty, unregisterClient } from '$lib/server/reportsStore';
import { fetchReportsFromDatabase } from '$lib/server/reportRepository';

// Cache for reports snapshot to avoid excessive database queries
let reportsCache: { reports: ReturnType<typeof getReports>; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds cache - reduce database load

// Invalidate cache when reports are updated (called from reports API)
// This ensures fresh data after mutations
export function _invalidateReportsCache() {
	reportsCache = null;
}

async function ensureReportsSnapshot() {
	// First check if in-memory store already has reports (most common case)
	// This avoids database queries when reports are already loaded
	if (getReports().length > 0) {
		return; // Already have reports in memory, no need to fetch
	}

	// Check cache to avoid excessive database queries
	const now = Date.now();
	if (reportsCache && (now - reportsCache.timestamp) < CACHE_TTL) {
		// Restore from cache
		replaceReports(reportsCache.reports);
		return;
	}

	// Only fetch from database if we have no reports and cache is stale
	try {
		const remote = await fetchReportsFromDatabase();
		if (remote.length) {
			replaceReports(remote);
			// Update cache
			reportsCache = { reports: [...remote], timestamp: now };
			return;
		}
	} catch (error) {
		console.error('Failed to hydrate SSE reports from Supabase', error);
	}
	
	// Only seed if we have no reports at all
	if (getReports().length === 0) {
		seedIfEmpty();
		const seeded = getReports();
		if (seeded.length > 0) {
			reportsCache = { reports: [...seeded], timestamp: now };
		}
	}
}

export const GET: RequestHandler = async () => {
	// Ensure snapshot is loaded once before creating stream
	await ensureReportsSnapshot();
	let cleanup: (() => void) | undefined;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let closed = false;

			const safeWrite = (data: string) => {
				if (closed) return;
				controller.enqueue(encoder.encode(data));
			};

			const safeClose = () => {
				cleanup?.();
			};

			const clientId = registerClient(safeWrite, safeClose);

			// Don't fetch again - use the already loaded snapshot

			// initial snapshot - use already loaded reports
			safeWrite(`data: ${JSON.stringify({ type: 'init', reports: getReports() })}\n\n`);

			// keepalive
			const keepalive = setInterval(() => {
				safeWrite(':\n\n');
			}, 30000);

			cleanup = () => {
				if (closed) return;
				closed = true;
				clearInterval(keepalive);
				unregisterClient(clientId, { skipClose: true });
				try {
					controller.close();
				} catch {
					// controller might already be closed
				}
			};
		},
		cancel() {
			cleanup?.();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			'connection': 'keep-alive'
		}
	});
};


