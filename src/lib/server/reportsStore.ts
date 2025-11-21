// Simple in-memory reports store with SSE broadcasting (dev/demo only)
type ReportStatus = 'Open' | 'Under Investigation' | 'Solved';
export type Report = {
	id: string;
	title: string;
	type: string;
	status: ReportStatus;
	priority: 'Low' | 'Medium' | 'High' | 'Critical';
	location: string;
	date: string;
	time: string;
	officer: string;
	description: string;
	evidence: string[];
	suspects: string[];
	victims: string[] | string;
	damage: string;
	notes: string;
	updates: Array<{ date: string; time: string; note: string }>;
	reporterId?: string | null;
};

let reports: Report[] = [];

type Client = {
	id: number;
	write: (data: string) => void;
	close: () => void;
};

let nextClientId = 1;
const clients: Map<number, Client> = new Map();

export function getReports(): Report[] {
	return reports;
}

export function setInitialReports(initial: Report[]) {
	if (reports.length === 0) {
		reports = initial;
		broadcast({ type: 'init', reports });
	}
}

export function replaceReports(next: Report[]) {
	reports = next;
}

export function upsertReportSnapshot(report: Report, options?: { broadcastType?: 'created' | 'updated' }) {
	const existingIndex = reports.findIndex(r => r.id === report.id);
	if (existingIndex === -1) {
		reports = [report, ...reports];
		broadcast({ type: options?.broadcastType ?? 'created', report });
		return report;
	}
	reports[existingIndex] = report;
	broadcast({ type: options?.broadcastType ?? 'updated', report });
	return report;
}

export function addReport(report: Report) {
	reports = [report, ...reports];
	broadcast({ type: 'created', report });
}

export function updateReportStatus(id: string, status: ReportStatus, note?: string) {
	reports = reports.map(r => {
		if (r.id !== id) return r;
		const now = new Date();
		const updateNote = note ?? `Status changed to ${status}`;
		return {
			...r,
			status,
			updates: [
				...r.updates,
				{ date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), note: updateNote }
			]
		};
	});
	const report = reports.find(r => r.id === id);
	if (report) {
		broadcast({ type: 'updated', report });
	}
}

export function updateReport(id: string, updates: Partial<Report>, note?: string) {
	reports = reports.map(r => {
		if (r.id !== id) return r;
		const now = new Date();
		const updateNote = note ?? 'Report updated';
		const updated = {
			...r,
			...updates,
			updates: [
				...r.updates,
				{ date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), note: updateNote }
			]
		};
		return updated;
	});
	const report = reports.find(r => r.id === id);
	if (report) {
		broadcast({ type: 'updated', report });
	}
	return report;
}

export function deleteReport(id: string) {
	const idx = reports.findIndex(r => r.id === id);
	if (idx >= 0) {
		reports = reports.filter(r => r.id !== id);
		broadcast({ type: 'deleted', id });
		return true;
	}
	return false;
}

export function registerClient(write: Client['write'], close: Client['close']): number {
	const id = nextClientId++;
	clients.set(id, { id, write, close });
	return id;
}

export function unregisterClient(id: number, options?: { skipClose?: boolean }) {
	const client = clients.get(id);
	if (client) {
		if (!options?.skipClose) {
			try {
				client.close();
			} catch {}
		}
		clients.delete(id);
	}
}

function broadcast(payload: unknown) {
	const data = `data: ${JSON.stringify(payload)}\n\n`;
	for (const [, client] of clients) {
		try {
			client.write(data);
		} catch {
			// ignore broken pipe; client will be cleaned up on close
		}
	}
}

export function seedIfEmpty() {
	if (reports.length > 0) return null;
	
	// Generate comprehensive seed data (15 reports) to make pages look functional
	const now = new Date();
	const seedReports: Report[] = [];
	
	const locations = [
		'Brgy. Banicain, Olongapo City, Zambales',
		'Downtown District, Olongapo City',
		'Residential Area, Brgy. Banicain',
		'Industrial Zone, Olongapo City',
		'Barangay Hall, Brgy. Banicain'
	];
	
	const types = ['Theft', 'Assault', 'Fraud', 'Vandalism', 'Burglary', 'Traffic Incident', 'Noise Complaint', 'Suspicious Activity'];
	const officers = ['Officer Smith', 'Officer Johnson', 'Officer Brown', 'Officer Davis', 'Officer Wilson', 'Unassigned'];
	const statuses: ReportStatus[] = ['Open', 'Under Investigation', 'Solved'];
	const priorities: Report['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
	
	// Create 15 diverse reports
	for (let i = 0; i < 15; i++) {
		const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
		const reportDate = new Date(now);
		reportDate.setDate(reportDate.getDate() - daysAgo);
		
		const type = types[Math.floor(Math.random() * types.length)];
		const status = statuses[Math.floor(Math.random() * statuses.length)];
		const priority = priorities[Math.floor(Math.random() * priorities.length)];
		const location = locations[Math.floor(Math.random() * locations.length)];
		const officer = status === 'Open' ? 'Unassigned' : officers[Math.floor(Math.random() * (officers.length - 1))];
		
		const hours = String(Math.floor(Math.random() * 24)).padStart(2, '0');
		const minutes = String(Math.floor(Math.random() * 60)).padStart(2, '0');
		const time = `${hours}:${minutes}`;
		
		const updates = [
			{ 
				date: reportDate.toISOString().slice(0, 10), 
				time, 
				note: 'Report submitted' 
			}
		];
		
		if (status === 'Solved') {
			const solvedDate = new Date(reportDate);
			solvedDate.setDate(solvedDate.getDate() + Math.floor(Math.random() * 7) + 1);
			updates.push({
				date: solvedDate.toISOString().slice(0, 10),
				time: solvedDate.toTimeString().slice(0, 5),
				note: 'Case resolved and closed'
			});
		} else if (status === 'Under Investigation') {
			const investigationDate = new Date(reportDate);
			investigationDate.setDate(investigationDate.getDate() + 1);
			updates.push({
				date: investigationDate.toISOString().slice(0, 10),
				time: investigationDate.toTimeString().slice(0, 5),
				note: 'Investigation started'
			});
		}
		
		const report: Report = {
			id: `CR-${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
			title: `${type} Incident - Report #${i + 1}`,
			type,
			status,
			priority,
			location,
			date: reportDate.toISOString().slice(0, 10),
			time,
			officer,
			description: `Reported ${type.toLowerCase()} incident in ${location}. Details are being investigated.`,
			evidence: Math.random() > 0.5 ? ['Witness statements', 'CCTV footage'] : ['Initial report'],
			suspects: status === 'Solved' && Math.random() > 0.6 ? ['Suspect identified'] : [],
			victims: Math.random() > 0.7 ? ['Affected party'] : [],
			damage: priority === 'Critical' ? 'Significant damage reported' : priority === 'High' ? 'Moderate damage' : 'Minimal damage',
			notes: status === 'Solved' ? 'Case successfully resolved' : status === 'Under Investigation' ? 'Active investigation in progress' : 'Awaiting assignment',
			updates,
			reporterId: null
		};
		
		seedReports.push(report);
	}
	
	reports = seedReports;
	return seedReports[0]; // Return first report for compatibility
}


