import type { ReportPriority } from '$lib/types/report';

/** Display terminology (DB columns may still use legacy names). */
export const LABELS = {
	incident: 'Incident',
	incidents: 'Incidents',
	respondent: 'Respondent',
	respondents: 'Respondents',
	complainant: 'Complainant',
	complainants: 'Complainants',
	progressReport: 'Progress Report',
	analyticalReport: 'Analytical Report',
	predictionReport: 'Prediction Report',
	reportTitle: 'Report Title',
	witness: 'Witness',
	firstResponder: 'First Responder',
	incidentDetails: 'Incident Details',
	barangayAction: 'Barangay Action Taken',
	guestAccess: 'Guest Access',
	officialInformedQuestion: 'Did you already inform a barangay official?',
	officialInformedYes: 'Yes, I already told an official',
	officialInformedNo: 'No, this is my first report about it'
} as const;

export const BARANGAY_NAME = 'Brgy. Banicain, Olongapo City, Zambales';

/** Super Admin = Barangay Captain; full system control including user management. */
export const SUPER_ADMIN_ROLES = ['Barangay Captain'] as const;

export const ALL_ROLES = [
	'Resident',
	'Police Officer',
	'Crime Analyst',
	'Police Chief',
	'Administrator',
	'Barangay Captain'
] as const;

export const FIRST_RESPONDER_UNITS = [
	'BPSO (Barangay Public Safety Officer)',
	'BPOT (Barangay Peace & Order Team)',
	'Barangay Rescue / MDRRMO',
	'Barangay Health Worker',
	'Barangay Tanod'
] as const;

export const PRIORITY_OPTIONS: ReportPriority[] = ['Low', 'Medium', 'High', 'Critical'];

/** Parks, streets, and landmarks in Barangay Banicain for quick location pick. */
export const BANICAIN_LOCATIONS = [
	// Core facilities
	'Banicain Barangay Hall, Banicain, Olongapo City, Zambales',
	'Banicain Elementary School, Banicain, Olongapo City, Zambales',
	'Banicain Health Center, Banicain, Olongapo City, Zambales',
	'Banicain Market, Banicain, Olongapo City, Zambales',
	'Banicain Church, Banicain, Olongapo City, Zambales',
	// Parks & recreational
	'Banicain Basketball Court, Banicain, Olongapo City, Zambales',
	'Banicain Covered Court, Banicain, Olongapo City, Zambales',
	'Banicain Children\'s Park, Banicain, Olongapo City, Zambales',
	'Banicain Plaza / Open Park, Banicain, Olongapo City, Zambales',
	// Main roads & streets
	'Banicain Main Road, Banicain, Olongapo City, Zambales',
	'Banicain National Highway segment, Banicain, Olongapo City, Zambales',
	'Rizal Street, Banicain, Olongapo City, Zambales',
	'Mabini Street, Banicain, Olongapo City, Zambales',
	'Bonifacio Street, Banicain, Olongapo City, Zambales',
	'Aguinaldo Street, Banicain, Olongapo City, Zambales',
	// Puroks
	'Banicain Purok 1, Banicain, Olongapo City, Zambales',
	'Banicain Purok 2, Banicain, Olongapo City, Zambales',
	'Banicain Purok 3, Banicain, Olongapo City, Zambales',
	'Banicain Purok 4, Banicain, Olongapo City, Zambales',
	'Banicain Purok 5, Banicain, Olongapo City, Zambales',
	'Banicain Purok 6, Banicain, Olongapo City, Zambales',
	'Banicain Purok 7, Banicain, Olongapo City, Zambales',
	'Banicain Purok 8, Banicain, Olongapo City, Zambales'
] as const;

export const INCIDENT_TYPES = [
	'Theft',
	'Fraud',
	'Violence',
	'Burglary',
	'Vandalism',
	'Accident',
	'Fire Related',
	'Domestic Dispute',
	'Noise Complaint',
	'Public Disturbance',
	'Traffic Incident',
	'Suspicious Activity',
	'Missing Person',
	'Drug Related',
	'Medical Emergency',
	'Animal Control',
	'Environmental Issue',
	'Other (not listed)'
] as const;

/** Automatic priority from incident type (barangay incidence severity). */
const PRIORITY_BY_TYPE: Record<string, ReportPriority> = {
	'Medical Emergency': 'Critical',
	'Fire Related': 'Critical',
	'Missing Person': 'Critical',
	'Drug Related': 'Critical',
	Violence: 'Critical',
	'Domestic Dispute': 'High',
	'Traffic Incident': 'High',
	Burglary: 'High',
	Theft: 'High',
	Fraud: 'High',
	'Suspicious Activity': 'High',
	Accident: 'High',
	Vandalism: 'Medium',
	'Public Disturbance': 'Medium',
	'Noise Complaint': 'Medium',
	'Environmental Issue': 'Medium',
	'Animal Control': 'Medium',
	'Other (not listed)': 'Medium'
};

export function autoPriorityForIncidentType(type: string): ReportPriority {
	const normalized = type.trim();
	if (PRIORITY_BY_TYPE[normalized]) return PRIORITY_BY_TYPE[normalized];
	return 'Medium';
}
