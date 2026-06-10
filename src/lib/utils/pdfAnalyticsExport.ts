import { jsPDF } from 'jspdf';
import { LABELS } from '$lib/constants/barangay';
import { PdfDashboard } from '$lib/utils/pdfDashboard';
import type { Report } from '$lib/types/report';

export type AnalyticsSnapshot = {
	totalCases: number;
	solvedRate: number;
	crimeTrend: string;
	crimeTrendPercentage: number;
	hotSpots: string[];
	topCrimeTypes: Array<{ type: string; count: number; percentage: number }>;
	monthlyTrends: Array<{ month: string; cases: number; solved: number }>;
};

export type InsightItem = {
	type: 'info' | 'success' | 'warning';
	title: string;
	description: string;
};

export function exportAnalyticalReportPdf(
	analytics: AnalyticsSnapshot,
	insights: InsightItem[]
): void {
	const pdf = new jsPDF('p', 'mm', 'a4');
	const dash = new PdfDashboard(pdf);
	dash.setDocTitle(LABELS.analyticalReport);

	const trendLabel =
		analytics.crimeTrend.charAt(0).toUpperCase() + analytics.crimeTrend.slice(1);

	dash.drawHeader(LABELS.analyticalReport, 'Dashboard summary for barangay officials');
	dash.drawKpiRow([
		{ label: 'Total cases', value: analytics.totalCases.toLocaleString() },
		{ label: 'Solved rate', value: `${analytics.solvedRate}%` },
		{ label: 'Incident trend', value: trendLabel },
		{
			label: 'Trend change',
			value: `${analytics.crimeTrendPercentage}%`,
			accent:
				analytics.crimeTrend === 'increasing'
					? [220, 38, 38]
					: analytics.crimeTrend === 'decreasing'
						? [5, 150, 105]
						: [107, 114, 128]
		}
	]);

	dash.drawSection('Top incident types');
	if (analytics.topCrimeTypes.length) {
		const max = Math.max(...analytics.topCrimeTypes.map((c) => c.count), 1);
		analytics.topCrimeTypes.forEach((item) => {
			dash.drawBarChartRow(item.type, item.count, max, ` (${item.percentage.toFixed(1)}%)`);
		});
	} else {
		dash.drawParagraph('No data', 'No incident type data available for this period.');
	}

	dash.drawSection('High-risk areas');
	if (analytics.hotSpots.length && analytics.hotSpots[0] !== 'No data available') {
		dash.drawTable(
			['#', 'Location'],
			analytics.hotSpots.map((spot, i) => [String(i + 1), spot]),
			[12, dash.contentWidth - 12]
		);
	} else {
		dash.drawParagraph('No data', 'Insufficient location data to identify hot spots.');
	}

	dash.drawSection('Monthly trends (last 6 months)');
	if (analytics.monthlyTrends.length) {
		dash.drawTable(
			['Month', 'Cases', 'Solved', 'Rate'],
			analytics.monthlyTrends.map((t) => [
				t.month,
				String(t.cases),
				String(t.solved),
				t.cases > 0 ? `${((t.solved / t.cases) * 100).toFixed(0)}%` : '—'
			]),
			[40, 30, 30, 30]
		);
	}

	dash.drawSection('Key insights');
	if (insights.length) {
		insights.forEach((insight) => dash.drawInsightCard(insight.type, insight.title, insight.description));
	} else {
		dash.drawParagraph('Insights', 'No automated insights generated for this dataset.');
	}

	dash.save(`analytical-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportPredictionReportPdf(options: {
	analytics: AnalyticsSnapshot;
	reportsCount: number;
	accuracy: number;
	highRiskAreas: string[];
	predictedCases: number;
	lastMonthCases: number;
	predictedTypes: Array<{ type: string; predictedCount: number; riskLevel: string }>;
	recommendations: string[];
}): void {
	const pdf = new jsPDF('p', 'mm', 'a4');
	const dash = new PdfDashboard(pdf);
	dash.setDocTitle(LABELS.predictionReport);

	const trendLabel =
		options.analytics.crimeTrend.charAt(0).toUpperCase() + options.analytics.crimeTrend.slice(1);

	dash.drawHeader(LABELS.predictionReport, 'AI-assisted forecast for resource planning');
	dash.drawKpiRow([
		{ label: 'Model accuracy', value: `${options.accuracy.toFixed(1)}%` },
		{ label: 'Historical reports', value: options.reportsCount },
		{ label: 'Predicted next month', value: options.predictedCases },
		{ label: 'Current month', value: options.lastMonthCases },
		{ label: 'Trend', value: trendLabel }
	]);

	dash.drawSection('Predicted high-risk areas');
	const areas = options.highRiskAreas.filter((a) => a !== 'Analyzing patterns...');
	if (areas.length) {
		dash.drawTable(
			['#', 'Area', 'Action'],
			areas.map((area, i) => [String(i + 1), area, 'Increase patrol']),
			[12, 80, 48]
		);
	} else {
		dash.drawParagraph('Areas', 'Insufficient data for area-level predictions.');
	}

	dash.drawSection('Predicted incident types (next month)');
	if (options.predictedTypes.length) {
		dash.drawTable(
			['Type', 'Predicted cases', 'Risk'],
			options.predictedTypes.slice(0, 8).map((p) => [
				p.type,
				String(p.predictedCount),
				p.riskLevel
			]),
			[70, 40, 30]
		);
	}

	dash.drawSection('Recommendations');
	options.recommendations.forEach((rec) => dash.drawInsightCard('info', 'Recommendation', rec));

	dash.save(`prediction-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportAnalyticsDataPdf(
	analytics: AnalyticsSnapshot,
	insights: InsightItem[],
	reports: Report[]
): void {
	const pdf = new jsPDF('p', 'mm', 'a4');
	const dash = new PdfDashboard(pdf);
	dash.setDocTitle('Analytics Data Export');

	dash.drawHeader('Analytics Data Export', `Full dataset snapshot — ${reports.length} reports`);
	dash.drawKpiRow([
		{ label: 'Reports in DB', value: reports.length },
		{ label: 'Cases analyzed', value: analytics.totalCases },
		{ label: 'Solved rate', value: `${analytics.solvedRate}%` },
		{
			label: 'Trend',
			value: analytics.crimeTrend.charAt(0).toUpperCase() + analytics.crimeTrend.slice(1)
		}
	]);

	dash.drawSection('High-risk areas');
	if (analytics.hotSpots.length && analytics.hotSpots[0] !== 'No data available') {
		dash.drawTable(
			['#', 'Location'],
			analytics.hotSpots.map((spot, i) => [String(i + 1), spot]),
			[12, dash.contentWidth - 12]
		);
	}

	dash.drawSection('Monthly trends');
	if (analytics.monthlyTrends.length) {
		dash.drawTable(
			['Month', 'Cases', 'Solved', 'Rate'],
			analytics.monthlyTrends.map((t) => [
				t.month,
				String(t.cases),
				String(t.solved),
				t.cases > 0 ? `${((t.solved / t.cases) * 100).toFixed(0)}%` : '—'
			]),
			[40, 30, 30, 30]
		);
	}

	dash.drawSection('Key insights');
	insights.forEach((insight) => dash.drawInsightCard(insight.type, insight.title, insight.description));

	dash.drawSection('Top incident types');
	if (analytics.topCrimeTypes.length) {
		const max = Math.max(...analytics.topCrimeTypes.map((c) => c.count), 1);
		analytics.topCrimeTypes.forEach((item) => {
			dash.drawBarChartRow(item.type, item.count, max, ` (${item.percentage.toFixed(1)}%)`);
		});
	}

	dash.drawSection('Recent reports');
	const rows = reports.slice(0, 25).map((r, i) => [
		String(i + 1),
		r.title.length > 40 ? r.title.slice(0, 38) + '…' : r.title,
		r.type,
		r.status,
		r.priority
	]);
	dash.drawTable(['#', 'Title', 'Type', 'Status', 'Priority'], rows, [10, 62, 28, 38, 22]);

	if (reports.length > 25) {
		dash.drawParagraph('Note', `… and ${reports.length - 25} more reports not shown in this export.`);
	}

	dash.save(`analytics-export-${new Date().toISOString().split('T')[0]}.pdf`);
}
