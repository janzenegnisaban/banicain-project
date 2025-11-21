import type { Report } from './reportsStore';
import { supabase } from './supabase';

type ReportRow = {
	id: string;
	title: string;
	type: string;
	status: string;
	priority: string;
	location: string | null;
	date: string | null;
	time: string | null;
	officer: string | null;
	description: string | null;
	evidence: string[] | string | null;
	suspects: string[] | string | null;
	victims: string[] | string | null;
	damage: string | null;
	notes: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	reporter_id?: string | null;
};

const REPORT_SELECT =
	'id,title,type,status,priority,location,date,time,officer,description,evidence,suspects,victims,damage,notes,reporter_id,created_at,updated_at';

const fallbackDate = () => new Date().toISOString().slice(0, 10);
const fallbackTime = () => new Date().toTimeString().slice(0, 5);

function asStringArray(value: string[] | string | null | undefined): string[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.filter(Boolean);
	return value ? [value] : [];
}

function normalizeUpdates(
	updates: Array<{ note: string; date?: string | null; time?: string | null }> | null | undefined
): Report['updates'] {
	if (!updates || updates.length === 0) {
		return [];
	}
	return updates.map(update => ({
		note: update.note,
		date: update.date ?? fallbackDate(),
		time: update.time ?? fallbackTime()
	}));
}

// Map database status values to application status values
function mapStatus(dbStatus: string): Report['status'] {
	const statusMap: Record<string, Report['status']> = {
		'open': 'Open',
		'in_progress': 'Under Investigation',
		'investigating': 'Under Investigation',
		'closed': 'Solved',
		'resolved': 'Solved'
	};
	return statusMap[dbStatus.toLowerCase()] || 'Open';
}

// Map database priority values to application priority values
function mapPriority(dbPriority: string): Report['priority'] {
	const priorityMap: Record<string, Report['priority']> = {
		'low': 'Low',
		'medium': 'Medium',
		'high': 'High',
		'critical': 'Critical'
	};
	return priorityMap[dbPriority.toLowerCase()] || 'Medium';
}

function mapRowToReport(row: ReportRow): Report {
	return {
		id: row.id,
		title: row.title,
		type: row.type,
		status: mapStatus(row.status),
		priority: mapPriority(row.priority),
		location: row.location ?? 'Unknown',
		date: row.date ?? fallbackDate(),
		time: row.time ?? fallbackTime(),
		officer: row.officer ?? 'Unassigned',
		description: row.description ?? 'No description provided.',
		evidence: asStringArray(row.evidence),
		suspects: asStringArray(row.suspects),
		victims: (Array.isArray(row.victims) ? row.victims : row.victims ? [row.victims] : []) ?? [],
		damage: row.damage ?? 'N/A',
		notes: row.notes ?? '',
		updates: [], // Updates are fetched separately from report_updates table
		reporterId: row.reporter_id ?? null
	};
}

// Map application status to database status
function mapStatusToDb(status: Report['status']): string {
	const statusMap: Record<Report['status'], string> = {
		'Open': 'open',
		'Under Investigation': 'investigating',
		'Solved': 'resolved'
	};
	return statusMap[status] || 'open';
}

// Map application priority to database priority
function mapPriorityToDb(priority: Report['priority']): string {
	const priorityMap: Record<Report['priority'], string> = {
		'Low': 'low',
		'Medium': 'medium',
		'High': 'high',
		'Critical': 'critical'
	};
	return priorityMap[priority] || 'medium';
}

function serializeReport(report: Report) {
	return {
		id: report.id,
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

export async function fetchReportsFromDatabase(): Promise<Report[]> {
	console.log('[Database] Fetching reports from Supabase...');
	
	// First fetch all reports
	const { data: reportsData, error: reportsError } = await supabase
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

	// Fetch updates for all reports
	const reportIds = reportsData.map(r => r.id);
	console.log(`[Database] Fetching updates for ${reportIds.length} reports...`);
	
	const { data: updatesData } = await supabase
		.from('report_updates')
		.select('report_id,comment,created_at')
		.in('report_id', reportIds)
		.order('created_at', { ascending: true });

	if (updatesData) {
		console.log(`[Database] Found ${updatesData.length} report updates`);
	}

	// Group updates by report_id
	const updatesByReportId = new Map<string, Array<{ note: string; date: string; time: string }>>();
	if (updatesData) {
		for (const update of updatesData) {
			if (!updatesByReportId.has(update.report_id)) {
				updatesByReportId.set(update.report_id, []);
			}
			const date = new Date(update.created_at);
			updatesByReportId.get(update.report_id)!.push({
				note: update.comment || 'Update',
				date: date.toISOString().slice(0, 10),
				time: date.toTimeString().slice(0, 5)
			});
		}
	}

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

export async function insertReportIntoDatabase(report: Report): Promise<Report> {
	console.log('[Database] Inserting report into Supabase:', report.id);
	const payload = serializeReport(report);
	console.log('[Database] Serialized payload:', JSON.stringify(payload, null, 2));
	
	const { data, error } = await supabase.from('reports').insert(payload).select(REPORT_SELECT).single();

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
			await supabase.from('report_updates').insert({
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

export async function updateReportInDatabase(id: string, updates: Partial<Report>): Promise<Report | null> {
	const payload = serializePartial(updates);
	if (Object.keys(payload).length === 0) {
		const { data } = await supabase.from('reports').select(REPORT_SELECT).eq('id', id).maybeSingle();
		return data ? mapRowToReport(data) : null;
	}

	const { data, error } = await supabase
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

export async function deleteReportFromDatabase(id: string): Promise<boolean> {
	const { data, error } = await supabase.from('reports').delete().eq('id', id).select('id').maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	return Boolean(data);
}

