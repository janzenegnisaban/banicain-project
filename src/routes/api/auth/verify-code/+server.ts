import type { RequestHandler } from './$types';
import { getVerificationCode, deleteVerificationCode } from '$lib/server/verificationStore';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, code } = await request.json();
		
		if (!email || !code) {
			return new Response(
				JSON.stringify({ error: 'Email and code are required' }),
				{ status: 400, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Get stored verification data
		const stored = getVerificationCode(email);
		
		if (!stored) {
			return new Response(
				JSON.stringify({ error: 'No verification code found. Please request a new code.' }),
				{ status: 404, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Check if code has expired
		if (Date.now() > stored.expiresAt) {
			deleteVerificationCode(email);
			return new Response(
				JSON.stringify({ error: 'Verification code has expired. Please request a new code.' }),
				{ status: 400, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Verify code
		if (stored.code !== code) {
			return new Response(
				JSON.stringify({ error: 'Invalid verification code' }),
				{ status: 400, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Code is valid - delete it and return success
		const role = stored.role;
		deleteVerificationCode(email);
		
		// Extract username from email (part before @)
		const username = email.split('@')[0];
		
		return new Response(
			JSON.stringify({ 
				success: true,
				user: {
					email,
					username,
					role: role === 'officer' ? 'Police Officer' : 'Resident',
					isAuthenticated: true
				}
			}),
			{ status: 200, headers: { 'content-type': 'application/json' } }
		);
	} catch (error) {
		console.error('Error verifying code:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{ status: 500, headers: { 'content-type': 'application/json' } }
		);
	}
};

