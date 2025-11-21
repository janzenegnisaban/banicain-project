import type { RequestHandler } from './$types';
import { getReports, registerClient, replaceReports, seedIfEmpty, unregisterClient } from '$lib/server/reportsStore';
import { fetchReportsFromDatabase } from '$lib/server/reportRepository';

async function ensureReportsSnapshot() {
	try {
		const remote = await fetchReportsFromDatabase();
		if (remote.length) {
			replaceReports(remote);
			return;
		}
	} catch (error) {
		console.error('Failed to hydrate SSE reports from Supabase', error);
	}
	if (getReports().length === 0) {
		seedIfEmpty();
	}
}

export const GET: RequestHandler = async () => {
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

			await ensureReportsSnapshot();

			// initial snapshot
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


