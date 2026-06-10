import { jsPDF } from 'jspdf';
import { LABELS } from '$lib/constants/barangay';
import { PdfDashboard } from '$lib/utils/pdfDashboard';
import { parseEvidenceEntries, parseResidentMetadata } from '$lib/utils/reportParsing';
import type { Report } from '$lib/types/report';

function formatReportId(id: string | null | undefined): string {
	if (!id) return 'N/A';
	if (id.includes('RPT-') && id.length <= 11) return id;
	return id.length > 6 ? `...${id.slice(-6)}` : id;
}

export type ReportExportStats = {
	total: number;
	pending: number;
	open: number;
	investigating: number;
	solved: number;
	critical: number;
};

export async function exportReportsDashboardPdf(
	reports: Report[],
	stats: ReportExportStats
): Promise<void> {
	const pdf = new jsPDF('p', 'mm', 'a4');
	const dash = new PdfDashboard(pdf);
	dash.setDocTitle('Incident Reports');

	dash.drawHeader('Incident Reports Export', `${reports.length} report(s) in this export`);
	dash.drawKpiRow([
		{ label: 'Total', value: stats.total, accent: [5, 150, 105] },
		{ label: 'Pending', value: stats.pending, accent: [217, 119, 6] },
		{ label: 'Open', value: stats.open, accent: [37, 99, 235] },
		{ label: 'Investigating', value: stats.investigating, accent: [124, 58, 237] },
		{ label: 'Solved', value: stats.solved, accent: [5, 150, 105] },
		{ label: 'Critical', value: stats.critical, accent: [220, 38, 38] }
	]);

	// Summary table
	dash.drawSection('Reports at a glance');
	const summaryRows = reports.map((r) => [
		formatReportId(r.shortId || r.id),
		(r.title || '').length > 35 ? (r.title || '').slice(0, 33) + '…' : r.title || '',
		r.type,
		r.status,
		r.priority
	]);
	dash.drawTable(
		['Ref', 'Title', 'Type', 'Status', 'Priority'],
		summaryRows,
		[22, 58, 28, 38, 24]
	);

	// Detail cards
	dash.drawSection('Report details');
	for (let i = 0; i < reports.length; i++) {
		const report = reports[i];
		const evidence = parseEvidenceEntries(report.evidence ?? []);
		const resident = parseResidentMetadata(report.notes ?? '');

		dash.drawReportCard({
			index: i + 1,
			title: report.title,
			refId: formatReportId(report.shortId || report.id),
			type: report.type,
			status: report.status,
			priority: report.priority,
			location: report.location,
			dateTime: `${report.date} ${report.time}`,
			officer: report.officer,
			description: report.description,
			respondents: report.suspects?.filter(Boolean),
			complainants: Array.isArray(report.victims)
				? report.victims.filter(Boolean)
				: report.victims
					? [report.victims]
					: [],
			updates: report.updates?.slice(-3)
		});

		if (resident.isStructured) {
			const officialLine =
				resident.reporter?.officialInformedStatus === 'yes'
					? `Yes — ${resident.reporter?.officialInformed || 'official named'}`
					: resident.reporter?.officialInformedStatus === 'no'
						? 'No — first report via B-SAFE'
						: '';
			const residentLines = [
				resident.reporter?.name && `Reporter: ${resident.reporter.name}`,
				resident.reporter?.contact && `Contact: ${resident.reporter.contact}`,
				resident.reporter?.incidentDetails &&
					`${LABELS.incidentDetails}: ${resident.reporter.incidentDetails}`,
				officialLine && `Official informed: ${officialLine}`
			].filter(Boolean) as string[];
			if (residentLines.length) {
				dash.drawBulletList('Resident submission', residentLines);
			}
		}

		if (evidence.text.length) {
			dash.drawBulletList('Evidence', evidence.text);
		}

		if (report.updates && report.updates.length > 3) {
			dash.drawBulletList(
				`${LABELS.progressReport}s`,
				report.updates.map((u) => `${u.date} ${u.time}: ${u.note}`)
			);
		}

		// Media thumbnails (first 2 images per report)
		const images = evidence.media.filter((m) => m.type === 'image').slice(0, 2);
		for (const media of images) {
			try {
				dash.ensureSpace(45);
				const img = new Image();
				img.crossOrigin = 'anonymous';
				await new Promise<void>((resolve) => {
					const timeout = setTimeout(() => resolve(), 5000);
					img.onload = () => {
						clearTimeout(timeout);
						try {
							const imgW = 45;
							const imgH = (img.height / img.width) * imgW;
							dash.pdf.setFontSize(7);
							dash.pdf.setTextColor(107, 114, 128);
							dash.pdf.text(media.name, dash.margin, dash.y);
							dash.y += 4;
							const format: 'JPEG' | 'PNG' =
								media.url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
							dash.pdf.addImage(img.src, format, dash.margin, dash.y, imgW, imgH);
							dash.y += imgH + 4;
						} catch {
							/* skip broken image */
						}
						resolve();
					};
					img.onerror = () => {
						clearTimeout(timeout);
						resolve();
					};
					img.src = media.url;
				});
			} catch {
				/* skip */
			}
		}
	}

	dash.save(`incident-reports-export-${new Date().toISOString().slice(0, 10)}.pdf`);
}
