import type { RequestHandler } from './$types';
import { seedMockDataToDatabase } from '$lib/server/mockDataSeeder';

/**
 * API endpoint to seed mock data into the database
 * GET /api/seed - Seeds the database with mock reports
 */
export const GET: RequestHandler = async () => {
	try {
		const result = await seedMockDataToDatabase();
		
		return new Response(
			JSON.stringify({
				success: true,
				message: `Successfully seeded ${result.success} reports. ${result.failed} failed.`,
				...result
			}),
			{
				status: 200,
				headers: { 'content-type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('[API] Seed error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				message: error instanceof Error ? error.message : 'Failed to seed data'
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json' }
			}
		);
	}
};

