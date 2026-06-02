import type { RequestHandler } from './$types';
import { seedAllTestAccounts } from '$lib/server/mockDataSeeder';

/** GET /api/seed/accounts — create/update test users for all roles (no mock reports). */
export const GET: RequestHandler = async () => {
	try {
		const result = await seedAllTestAccounts();

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Test accounts ready for all roles.',
				...result
			}),
			{
				status: 200,
				headers: { 'content-type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('[API] Seed accounts error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				message: error instanceof Error ? error.message : 'Failed to seed accounts'
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json' }
			}
		);
	}
};
