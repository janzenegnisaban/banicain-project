import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	addReport,
	deleteReport as deleteLocalReport,
	getReports,
	replaceReports,
	upsertReportSnapshot
} from '$lib/server/reportsStore';
import type { Report } from '$lib/types/report';
import {
	deleteReportFromDatabase,
	fetchReportsFromDatabase,
	insertReportIntoDatabase,
	updateReportInDatabase
} from '$lib/server/reportRepository';
import { getSupabaseClientForRequest } from '$lib/server/supabase';
import {
	authError,
	getSessionUser,
	isAuthResponse,
	isOfficialRole,
	requireOfficialUser
} from '$lib/server/auth';
import { parseResidentMetadata } from '$lib/utils/reportParsing';

async function loadReports(client?: SupabaseClient): Promise<Report[]> {
	const cached = getReports();
	if (cached.length > 0) {
		return cached;
	}

	const remote = await fetchReportsFromDatabase(client);
	replaceReports(remote);
	return remote;
}

function asStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return (value as unknown[]).map((item) => String(item));
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		return [value];
	}
	return [];
}

const allowedStatuses: Report['status'][] = [
	'Pending Confirmation',
	'Open',
	'Under Investigation',
	'Solved'
];

function normalizeStatusInput(value: unknown): Report['status'] | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	return allowedStatuses.find((status) => status.toLowerCase() === normalized) ?? null;
}

function isResidentSubmission(payload: Record<string, unknown>): boolean {
	const hasReporterId =
		typeof payload.reporterId === 'string' && payload.reporterId.trim().length > 0;
	const notes = typeof payload.notes === 'string' ? payload.notes : '';
	const parsedNotes = parseResidentMetadata(notes);
	return hasReporterId || parsedNotes.isStructured;
}

function buildNewReport(payload: Record<string, unknown>): Report {
	const now = new Date();
	const requestedStatus = normalizeStatusInput(payload.status);
	const status: Report['status'] = isResidentSubmission(payload)
		? 'Pending Confirmation'
		: (requestedStatus ?? 'Open');
	const initialUpdateNote =
		status === 'Pending Confirmation'
			? 'Report submitted and awaiting official confirmation'
			: 'Report submitted';
	return {
		id:
			(typeof payload.id === 'string' && payload.id) ||
			`CR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random()
				.toString(36)
				.slice(2, 6)
				.toUpperCase()}`,
		title: (payload.title as string) ?? 'Untitled Report',
		type: (payload.type as string) ?? 'Incident',
		status,
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
				note: initialUpdateNote
			}
		],
		reporterId:
			typeof payload.reporterId === 'string' && payload.reporterId.length > 0
				? payload.reporterId
				: null
	};
}

export const GET: RequestHandler = async ({ url, request }) => {
	const authHeader = request.headers.get('authorization') ?? undefined;
	const dbClient = getSupabaseClientForRequest(authHeader);
	const reporterId = url.searchParams.get('reporterId');
	const sessionUser = await getSessionUser(request);

	try {
		if (reporterId) {
			if (!sessionUser) {
				return authError('Sign in required to view your reports');
			}
			if (sessionUser.id !== reporterId && !isOfficialRole(sessionUser.role)) {
				return authError('You can only view your own reports', 403);
			}

			let reports = await loadReports(dbClient);
			reports = reports.filter((report) => report.reporterId === reporterId);

			return new Response(JSON.stringify({ reports, source: 'database' }), {
				headers: { 'content-type': 'application/json' }
			});
		}

		const official = await requireOfficialUser(request);
		if (isAuthResponse(official)) {
			return official;
		}

		const reports = await loadReports(dbClient);
		return new Response(JSON.stringify({ reports, source: 'database' }), {
			headers: { 'content-type': 'application/json' }
		});
	} catch (error) {
		console.error('[API] Failed to load reports:', error);
		return new Response(
			JSON.stringify({ reports: [], source: 'database', error: 'Failed to load reports' }),
			{
				status: 500,
				headers: { 'content-type': 'application/json' }
			}
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization') ?? undefined;
	const dbClient = getSupabaseClientForRequest(authHeader);
	const sessionUser = await getSessionUser(request);
	const body = await request.json().catch(() => ({}));

	const residentSubmission = isResidentSubmission(body);

	if (!residentSubmission) {
		const official = await requireOfficialUser(request);
		if (isAuthResponse(official)) {
			return official;
		}
	}

	if (residentSubmission && body.reporterId) {
		if (!sessionUser) {
			return authError('Sign in required to link this report to your account');
		}
		if (sessionUser.id !== body.reporterId) {
			return authError('Reporter ID does not match your account', 403);
		}
	}

	const newReport = buildNewReport(body);
	console.log('[API] Creating new report:', newReport.id);

	let persisted: Report | null = null;
	try {
		persisted = await insertReportIntoDatabase(newReport, dbClient);
		console.log('[API] Report successfully persisted to Supabase:', persisted.id);
	} catch (error) {
		console.error('[API] Failed to persist report to Supabase:', error);
		if (residentSubmission) {
			return new Response(
				JSON.stringify({
					error: 'Unable to save your report. Please try again or contact barangay officials.'
				}),
				{ status: 500, headers: { 'content-type': 'application/json' } }
			);
		}
	}

	const finalReport = persisted ?? newReport;
	addReport(finalReport);

	if (persisted) {
		upsertReportSnapshot(finalReport, { broadcastType: 'created' });
	}

	return new Response(JSON.stringify({ report: finalReport }), {
		status: 201,
		headers: { 'content-type': 'application/json' }
	});
};

export const PUT: RequestHandler = async ({ request, url }) => {
	const official = await requireOfficialUser(request);
	if (isAuthResponse(official)) {
		return official;
	}

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
	const existing = getReports().find((report) => report.id === id);
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
		return new Response(JSON.stringify({ error: 'Failed to update report' }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
	}

	if (updated) {
		try {
			await dbClient.from('report_updates').insert({
				report_id: updated.id,
				comment: historyEntry.note,
				created_at: new Date(`${historyEntry.date}T${historyEntry.time}`).toISOString()
			});
		} catch (historyError) {
			console.error('[API] Failed to insert report update history (non-fatal):', historyError);
		}

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
	const official = await requireOfficialUser(request);
	if (isAuthResponse(official)) {
		return official;
	}

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
		return new Response(JSON.stringify({ error: 'Failed to delete report' }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
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
