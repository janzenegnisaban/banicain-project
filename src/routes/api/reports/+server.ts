import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	addReport,
	deleteReport as deleteLocalReport,
	getReports,
	replaceReports,
	seedIfEmpty,
	upsertReportSnapshot
} from '$lib/server/reportsStore';
import type { Report } from '$lib/types/report';
import {
	deleteReportFromDatabase,
	fetchReportsFromDatabase,
	insertReportIntoDatabase,
	updateReportInDatabase
} from '$lib/server/reportRepository';
import { seedMockDataToDatabase } from '$lib/server/mockDataSeeder';
import { getSupabaseClientForRequest } from '$lib/server/supabase';

async function loadReports(client?: SupabaseClient): Promise<Report[]> {
	// Source of truth is Supabase. No more in-memory seeding here.
	const remote = await fetchReportsFromDatabase(client);
	replaceReports(remote);
	return remote;
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

export const GET: RequestHandler = async ({ url, request }) => {
	const authHeader = request.headers.get('authorization') ?? undefined;
	const dbClient = getSupabaseClientForRequest(authHeader);
	const reporterId = url.searchParams.get('reporterId');

	try {
		let reports = await loadReports(dbClient);

		if (reporterId) {
			reports = reports.filter((report) => report.reporterId === reporterId);
		}

		return new Response(JSON.stringify({ reports, source: 'database' }), {
			headers: { 'content-type': 'application/json' }
		});
	} catch (error) {
		console.error('[API] Failed to load reports:', error);
		return new Response(JSON.stringify({ reports: [], source: 'database', error: 'Failed to load reports' }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization') ?? undefined;
	const dbClient = getSupabaseClientForRequest(authHeader);
	const body = await request.json().catch(() => ({}));
	const newReport = buildNewReport(body);
	console.log('[API] Creating new report:', newReport.id);

	let persisted: Report | null = null;
	try {
		persisted = await insertReportIntoDatabase(newReport, dbClient);
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
	const authHeader = request.headers.get('authorization') ?? undefined;
	const dbClient = getSupabaseClientForRequest(authHeader);
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
		updated = await updateReportInDatabase(id, supabasePayload, dbClient);
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

export const DELETE: RequestHandler = async ({ url, request }) => {
	const authHeader = request.headers.get('authorization') ?? undefined;
	const dbClient = getSupabaseClientForRequest(authHeader);
	const id = url.searchParams.get('id');
	if (!id) {
		return new Response(JSON.stringify({ error: 'Report ID is required' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	try {
		await deleteReportFromDatabase(id, dbClient);
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

