import type { Report, ReportPriority, ReportStatus, ReportUpdate } from '$lib/types/report';

export type ReportRow = {
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

export type ReportUpdateRow = {
	report_id: string;
	comment: string | null;
	created_at: string;
};

export const REPORT_SELECT =
	'id,title,type,status,priority,location,date,time,officer,description,evidence,suspects,victims,damage,notes,reporter_id,created_at,updated_at';

const fallbackDate = () => new Date().toISOString().slice(0, 10);
const fallbackTime = () => new Date().toTimeString().slice(0, 5);

export function asStringArray(value: string[] | string | null | undefined): string[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.filter(Boolean);
	return value ? [value] : [];
}

function normalizeStatus(rawStatus: string): ReportStatus {
	const statusMap: Record<string, ReportStatus> = {
		open: 'Open',
		in_progress: 'Under Investigation',
		investigating: 'Under Investigation',
		closed: 'Solved',
		resolved: 'Solved'
	};

	return statusMap[rawStatus?.toLowerCase?.()] ?? 'Open';
}

function normalizePriority(rawPriority: string): ReportPriority {
	const priorityMap: Record<string, ReportPriority> = {
		low: 'Low',
		medium: 'Medium',
		high: 'High',
		critical: 'Critical'
	};

	return priorityMap[rawPriority?.toLowerCase?.()] ?? 'Medium';
}

export function mapRowToReport(row: ReportRow): Report {
	return {
		id: row.id,
		title: row.title,
		type: row.type,
		status: normalizeStatus(row.status),
		priority: normalizePriority(row.priority),
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
		updates: [],
		reporterId: row.reporter_id ?? null
	};
}

export function mapStatusToDb(status: ReportStatus): string {
	const statusMap: Record<ReportStatus, string> = {
		Open: 'open',
		'Under Investigation': 'investigating',
		Solved: 'resolved'
	};
	return statusMap[status] ?? 'open';
}

export function mapPriorityToDb(priority: ReportPriority): string {
	const priorityMap: Record<ReportPriority, string> = {
		Low: 'low',
		Medium: 'medium',
		High: 'high',
		Critical: 'critical'
	};
	return priorityMap[priority] ?? 'medium';
}

export function mapUpdateRow(row: ReportUpdateRow): ReportUpdate {
	const created = new Date(row.created_at);
	return {
		note: row.comment || 'Update',
		date: created.toISOString().slice(0, 10),
		time: created.toTimeString().slice(0, 5)
	};
}

export function groupUpdatesByReportId(rows: ReportUpdateRow[]): Map<string, ReportUpdate[]> {
	const grouped = new Map<string, ReportUpdate[]>();
	for (const row of rows) {
		const update = mapUpdateRow(row);
		if (!grouped.has(row.report_id)) {
			grouped.set(row.report_id, []);
		}
		grouped.get(row.report_id)!.push(update);
	}
	return grouped;
}

