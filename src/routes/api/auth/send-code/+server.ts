import type { RequestHandler } from './$types';
import { storeVerificationCode } from '$lib/server/verificationStore';

// Generate a 6-digit verification code
function generateCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send email using a simple SMTP service or API
// For production, use services like SendGrid, AWS SES, or Nodemailer with Gmail
async function sendEmail(to: string, code: string, role: string): Promise<boolean> {
	try {
		// In a real application, you would use an email service here
		// For now, we'll simulate email sending and log the code
		console.log(`[EMAIL VERIFICATION] Sending code to ${to}: ${code} (Role: ${role})`);
		
		// Simulate email sending delay
		await new Promise(resolve => setTimeout(resolve, 500));
		
		// In production, replace this with actual email sending:
		// const nodemailer = require('nodemailer');
		// const transporter = nodemailer.createTransport({...});
		// await transporter.sendMail({
		//   from: 'noreply@bsafe.com',
		//   to: to,
		//   subject: 'Your B-SAFE Verification Code',
		//   html: `Your verification code is: <strong>${code}</strong>`
		// });
		
		return true;
	} catch (error) {
		console.error('Failed to send email:', error);
		return false;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, role } = await request.json();
		
		if (!email || !role) {
			return new Response(
				JSON.stringify({ error: 'Email and role are required' }),
				{ status: 400, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Validate email format (basic check)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return new Response(
				JSON.stringify({ error: 'Invalid email format' }),
				{ status: 400, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Check if email is Gmail (optional validation)
		const isGmail = email.toLowerCase().endsWith('@gmail.com');
		if (!isGmail) {
			return new Response(
				JSON.stringify({ error: 'Please use a Gmail address' }),
				{ status: 400, headers: { 'content-type': 'application/json' } }
			);
		}
		
		// Generate verification code
		const code = generateCode();
		
		// Store verification code
		storeVerificationCode(email, code, role, 10);
		
		// Send email
		const emailSent = await sendEmail(email, code, role);
		
		if (!emailSent) {
			return new Response(
				JSON.stringify({ error: 'Failed to send verification email' }),
				{ status: 500, headers: { 'content-type': 'application/json' } }
			);
		}
		
		return new Response(
			JSON.stringify({ 
				success: true, 
				message: 'Verification code sent to your email',
				// In development, include the code for testing
				...(process.env.NODE_ENV === 'development' && { code })
			}),
			{ status: 200, headers: { 'content-type': 'application/json' } }
		);
	} catch (error) {
		console.error('Error sending verification code:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{ status: 500, headers: { 'content-type': 'application/json' } }
		);
	}
};

