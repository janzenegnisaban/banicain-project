import type { SupabaseClient } from '@supabase/supabase-js';
import type { Report } from '$lib/types/report';
import {
	REPORT_SELECT,
	type ReportRow,
	type ReportUpdateRow,
	asStringArray,
	groupUpdatesByReportId,
	mapPriorityToDb,
	mapRowToReport,
	mapStatusToDb
} from '$lib/reportMapper';
import { supabase } from './supabase';

function resolveClient(client?: SupabaseClient) {
	return client ?? supabase;
}

function serializeReport(report: Report) {
	return {
		// Let the database generate the UUID for `id`.
		// The returned row's `id` will be mapped back into the Report type.
		title: report.title,
		type: report.type,
		status: mapStatusToDb(report.status),
		priority: mapPriorityToDb(report.priority),
		location: report.location,
		location_name: report.location, // Use same value for location_name
		date: report.date,
		time: report.time,
		officer: report.officer,
		description: report.description,
		evidence: report.evidence ?? [],
		suspects: Array.isArray(report.suspects) ? report.suspects : report.suspects ? [report.suspects] : [],
		victims: Array.isArray(report.victims) ? report.victims : report.victims ? [report.victims] : [],
		damage: report.damage,
		notes: report.notes,
		report_type: 'crime', // Default to 'crime' as per schema
		reporter_id: report.reporterId ?? null
		// Note: 'updates' is not included - it's stored in report_updates table separately
	};
}

function serializePartial(updates: Partial<Report>) {
	const payload: Record<string, unknown> = {};
	if ('title' in updates) payload.title = updates.title;
	if ('type' in updates) payload.type = updates.type;
	if ('status' in updates) payload.status = mapStatusToDb(updates.status as Report['status']);
	if ('priority' in updates) payload.priority = mapPriorityToDb(updates.priority as Report['priority']);
	if ('location' in updates) {
		payload.location = updates.location;
		payload.location_name = updates.location; // Update both
	}
	if ('date' in updates) payload.date = updates.date;
	if ('time' in updates) payload.time = updates.time;
	if ('officer' in updates) payload.officer = updates.officer;
	if ('description' in updates) payload.description = updates.description;
	if ('evidence' in updates) payload.evidence = asStringArray(updates.evidence as string[] | string | undefined);
	if ('suspects' in updates) payload.suspects = asStringArray(updates.suspects as string[] | string | undefined);
	if ('victims' in updates)
		payload.victims = Array.isArray(updates.victims)
			? updates.victims
			: updates.victims
				? [updates.victims]
				: [];
	if ('damage' in updates) payload.damage = updates.damage;
	if ('notes' in updates) payload.notes = updates.notes;
	// Note: 'updates' is not included - it's stored in report_updates table separately
	if ('reporterId' in updates) payload.reporter_id = updates.reporterId ?? null;
	return payload;
}

export async function fetchReportsFromDatabase(client?: SupabaseClient): Promise<Report[]> {
	console.log('[Database] Fetching reports from Supabase...');
	const db = resolveClient(client);
	
	const { data: reportsData, error: reportsError } = await db
		.from('reports')
		.select(REPORT_SELECT)
		.order('created_at', { ascending: false });

	if (reportsError) {
		console.error('[Database] Error fetching reports:', reportsError.message);
		throw new Error(reportsError.message);
	}

	if (!reportsData || reportsData.length === 0) {
		console.log('[Database] No reports found in database');
		return [];
	}

	console.log(`[Database] Successfully fetched ${reportsData.length} reports from Supabase`);

	const reportIds = reportsData.map(r => r.id);
	console.log(`[Database] Fetching updates for ${reportIds.length} reports...`);
	
	const { data: updatesData } = await db
		.from('report_updates')
		.select('report_id,comment,created_at')
		.in('report_id', reportIds)
		.order('created_at', { ascending: true });

	if (updatesData) {
		console.log(`[Database] Found ${updatesData.length} report updates`);
	}

	const updatesByReportId = updatesData ? groupUpdatesByReportId(updatesData as ReportUpdateRow[]) : new Map();

	// Map reports and attach updates
	return reportsData.map(row => {
		const report = mapRowToReport(row);
		// Attach updates from report_updates table
		const updates = updatesByReportId.get(row.id) || [];
		if (updates.length > 0) {
			report.updates = updates;
		}
		return report;
	});
}

export async function insertReportIntoDatabase(report: Report, client?: SupabaseClient): Promise<Report> {
	console.log('[Database] Inserting report into Supabase:', report.id);
	const payload = serializeReport(report);
	console.log('[Database] Serialized payload:', JSON.stringify(payload, null, 2));
	const db = resolveClient(client);
	
	const { data, error } = await db.from('reports').insert(payload).select(REPORT_SELECT).single();

	if (error) {
		console.error('[Database] Error inserting report:', error);
		console.error('[Database] Error details:', JSON.stringify(error, null, 2));
		throw new Error(error.message ?? 'Failed to persist report');
	}

	if (!data) {
		console.error('[Database] No data returned from insert');
		throw new Error('Failed to persist report - no data returned');
	}

	console.log('[Database] Successfully inserted report:', data.id);
	
	// Insert initial update if provided
	if (report.updates && report.updates.length > 0) {
		const initialUpdate = report.updates[0];
		try {
			await db.from('report_updates').insert({
				report_id: report.id,
				comment: initialUpdate.note,
				created_at: new Date(`${initialUpdate.date}T${initialUpdate.time}`).toISOString()
			});
			console.log('[Database] Inserted initial update for report:', report.id);
		} catch (updateError) {
			console.error('[Database] Error inserting update (non-fatal):', updateError);
			// Don't throw - report was created successfully
		}
	}

	return mapRowToReport(data);
}

export async function updateReportInDatabase(
	id: string,
	updates: Partial<Report>,
	client?: SupabaseClient
): Promise<Report | null> {
	const db = resolveClient(client);
	const payload = serializePartial(updates);
	if (Object.keys(payload).length === 0) {
		const { data } = await db.from('reports').select(REPORT_SELECT).eq('id', id).maybeSingle();
		return data ? mapRowToReport(data) : null;
	}

	const { data, error } = await db
		.from('reports')
		.update(payload)
		.eq('id', id)
		.select(REPORT_SELECT)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	return data ? mapRowToReport(data) : null;
}

export async function deleteReportFromDatabase(id: string, client?: SupabaseClient): Promise<boolean> {
	const db = resolveClient(client);
	const { data, error } = await db.from('reports').delete().eq('id', id).select('id').maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	return Boolean(data);
}

