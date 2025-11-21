import type { RequestHandler } from './$types';
import {
	addReport,
	deleteReport as deleteLocalReport,
	getReports,
	replaceReports,
	seedIfEmpty,
	type Report,
	upsertReportSnapshot
} from '$lib/server/reportsStore';
import {
	deleteReportFromDatabase,
	fetchReportsFromDatabase,
	insertReportIntoDatabase,
	updateReportInDatabase
} from '$lib/server/reportRepository';
import { seedMockDataToDatabase } from '$lib/server/mockDataSeeder';

async function loadReports(): Promise<Report[]> {
	try {
		const remote = await fetchReportsFromDatabase();
		if (remote.length > 0) {
			replaceReports(remote);
			return remote;
		}
	} catch (error) {
		console.error('Failed to load reports from Supabase', error);
	}

	// If database is empty, seed with comprehensive mock data
	if (getReports().length === 0) {
		console.log('[API] Database is empty, seeding mock data...');
		try {
			const seedResult = await seedMockDataToDatabase();
			if (seedResult.success > 0) {
				console.log(`[API] Successfully seeded ${seedResult.success} mock reports`);
				// Fetch the newly seeded reports
				const seededReports = await fetchReportsFromDatabase();
				if (seededReports.length > 0) {
					replaceReports(seededReports);
					return seededReports;
				}
			}
		} catch (error) {
			console.error('[API] Failed to seed mock data:', error);
		}
	}

	// Fallback to minimal seed if mock seeding failed
	const seeded = seedIfEmpty();
	if (seeded) {
		try {
			await insertReportIntoDatabase(seeded);
		} catch (error) {
			console.error('Unable to persist seed report to Supabase', error);
		}
	}
	return getReports();
}

function asStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return (value as unknown[]).map(item => String(item));
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		return [value];
	}
	return [];
}

function buildNewReport(payload: Record<string, unknown>): Report {
	const now = new Date();
	return {
		id:
			(typeof payload.id === 'string' && payload.id) ||
			`CR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random()
				.toString(36)
				.slice(2, 6)
				.toUpperCase()}`,
		title: (payload.title as string) ?? 'Untitled Report',
		type: (payload.type as string) ?? 'Incident',
		status: 'Open',
		priority: (payload.priority as Report['priority']) ?? 'Medium',
		location: (payload.location as string) ?? 'Unknown',
		date: now.toISOString().slice(0, 10),
		time: now.toTimeString().slice(0, 5),
		officer: (payload.officer as string) ?? 'Unassigned',
		description: (payload.description as string) ?? 'No description provided.',
		evidence: asStringArray(payload.evidence),
		suspects: asStringArray(payload.suspects),
		victims: Array.isArray(payload.victims)
			? (payload.victims as string[])
			: typeof payload.victims === 'string'
				? payload.victims
				: [],
		damage: (payload.damage as string) ?? 'N/A',
		notes: (payload.notes as string) ?? 'Submitted via portal.',
		updates: [
			{
				date: now.toISOString().slice(0, 10),
				time: now.toTimeString().slice(0, 5),
				note: 'Report submitted'
			}
		],
		reporterId: typeof payload.reporterId === 'string' && payload.reporterId.length > 0 ? payload.reporterId : null
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const reporterId = url.searchParams.get('reporterId');
	let reports = await loadReports();
	let dataSource = 'memory'; // Default
	
	// Determine data source
	try {
		const dbReports = await fetchReportsFromDatabase();
		if (dbReports.length > 0) {
			dataSource = 'database';
			console.log(`[API] Serving ${dbReports.length} reports from database`);
		} else {
			console.log(`[API] No database reports found, using in-memory store`);
		}
	} catch (error) {
		console.error('[API] Error checking database:', error);
		dataSource = 'memory';
	}
	
	if (reporterId) {
		reports = reports.filter(report => report.reporterId === reporterId);
	}
	
	return new Response(JSON.stringify({ reports, source: dataSource }), {
		headers: { 'content-type': 'application/json' }
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const newReport = buildNewReport(body);
	console.log('[API] Creating new report:', newReport.id);

	let persisted: Report | null = null;
	try {
		persisted = await insertReportIntoDatabase(newReport);
		console.log('[API] Report successfully persisted to Supabase:', persisted.id);
	} catch (error) {
		console.error('[API] Failed to persist report to Supabase:', error);
		if (error instanceof Error) {
			console.error('[API] Error message:', error.message);
			console.error('[API] Error stack:', error.stack);
		}
		// Continue with in-memory store as fallback
	}

	const finalReport = persisted ?? newReport;
	addReport(finalReport);
	
	// Broadcast the new report via SSE
	if (persisted) {
		upsertReportSnapshot(finalReport, { broadcastType: 'created' });
	}

	return new Response(JSON.stringify({ report: finalReport }), {
		status: 201,
		headers: { 'content-type': 'application/json' }
	});
};

export const PUT: RequestHandler = async ({ request, url }) => {
	const id = url.searchParams.get('id');
	if (!id) {
		return new Response(JSON.stringify({ error: 'Report ID is required' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	const body = await request.json().catch(() => ({}));
	const { updateNote, ...updates } = body as Record<string, unknown> & { updateNote?: string };
	const partialUpdates = updates as Partial<Report>;
	const existing = getReports().find(report => report.id === id);
	const now = new Date();
	const historyEntry = {
		date: now.toISOString().slice(0, 10),
		time: now.toTimeString().slice(0, 5),
		note: updateNote ?? 'Report updated'
	};

	const supabasePayload: Partial<Report> = {
		...partialUpdates,
		updates:
			Array.isArray(partialUpdates.updates) && partialUpdates.updates?.length
				? partialUpdates.updates
				: [...(existing?.updates ?? []), historyEntry]
	};

	let updated: Report | null = null;
	try {
		updated = await updateReportInDatabase(id, supabasePayload);
	} catch (error) {
		console.error('Failed to update Supabase report', error);
	}

	if (updated) {
		upsertReportSnapshot(updated, { broadcastType: 'updated' });
		return new Response(JSON.stringify({ report: updated }), {
			headers: { 'content-type': 'application/json' }
		});
	}

	if (!existing) {
		return new Response(JSON.stringify({ error: 'Report not found' }), {
			status: 404,
			headers: { 'content-type': 'application/json' }
		});
	}

	const fallbackReport: Report = {
		...existing,
		...partialUpdates,
		updates: [...existing.updates, historyEntry]
	};

	upsertReportSnapshot(fallbackReport, { broadcastType: 'updated' });

	return new Response(JSON.stringify({ report: fallbackReport }), {
		headers: { 'content-type': 'application/json' }
	});
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) {
		return new Response(JSON.stringify({ error: 'Report ID is required' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	try {
		await deleteReportFromDatabase(id);
	} catch (error) {
		console.error('Failed to delete Supabase report', error);
	}

	const deleted = deleteLocalReport(id);
	if (!deleted) {
		return new Response(JSON.stringify({ error: 'Report not found' }), {
			status: 404,
			headers: { 'content-type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({ success: true, id }), {
		headers: { 'content-type': 'application/json' }
	});
};

