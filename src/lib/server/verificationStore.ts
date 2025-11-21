// Shared in-memory store for verification codes
// In production, use Redis or a database for persistence and scalability

interface VerificationData {
	code: string;
	expiresAt: number;
	role: string;
}

const verificationCodes = new Map<string, VerificationData>();

export function storeVerificationCode(email: string, code: string, role: string, expiresInMinutes = 10): void {
	const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
	verificationCodes.set(email.toLowerCase(), {
		code,
		expiresAt,
		role
	});
}

export function getVerificationCode(email: string): VerificationData | undefined {
	return verificationCodes.get(email.toLowerCase());
}

export function deleteVerificationCode(email: string): boolean {
	return verificationCodes.delete(email.toLowerCase());
}

export function cleanupExpiredCodes(): void {
	const now = Date.now();
	for (const [email, data] of verificationCodes.entries()) {
		if (now > data.expiresAt) {
			verificationCodes.delete(email);
		}
	}
}

// Clean up expired codes every 5 minutes
if (typeof setInterval !== 'undefined') {
	setInterval(cleanupExpiredCodes, 5 * 60 * 1000);
}

