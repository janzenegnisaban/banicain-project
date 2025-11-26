export type ReportStatus = 'Open' | 'Under Investigation' | 'Solved';
export type ReportPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReportUpdate = {
	date: string;
	time: string;
	note: string;
};

export type Report = {
	id: string;
	title: string;
	type: string;
	status: ReportStatus;
	priority: ReportPriority;
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
	updates: ReportUpdate[];
	reporterId?: string | null;
};

