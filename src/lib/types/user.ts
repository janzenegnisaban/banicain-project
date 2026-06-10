export const OFFICIAL_ROLES = [
	'Barangay Captain',
	'Administrator',
	'Police Officer',
	'Police Chief',
	'Crime Analyst'
] as const;

export type OfficialRole = (typeof OFFICIAL_ROLES)[number];

export type SessionUser = {
	id: string;
	username: string;
	email?: string;
	role: string;
	isAuthenticated: boolean;
};

export function isOfficialRole(role: string): role is OfficialRole {
	return (OFFICIAL_ROLES as readonly string[]).includes(role);
}

export function isAdministrator(role: string): boolean {
	return role === 'Administrator' || role === 'Barangay Captain';
}

/** Super Admin = Barangay Captain only (full user management). */
export function isSuperAdmin(role: string): boolean {
	return role === 'Barangay Captain';
}

export function isProtectedAccountRole(role: string): boolean {
	return role === 'Administrator' || role === 'Barangay Captain';
}
