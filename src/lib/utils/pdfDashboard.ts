import type { jsPDF } from 'jspdf';
import { BARANGAY_NAME } from '$lib/constants/barangay';

type Rgb = [number, number, number];

export const PDF_COLORS = {
	emerald: [5, 150, 105] as Rgb,
	emeraldDark: [4, 120, 87] as Rgb,
	emeraldBg: [236, 253, 245] as Rgb,
	slate: [30, 41, 59] as Rgb,
	white: [255, 255, 255] as Rgb,
	gray50: [249, 250, 251] as Rgb,
	gray100: [243, 244, 246] as Rgb,
	gray200: [229, 231, 235] as Rgb,
	gray500: [107, 114, 128] as Rgb,
	gray700: [55, 65, 81] as Rgb,
	amber: [217, 119, 6] as Rgb,
	blue: [37, 99, 235] as Rgb,
	purple: [124, 58, 237] as Rgb,
	red: [220, 38, 38] as Rgb,
	teal: [13, 148, 136] as Rgb
};

export type KpiCard = {
	label: string;
	value: string | number;
	accent?: Rgb;
};

export class PdfDashboard {
	readonly pdf: jsPDF;
	readonly margin = 14;
	readonly pageWidth: number;
	readonly pageHeight: number;
	readonly contentWidth: number;
	y = 14;
	private pageNum = 1;
	private docTitle = 'B-SAFE Report';

	constructor(pdf: jsPDF) {
		this.pdf = pdf;
		this.pageWidth = pdf.internal.pageSize.getWidth();
		this.pageHeight = pdf.internal.pageSize.getHeight();
		this.contentWidth = this.pageWidth - this.margin * 2;
	}

	setDocTitle(title: string) {
		this.docTitle = title;
	}

	ensureSpace(required: number) {
		if (this.y + required <= this.pageHeight - 18) return;
		this.addPage();
	}

	addPage() {
		this.pdf.addPage();
		this.pageNum += 1;
		this.y = 14;
		this.drawPageStrip();
	}

