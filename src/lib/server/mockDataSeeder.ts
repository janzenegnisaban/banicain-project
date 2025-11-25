import type { Report } from './reportsStore';
import { insertReportIntoDatabase } from './reportRepository';
import { supabase } from './supabase';

/**
 * Generate comprehensive mock data for analytics
 * This matches the exact data from the SQL script provided
 */
export function generateMockReports(reporterId = '00000000-0000-0000-0000-000000000001'): Report[] {
	const now = new Date();
	const reports: Report[] = [];

	// Helper to create date from string (YYYY-MM-DD)
	const createDate = (dateStr: string) => {
		const [year, month, day] = dateStr.split('-').map(Number);
		return new Date(year, month - 1, day);
	};

	// Helper to format date
	const formatDate = (date: Date) => date.toISOString().slice(0, 10);

	// Helper to create report
	const createReport = (
		title: string,
		type: string,
		status: 'Open' | 'Under Investigation' | 'Solved',
		priority: 'Low' | 'Medium' | 'High' | 'Critical',
		location: string,
		dateStr: string,
		time: string,
		officer: string | null,
		description: string,
		damage: string,
		notes: string
	): Report => {
		const reportDate = createDate(dateStr);
		const updates = [
			{ date: dateStr, time, note: 'Report submitted' }
		];
		
		// Add status change update for resolved cases (2 days after submission)
		if (status === 'Solved') {
			const solvedDate = new Date(reportDate);
			solvedDate.setDate(solvedDate.getDate() + 2);
			updates.push({
				date: formatDate(solvedDate),
				time: solvedDate.toTimeString().slice(0, 5),
				note: 'Status changed to resolved'
			});
		}

		return {
			id: `CR-${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
			title,
			type,
			status,
			priority,
			location,
			date: dateStr,
			time,
			officer: officer || 'Unassigned',
			description,
			evidence: [],
			suspects: [],
			victims: [],
			damage,
			notes,
			updates,
			reporterId
		};
	};

	// January 2024
	reports.push(createReport(
		'Mock - Theft at Downtown Mall', 'Theft', 'Solved', 'High',
		'Downtown District', '2024-01-15', '14:30', 'Officer Smith',
		'Reported theft of personal belongings from shopping mall',
		'Property loss: $500', 'Case closed successfully'
	));

	reports.push(createReport(
		'Mock - Vehicle Theft', 'Theft', 'Solved', 'Critical',
		'Industrial Zone', '2024-01-20', '08:45', 'Officer Johnson',
		'Vehicle stolen from parking lot',
		'Vehicle value: $15,000', 'Vehicle recovered'
	));

	reports.push(createReport(
		'Mock - Assault Incident', 'Assault', 'Under Investigation', 'High',
		'Residential Area', '2024-01-25', '19:20', 'Officer Brown',
		'Physical assault reported in residential neighborhood',
		'Minor injuries', 'Investigation ongoing'
	));

	// February 2024
	reports.push(createReport(
		'Mock - Fraud Case', 'Fraud', 'Solved', 'Medium',
		'Downtown District', '2024-02-05', '11:15', 'Officer Davis',
		'Credit card fraud reported',
		'Financial loss: $2,000', 'Suspect identified'
	));

	reports.push(createReport(
		'Mock - Vandalism at Park', 'Vandalism', 'Solved', 'Low',
		'Residential Area', '2024-02-12', '16:45', 'Officer Wilson',
		'Graffiti and property damage at public park',
		'Property damage: $300', 'Cleaned and case closed'
	));

	reports.push(createReport(
		'Mock - Burglary Report', 'Burglary', 'Solved', 'High',
		'Industrial Zone', '2024-02-18', '22:30', 'Officer Martinez',
		'Break-in at warehouse facility',
		'Stolen equipment: $5,000', 'Suspects apprehended'
	));

	reports.push(createReport(
		'Mock - Theft from Store', 'Theft', 'Solved', 'Medium',
		'Downtown District', '2024-02-22', '15:20', 'Officer Taylor',
		'Shoplifting incident at retail store',
		'Merchandise value: $150', 'Case resolved'
	));

	// March 2024
	reports.push(createReport(
		'Mock - Assault Case', 'Assault', 'Solved', 'High',
		'Downtown District', '2024-03-08', '20:15', 'Officer Anderson',
		'Physical altercation at bar',
		'Injuries reported', 'Case closed'
	));

	reports.push(createReport(
		'Mock - Fraud Investigation', 'Fraud', 'Under Investigation', 'Medium',
		'Residential Area', '2024-03-15', '10:00', 'Officer White',
		'Online scam reported',
		'Financial loss: $1,500', 'Investigation in progress'
	));

	reports.push(createReport(
		'Mock - Vandalism Incident', 'Vandalism', 'Solved', 'Low',
		'Industrial Zone', '2024-03-20', '18:00', 'Officer Harris',
		'Property damage to business',
		'Damage cost: $800', 'Repairs completed'
	));

	reports.push(createReport(
		'Mock - Theft Report', 'Theft', 'Solved', 'High',
		'Downtown District', '2024-03-25', '12:30', 'Officer Clark',
		'Bicycle theft from public area',
		'Bicycle value: $400', 'Recovered'
	));

	reports.push(createReport(
		'Mock - Burglary Case', 'Burglary', 'Solved', 'Critical',
		'Residential Area', '2024-03-28', '23:45', 'Officer Lewis',
		'Home break-in reported',
		'Stolen items: $3,000', 'Suspect arrested'
	));

	// April 2024
	reports.push(createReport(
		'Mock - Assault Report', 'Assault', 'Open', 'High',
		'Industrial Zone', '2024-04-05', '17:20', null,
		'Workplace altercation',
		'Minor injuries', 'Awaiting investigation'
	));

	reports.push(createReport(
		'Mock - Theft Case', 'Theft', 'Solved', 'Medium',
		'Downtown District', '2024-04-10', '14:00', 'Officer Walker',
		'Pickpocket incident',
		'Cash and wallet stolen', 'Case resolved'
	));

	reports.push(createReport(
		'Mock - Fraud Report', 'Fraud', 'Solved', 'Medium',
		'Residential Area', '2024-04-15', '11:45', 'Officer Hall',
		'Identity theft case',
		'Personal information compromised', 'Identity restored'
	));

	reports.push(createReport(
		'Mock - Vandalism Report', 'Vandalism', 'Solved', 'Low',
		'Downtown District', '2024-04-20', '19:30', 'Officer Allen',
		'Graffiti on public building',
		'Cleaning cost: $200', 'Removed'
	));

	reports.push(createReport(
		'Mock - Burglary Investigation', 'Burglary', 'Under Investigation', 'High',
		'Industrial Zone', '2024-04-25', '06:00', 'Officer Young',
		'Warehouse break-in',
		'Equipment stolen: $8,000', 'Active investigation'
	));

	// May 2024
	reports.push(createReport(
		'Mock - Theft Incident', 'Theft', 'Solved', 'High',
		'Downtown District', '2024-05-03', '13:15', 'Officer King',
		'Package theft from doorstep',
		'Package value: $250', 'Resolved'
	));

	reports.push(createReport(
		'Mock - Assault Case', 'Assault', 'Solved', 'Critical',
		'Residential Area', '2024-05-08', '21:00', 'Officer Wright',
		'Domestic dispute',
		'Injuries sustained', 'Case closed'
	));

	reports.push(createReport(
		'Mock - Fraud Case', 'Fraud', 'Open', 'Medium',
		'Industrial Zone', '2024-05-12', '10:30', null,
		'Business email compromise',
		'Financial loss: $5,000', 'Pending review'
	));

	reports.push(createReport(
		'Mock - Vandalism Report', 'Vandalism', 'Solved', 'Low',
		'Downtown District', '2024-05-18', '16:00', 'Officer Lopez',
		'Property damage to vehicle',
		'Repair cost: $600', 'Fixed'
	));

	reports.push(createReport(
		'Mock - Burglary Report', 'Burglary', 'Solved', 'High',
		'Residential Area', '2024-05-22', '02:30', 'Officer Hill',
		'Home invasion',
		'Stolen electronics: $4,500', 'Suspects identified'
	));

	reports.push(createReport(
		'Mock - Theft Report', 'Theft', 'Under Investigation', 'Medium',
		'Industrial Zone', '2024-05-28', '15:45', 'Officer Scott',
		'Equipment theft from construction site',
		'Equipment value: $2,500', 'Investigation ongoing'
	));

	// June 2024
	reports.push(createReport(
		'Mock - Theft Case', 'Theft', 'Solved', 'High',
		'Downtown District', '2024-06-02', '11:20', 'Officer Green',
		'Jewelry theft from store',
		'Jewelry value: $3,000', 'Recovered'
	));

	reports.push(createReport(
		'Mock - Assault Report', 'Assault', 'Open', 'High',
		'Residential Area', '2024-06-05', '19:45', null,
		'Street altercation',
		'Injuries reported', 'Awaiting assignment'
	));

	reports.push(createReport(
		'Mock - Fraud Investigation', 'Fraud', 'Under Investigation', 'Medium',
		'Downtown District', '2024-06-08', '09:15', 'Officer Adams',
		'Bank fraud case',
		'Unauthorized transactions: $1,200', 'Investigation active'
	));

	reports.push(createReport(
		'Mock - Vandalism Case', 'Vandalism', 'Solved', 'Low',
		'Industrial Zone', '2024-06-12', '14:00', 'Officer Baker',
		'Property damage to business sign',
		'Repair cost: $400', 'Restored'
	));

	reports.push(createReport(
		'Mock - Burglary Report', 'Burglary', 'Solved', 'Critical',
		'Residential Area', '2024-06-15', '23:00', 'Officer Nelson',
		'Apartment break-in',
		'Stolen items: $2,800', 'Case closed'
	));

	reports.push(createReport(
		'Mock - Theft Incident', 'Theft', 'Solved', 'Medium',
		'Downtown District', '2024-06-20', '16:30', 'Officer Carter',
		'Wallet theft',
		'Cash and cards stolen', 'Resolved'
	));

	reports.push(createReport(
		'Mock - Assault Case', 'Assault', 'Under Investigation', 'High',
		'Industrial Zone', '2024-06-22', '18:15', 'Officer Mitchell',
		'Workplace violence',
		'Employee injured', 'Investigation ongoing'
	));

	reports.push(createReport(
		'Mock - Fraud Report', 'Fraud', 'Open', 'Medium',
		'Residential Area', '2024-06-25', '12:45', null,
		'Phone scam reported',
		'Attempted fraud: $800', 'Pending review'
	));

	reports.push(createReport(
		'Mock - Vandalism Report', 'Vandalism', 'Solved', 'Low',
		'Downtown District', '2024-06-28', '20:00', 'Officer Perez',
		'Graffiti on public property',
		'Cleaning cost: $150', 'Removed'
	));

	// Verify report count (SQL script comment says 35, but actual VALUES count is 32)
	// This verification ensures we're generating all reports from the SQL script
	const expectedCount = 35; // As per SQL script comment
	const actualCount = reports.length;
	
	if (actualCount !== expectedCount) {
		console.warn(`[Seeder] WARNING: Expected ${expectedCount} reports but generated ${actualCount}.`);
		console.warn(`[Seeder] Please verify all reports from SQL script are included.`);
	} else {
		console.log(`[Seeder] ✓ Successfully generated all ${actualCount} mock reports`);
	}
	
	// Log distribution for verification
	const typeCounts: Record<string, number> = {};
	reports.forEach(r => {
		typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
	});
	console.log(`[Seeder] Report distribution:`, typeCounts);
	
	return reports;
}

type AccountSeed = {
	email: string;
	password: string;
	fullName: string;
	role: string;
};

const DEFAULT_RESIDENT_REPORTER_ID = '00000000-0000-0000-0000-000000000001';

const MOCK_RESIDENT_ACCOUNT: AccountSeed = {
	email: 'mock.reporter@test.com',
	password: 'ResidentSecure!1',
	fullName: 'Mock Reporter',
	role: 'Resident'
};

const OFFICER_ACCOUNTS: AccountSeed[] = [
	{
		email: 'chief@bsafe.local',
		password: 'ChiefSecure!1',
		fullName: 'Chief Maria Dela Cruz',
		role: 'Police Chief'
	},
	{
		email: 'analyst@bsafe.local',
		password: 'AnalystSecure!1',
		fullName: 'Analyst Jose Ramirez',
		role: 'Crime Analyst'
	},
	{
		email: 'officer1@bsafe.local',
		password: 'OfficerSecure!1',
		fullName: 'Officer Lea Santiago',
		role: 'Police Officer'
	},
	{
		email: 'admin@bsafe.local',
		password: 'AdminSecure!1',
		fullName: 'Administrator Carlo Reyes',
		role: 'Administrator'
	}
];

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
	const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });

	if (error) {
		console.error('[Seeder] Failed to list auth users:', error);
		return null;
	}

	const normalized = email.toLowerCase();
	const match = data?.users?.find(user => user.email?.toLowerCase() === normalized);
	return match?.id ?? null;
}

async function ensureAccountSeed(seed: AccountSeed) {
	let createdAuthUser = false;
	let userId = await findAuthUserIdByEmail(seed.email);

	if (!userId) {
		const { data, error } = await supabase.auth.admin.createUser({
			email: seed.email,
			password: seed.password,
			email_confirm: true,
			user_metadata: { full_name: seed.fullName, role: seed.role }
		});

		if (error && !error.message?.toLowerCase().includes('already registered')) {
			console.error(`[Seeder] Unable to create auth user for ${seed.email}:`, error.message);
		} else {
			userId = data?.user?.id ?? null;
			createdAuthUser = Boolean(data?.user);
		}
	}

	if (!userId) {
		userId = await findAuthUserIdByEmail(seed.email);
	}

	let profileSynced = false;
	if (userId) {
		const { error: profileError } = await supabase
			.from('users')
			.upsert(
				{
					id: userId,
					email: seed.email,
					full_name: seed.fullName,
					role: seed.role,
					is_active: true
				},
				{ onConflict: 'id' }
			);

		if (profileError) {
			console.error(`[Seeder] Failed to sync profile for ${seed.email}:`, profileError.message);
		} else {
			profileSynced = true;
		}
	}

	return { userId, createdAuthUser, profileSynced };
}

async function seedMockResidentAccount() {
	const result = await ensureAccountSeed(MOCK_RESIDENT_ACCOUNT);
	const reporterId = result.userId ?? DEFAULT_RESIDENT_REPORTER_ID;
	return { reporterId, createdAuthUser: result.createdAuthUser, profileSynced: result.profileSynced };
}

export async function seedOfficerAccounts() {
	let createdAuthUsers = 0;
	let profilesSynced = 0;

	for (const account of OFFICER_ACCOUNTS) {
		const result = await ensureAccountSeed(account);
		if (result.profileSynced) {
			profilesSynced++;
		}
		if (result.createdAuthUser) {
			createdAuthUsers++;
		}
	}

	return { createdAuthUsers, profilesSynced };
}

/**
 * Seed mock data into the database
 * Call this function to populate the database with mock reports
 */
export async function seedMockDataToDatabase(): Promise<{
	success: number;
	failed: number;
	officersCreated: number;
	officerProfilesSynced: number;
	reporterUserId: string;
}> {
	const residentSeed = await seedMockResidentAccount();
	const mockReports = generateMockReports(residentSeed.reporterId);
	const expectedCount = 35;
	
	if (mockReports.length !== expectedCount) {
		console.error(`[Seeder] WARNING: Expected ${expectedCount} reports but got ${mockReports.length}. Seeding may be incomplete.`);
	}
	
	let success = 0;
	let failed = 0;

	console.log(`[Seeder] Starting to seed ${mockReports.length} mock reports to database...`);

	for (const report of mockReports) {
		try {
			await insertReportIntoDatabase(report);
			success++;
			if (success % 5 === 0) {
				console.log(`[Seeder] Progress: ${success}/${mockReports.length} reports seeded...`);
			}
		} catch (error) {
			console.error(`[Seeder] Failed to insert report ${report.id} (${report.title}):`, error);
			failed++;
		}
	}

	const officerResults = await seedOfficerAccounts();

	if (success === expectedCount) {
		console.log(`[Seeder] ✓ SUCCESS: All ${success} reports seeded successfully!`);
	} else {
		console.log(`[Seeder] Completed: ${success} successful, ${failed} failed (Expected: ${expectedCount})`);
	}
	
	return {
		success,
		failed,
		officersCreated: officerResults.createdAuthUsers,
		officerProfilesSynced: officerResults.profilesSynced,
		reporterUserId: residentSeed.reporterId
	};
}
