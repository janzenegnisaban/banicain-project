import { supabase } from '$lib/supabaseClient';
import {
	REPORT_SELECT,
	type ReportRow,
	type ReportUpdateRow,
	groupUpdatesByReportId,
	mapRowToReport
} from '$lib/reportMapper';
import type { Report } from '$lib/types/report';

async function fetchReportUpdates(reportIds: string[]) {
	if (reportIds.length === 0) {
		return new Map<string, Report['updates']>();
	}

	const { data, error } = await supabase
		.from('report_updates')
		.select('report_id,comment,created_at')
		.in('report_id', reportIds)
		.order('created_at', { ascending: true });

	if (error) {
		throw error;
	}

	return data ? groupUpdatesByReportId(data as ReportUpdateRow[]) : new Map<string, Report['updates']>();
}

export async function getSupabaseReportsSnapshot(): Promise<Report[]> {
	const { data, error } = await supabase
		.from('reports')
		.select(REPORT_SELECT)
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}

	if (!data || data.length === 0) {
		return [];
	}

	const mapped = (data as ReportRow[]).map(mapRowToReport);
	try {
		const updatesByReportId = await fetchReportUpdates(mapped.map(report => report.id));
		return mapped.map(report => ({
			...report,
			updates: updatesByReportId.get(report.id) ?? report.updates
		}));
	} catch (updateError) {
		console.warn('[Supabase] Unable to hydrate report updates, continuing with report rows only', updateError);
		return mapped;
	}
}