	private drawPageStrip() {
		const { pdf, margin, pageWidth } = this;
		pdf.setFillColor(...PDF_COLORS.emerald);
		pdf.rect(0, 0, pageWidth, 10, 'F');
		pdf.setTextColor(...PDF_COLORS.white);
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'bold');
		pdf.text('B-SAFE', margin, 6.5);
		pdf.setFont('helvetica', 'normal');
		pdf.text(this.docTitle, pageWidth - margin, 6.5, { align: 'right' });
		this.y = 16;
	}

	drawHeader(title: string, subtitle?: string) {
		const { pdf, margin, pageWidth, contentWidth } = this;
		const headerH = subtitle ? 32 : 26;

		pdf.setFillColor(...PDF_COLORS.emerald);
		pdf.roundedRect(margin, this.y, contentWidth, headerH, 3, 3, 'F');

		pdf.setTextColor(...PDF_COLORS.white);
		pdf.setFontSize(16);
		pdf.setFont('helvetica', 'bold');
		pdf.text(title, margin + 6, this.y + 10);

		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'normal');
		if (subtitle) {
			pdf.text(subtitle, margin + 6, this.y + 17);
		}

		pdf.setFontSize(8);
		pdf.text(BARANGAY_NAME, margin + 6, this.y + (subtitle ? 24 : 20));
		pdf.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin - 6, this.y + 10, {
			align: 'right'
		});

		this.y += headerH + 8;
		pdf.setTextColor(...PDF_COLORS.slate);
	}

	drawKpiRow(cards: KpiCard[], columns = 3) {
		const gap = 4;
		const cardW = (this.contentWidth - gap * (columns - 1)) / columns;
		const cardH = 22;
		this.ensureSpace(cardH + 4);

		cards.forEach((card, i) => {
			const col = i % columns;
			const row = Math.floor(i / columns);
			const x = this.margin + col * (cardW + gap);
			const y = this.y + row * (cardH + gap);

			this.pdf.setFillColor(...PDF_COLORS.gray50);
			this.pdf.setDrawColor(...PDF_COLORS.gray200);
			this.pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

			const accent = card.accent ?? PDF_COLORS.emerald;
			this.pdf.setFillColor(...accent);
			this.pdf.rect(x, y + 3, 2.5, cardH - 6, 'F');

			this.pdf.setFontSize(7);
			this.pdf.setFont('helvetica', 'normal');
			this.pdf.setTextColor(...PDF_COLORS.gray500);
			this.pdf.text(card.label, x + 6, y + 8);

			this.pdf.setFontSize(14);
			this.pdf.setFont('helvetica', 'bold');
			this.pdf.setTextColor(...PDF_COLORS.slate);
			const value = String(card.value);
			this.pdf.text(value.length > 12 ? value.slice(0, 11) + '…' : value, x + 6, y + 17);
		});

		const rows = Math.ceil(cards.length / columns);
		this.y += rows * (cardH + gap) + 6;
	}

	drawSection(title: string) {
		this.ensureSpace(14);
		const { pdf, margin, contentWidth } = this;

		pdf.setFillColor(...PDF_COLORS.gray100);
		pdf.roundedRect(margin, this.y, contentWidth, 9, 1.5, 1.5, 'F');
		pdf.setFillColor(...PDF_COLORS.emerald);
		pdf.rect(margin, this.y, 3, 9, 'F');

		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(...PDF_COLORS.slate);
		pdf.text(title, margin + 7, this.y + 6.2);

		this.y += 12;
	}

	drawTable(headers: string[], rows: string[][], colWidths: number[]) {
		const rowH = 7;
		const tableW = colWidths.reduce((a, b) => a + b, 0);
		this.ensureSpace(rowH * (rows.length + 1) + 4);

		let x = this.margin;
		const startY = this.y;

		// Header row
		this.pdf.setFillColor(...PDF_COLORS.emerald);
		this.pdf.rect(this.margin, startY, tableW, rowH, 'F');
		this.pdf.setTextColor(...PDF_COLORS.white);
		this.pdf.setFontSize(8);
		this.pdf.setFont('helvetica', 'bold');

		headers.forEach((h, i) => {
			this.pdf.text(h, x + 2, startY + 4.8);
			x += colWidths[i];
		});

		this.y = startY + rowH;

		// Body rows
		rows.forEach((row, rowIndex) => {
			this.ensureSpace(rowH);
			x = this.margin;
			const fill = rowIndex % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.gray50;
			this.pdf.setFillColor(...fill);
			this.pdf.rect(this.margin, this.y, tableW, rowH, 'F');

			this.pdf.setTextColor(...PDF_COLORS.gray700);
			this.pdf.setFont('helvetica', 'normal');
			row.forEach((cell, i) => {
				const text = this.pdf.splitTextToSize(cell, colWidths[i] - 4)[0] as string;
				this.pdf.text(text, x + 2, this.y + 4.8);
				x += colWidths[i];
			});
			this.y += rowH;
		});

		this.y += 6;
	}

	drawBarChartRow(label: string, value: number, max: number, suffix = '') {
		this.ensureSpace(10);
		const barMaxW = this.contentWidth - 70;
		const pct = max > 0 ? value / max : 0;
		const barW = Math.max(2, barMaxW * pct);

		this.pdf.setFontSize(8);
		this.pdf.setFont('helvetica', 'normal');
		this.pdf.setTextColor(...PDF_COLORS.gray700);
		const shortLabel = label.length > 28 ? label.slice(0, 26) + '…' : label;
		this.pdf.text(shortLabel, this.margin, this.y + 4);

		const barY = this.y + 1;
		this.pdf.setFillColor(...PDF_COLORS.gray200);
		this.pdf.roundedRect(this.margin + 62, barY, barMaxW, 5, 1, 1, 'F');
		this.pdf.setFillColor(...PDF_COLORS.emerald);
		this.pdf.roundedRect(this.margin + 62, barY, barW, 5, 1, 1, 'F');

		this.pdf.setFont('helvetica', 'bold');
		this.pdf.text(`${value}${suffix}`, this.margin + 62 + barMaxW + 3, this.y + 4);

		this.y += 9;
	}

	drawKeyValueBlock(pairs: Array<{ label: string; value: string }>, columns = 2) {
		const colW = this.contentWidth / columns;
		const rowH = 8;
		const rows = Math.ceil(pairs.length / columns);
		this.ensureSpace(rows * rowH + 4);

		pairs.forEach((pair, i) => {
			const col = i % columns;
			const row = Math.floor(i / columns);
			const x = this.margin + col * colW;
			const y = this.y + row * rowH;

			this.pdf.setFontSize(7);
			this.pdf.setFont('helvetica', 'normal');
			this.pdf.setTextColor(...PDF_COLORS.gray500);
			this.pdf.text(pair.label, x, y + 3);

			this.pdf.setFontSize(9);
			this.pdf.setFont('helvetica', 'bold');
			this.pdf.setTextColor(...PDF_COLORS.slate);
			const val = this.pdf.splitTextToSize(pair.value, colW - 4)[0] as string;
			this.pdf.text(val, x, y + 7);
		});

		this.y += rows * rowH + 6;
	}

	drawInsightCard(type: 'info' | 'success' | 'warning', title: string, description: string) {
		const colors: Record<string, Rgb> = {
			info: PDF_COLORS.blue,
			success: PDF_COLORS.emerald,
			warning: PDF_COLORS.amber
		};
		const bg: Record<string, Rgb> = {
			info: [239, 246, 255],
			success: PDF_COLORS.emeraldBg,
			warning: [255, 251, 235]
		};

		const descLines = this.pdf.splitTextToSize(description, this.contentWidth - 14) as string[];
		const cardH = 10 + descLines.length * 4.5;
		this.ensureSpace(cardH + 4);

		this.pdf.setFillColor(...bg[type]);
		this.pdf.setDrawColor(...colors[type]);
		this.pdf.roundedRect(this.margin, this.y, this.contentWidth, cardH, 2, 2, 'FD');
		this.pdf.setFillColor(...colors[type]);
		this.pdf.rect(this.margin, this.y, 3, cardH, 'F');

		this.pdf.setFontSize(8);
		this.pdf.setFont('helvetica', 'bold');
		this.pdf.setTextColor(...colors[type]);
		this.pdf.text(`[${type.toUpperCase()}] ${title}`, this.margin + 6, this.y + 6);

		this.pdf.setFont('helvetica', 'normal');
		this.pdf.setTextColor(...PDF_COLORS.gray700);
		this.pdf.text(descLines, this.margin + 6, this.y + 11);

		this.y += cardH + 4;
	}

	drawReportCard(options: {
		index: number;
		title: string;
		refId: string;
		type: string;
		status: string;
		priority: string;
		location: string;
		dateTime: string;
		officer: string;
		description: string;
		respondents?: string[];
		complainants?: string[];
		updates?: Array<{ date: string; time: string; note: string }>;
	}) {
		const { pdf } = this;
		const descLines = pdf.splitTextToSize(options.description || 'N/A', this.contentWidth - 10) as string[];
		const updateLines = (options.updates ?? []).length;
		const cardH = 48 + descLines.length * 4 + updateLines * 5;
		this.ensureSpace(Math.min(cardH, 80));

		// Card container
		pdf.setFillColor(...PDF_COLORS.white);
		pdf.setDrawColor(...PDF_COLORS.gray200);
		pdf.roundedRect(this.margin, this.y, this.contentWidth, Math.min(cardH, 75), 2, 2, 'FD');

		const innerY = this.y + 5;
		let cy = innerY;

		pdf.setFontSize(11);
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(...PDF_COLORS.slate);
		const titleLines = pdf.splitTextToSize(`${options.index}. ${options.title}`, this.contentWidth - 10) as string[];
		pdf.text(titleLines[0], this.margin + 5, cy);
		cy += 6;

		pdf.setFontSize(7);
		pdf.setFont('helvetica', 'normal');
		pdf.setTextColor(...PDF_COLORS.gray500);
		pdf.text(`Ref ${options.refId}`, this.margin + 5, cy);
		cy += 5;

		// Status / priority pills (text with color)
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'bold');
		this.drawStatusText(options.status, this.margin + 5, cy);
		pdf.text('  |  ', this.margin + 38, cy);
		this.drawPriorityText(options.priority, this.margin + 48, cy);
		pdf.setFont('helvetica', 'normal');
		pdf.setTextColor(...PDF_COLORS.gray700);
		pdf.text(`  |  ${options.type}`, this.margin + 68, cy);
		cy += 6;

		pdf.setFontSize(8);
		pdf.text(`Location: ${options.location}`, this.margin + 5, cy);
		cy += 4.5;
		pdf.text(`Date: ${options.dateTime}  •  Officer: ${options.officer}`, this.margin + 5, cy);
		cy += 6;

		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(...PDF_COLORS.gray500);
		pdf.text('Description', this.margin + 5, cy);
		cy += 4;
		pdf.setFont('helvetica', 'normal');
		pdf.setTextColor(...PDF_COLORS.gray700);
		pdf.text(descLines.slice(0, 3), this.margin + 5, cy);
		cy += Math.min(descLines.length, 3) * 4 + 2;

		if (options.respondents?.length) {
			pdf.setFontSize(7);
			pdf.text(`Respondents: ${options.respondents.join(', ')}`, this.margin + 5, cy);
			cy += 4;
		}
		if (options.complainants?.length) {
			pdf.text(`Complainants: ${options.complainants.join(', ')}`, this.margin + 5, cy);
			cy += 4;
		}

		this.y += Math.min(cardH, 75) + 5;
	}

	private drawStatusText(status: string, x: number, y: number) {
		const map: Record<string, Rgb> = {
			'Pending Confirmation': PDF_COLORS.amber,
			Open: PDF_COLORS.blue,
			'Under Investigation': PDF_COLORS.purple,
			Solved: PDF_COLORS.emerald
		};
		this.pdf.setTextColor(...(map[status] ?? PDF_COLORS.gray700));
		this.pdf.text(status, x, y);
	}

	private drawPriorityText(priority: string, x: number, y: number) {
		const map: Record<string, Rgb> = {
			Critical: PDF_COLORS.red,
			High: PDF_COLORS.amber,
			Medium: PDF_COLORS.blue,
			Low: PDF_COLORS.emerald
		};
		this.pdf.setTextColor(...(map[priority] ?? PDF_COLORS.gray700));
		this.pdf.text(priority, x, y);
	}

	drawParagraph(label: string, text: string) {
		const lines = this.pdf.splitTextToSize(text, this.contentWidth - 6) as string[];
		this.ensureSpace(lines.length * 4.5 + 8);
		this.pdf.setFontSize(8);
		this.pdf.setFont('helvetica', 'bold');
		this.pdf.setTextColor(...PDF_COLORS.gray500);
		this.pdf.text(label, this.margin, this.y);
		this.y += 5;
		this.pdf.setFont('helvetica', 'normal');
		this.pdf.setTextColor(...PDF_COLORS.gray700);
		this.pdf.text(lines, this.margin + 2, this.y);
		this.y += lines.length * 4.5 + 4;
	}

	drawBulletList(label: string, items: string[]) {
		if (!items.length) return;
		this.ensureSpace(items.length * 5 + 8);
		this.pdf.setFontSize(8);
		this.pdf.setFont('helvetica', 'bold');
		this.pdf.setTextColor(...PDF_COLORS.gray500);
		this.pdf.text(label, this.margin, this.y);
		this.y += 5;
		this.pdf.setFont('helvetica', 'normal');
		this.pdf.setTextColor(...PDF_COLORS.gray700);
		items.forEach((item) => {
			const line = this.pdf.splitTextToSize(`• ${item}`, this.contentWidth - 8)[0] as string;
			this.pdf.text(line, this.margin + 4, this.y);
			this.y += 5;
		});
		this.y += 3;
	}

	finalizeFooters() {
		const total = this.pdf.getNumberOfPages();
		for (let i = 1; i <= total; i++) {
			this.pdf.setPage(i);
			this.pdf.setFontSize(7);
			this.pdf.setTextColor(...PDF_COLORS.gray500);
			this.pdf.text(
				`B-SAFE — ${BARANGAY_NAME}  •  Page ${i} of ${total}`,
				this.pageWidth / 2,
				this.pageHeight - 6,
				{ align: 'center' }
			);
		}
	}

	save(filename: string) {
		this.finalizeFooters();
		this.pdf.save(filename);
	}
}
