<script lang="ts">
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { fade, fly } from 'svelte/transition';
import PageTransition from '$lib/components/PageTransition.svelte';
import { generateId } from '$lib/utils/id';
	
	let role: 'resident' | 'officer' = 'resident';
	let signupMethod: 'gmail' | 'password' = 'gmail';
	let username = '';
	let password = '';
	let confirmPassword = '';
	let email = '';
	let verificationCode = '';
	let errorMessage = '';
	let successMessage = '';
	let isSubmitting = false;
	let isSendingCode = false;
	let codeSent = false;
type StoredUser = {
	id: string;
	username: string;
	password: string;
	role: 'resident' | 'officer';
	email?: string;
};

let existingUsers: StoredUser[] = [];
	
onMount(() => {
	try {
		const raw = localStorage.getItem('users');
		const parsed: StoredUser[] = raw ? JSON.parse(raw) : [];
		let needsSave = false;
		existingUsers = parsed.map(user => {
			if (user?.id) return user;
			needsSave = true;
			return {
				...user,
				id: generateId(user?.role === 'officer' ? 'officer' : 'resident')
			};
		});
		if (needsSave) {
			saveUsers();
		}
	} catch {
		existingUsers = [];
	}
});
	
	function saveUsers() {
		localStorage.setItem('users', JSON.stringify(existingUsers));
	}
	
	async function handleGmailSignup() {
		if (!codeSent) {
			// Step 1: Send verification code
			await sendVerificationCode();
		} else {
			// Step 2: Verify code and create account
			await verifyCodeAndSignup();
		}
	}
	
	async function sendVerificationCode() {
		if (!email) {
			errorMessage = 'Please enter your Gmail address';
			return;
		}
		
		if (!email.toLowerCase().endsWith('@gmail.com')) {
			errorMessage = 'Please use a Gmail address (@gmail.com)';
			return;
		}
		
		// Check if email already exists
		if (existingUsers.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
			errorMessage = 'An account with this email already exists';
			return;
		}
		
		isSendingCode = true;
		errorMessage = '';
		successMessage = '';
		
		try {
			const response = await fetch('/api/auth/send-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.toLowerCase(), role })
			});
			
			const data = await response.json();
			
			if (response.ok) {
				codeSent = true;
				successMessage = data.message || 'Verification code sent to your email!';
				// In development, show the code
				if (data.code) {
					console.log('Verification code (dev only):', data.code);
				}
			} else {
				errorMessage = data.error || 'Failed to send verification code';
			}
		} catch (error) {
			console.error('Error sending code:', error);
			errorMessage = 'Failed to send verification code. Please try again.';
		} finally {
			isSendingCode = false;
		}
	}
	
	async function verifyCodeAndSignup() {
		if (!verificationCode || verificationCode.length !== 6) {
			errorMessage = 'Please enter the 6-digit verification code';
			return;
		}
		
		isSubmitting = true;
		errorMessage = '';
		successMessage = '';
		
		try {
			const response = await fetch('/api/auth/verify-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.toLowerCase(), code: verificationCode })
			});
			
			const data = await response.json();
			
			if (response.ok && data.success) {
				// Save user account
				const username = email.split('@')[0];
				const accountId = generateId(role === 'officer' ? 'officer' : 'resident');
				existingUsers = [
					...existingUsers,
					{
						id: accountId,
						username,
						password: '', // No password for Gmail signup
						role,
						email: email.toLowerCase()
					}
				];
				saveUsers();
				
				// Store user session
				const sessionUser = {
					id: accountId,
					username,
					role: role === 'officer' ? 'Police Officer' : 'Resident',
					isAuthenticated: true
				};
				localStorage.setItem('user', JSON.stringify(sessionUser));
				
				successMessage = 'Account created successfully! Redirecting...';
				
				// Redirect based on role
				setTimeout(() => {
					if (role === 'officer') {
						goto('/dashboard');
					} else {
						goto('/residents');
					}
				}, 1000);
			} else {
				errorMessage = data.error || 'Invalid verification code';
				isSubmitting = false;
			}
		} catch (error) {
			console.error('Error verifying code:', error);
			errorMessage = 'Failed to verify code. Please try again.';
			isSubmitting = false;
		}
	}
	
	function handleSignup() {
		errorMessage = '';
		successMessage = '';
		
		if (!username || !password) {
			errorMessage = 'Please fill out all required fields.';
			return;
		}
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}
		if (existingUsers.some(u => u.username === username)) {
			errorMessage = 'Username already exists.';
			return;
		}
		
		isSubmitting = true;
		setTimeout(() => {
			existingUsers = [
				...existingUsers,
				{ id: generateId(role === 'officer' ? 'officer' : 'resident'), username, password, role }
			];
			saveUsers();
			successMessage = 'Account created successfully. Redirecting to login...';
			setTimeout(() => {
				goto(`/login?role=${role}`);
			}, 800);
		}, 600);
	}
	
	function resetGmailSignup() {
		codeSent = false;
		verificationCode = '';
		email = '';
		errorMessage = '';
		successMessage = '';
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
	<PageTransition duration={300} delay={100}>
		<!-- Subtle background accents -->
		<div class="absolute inset-0">
			<div class="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-400 opacity-10 rounded-full blur-3xl"></div>
			<div class="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-400 opacity-10 rounded-full blur-3xl"></div>
		</div>
		
		<div class="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border-t-4 border-primary-500 relative z-10" in:fly={{ y: 20, duration: 500 }}>
			<div class="text-center mb-6">
			<a href="/" class="inline-block">
				<img src="/b-safe-logo.svg" alt="B-SAFE Logo" class="w-20 h-20 mx-auto cursor-pointer hover:scale-105 transition-transform" />
			</a>
			<h1 class="mt-4 text-2xl font-bold text-gray-900">Create your account</h1>
			<p class="text-gray-600">Choose a role and sign up</p>
			<button
				on:click={() => goto('/')}
				class="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors mx-auto"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				<span>Back to Home</span>
			</button>
		</div>
			
			<!-- Role toggle -->
			<div class="grid grid-cols-2 gap-2 mb-4">
				<button 
					class="py-2 rounded-lg border text-sm font-medium transition-colors {role === 'resident' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}" 
					on:click={() => { role = 'resident'; resetGmailSignup(); }}
				>
					Resident
				</button>
				<button 
					class="py-2 rounded-lg border text-sm font-medium transition-colors {role === 'officer' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}" 
					on:click={() => { role = 'officer'; resetGmailSignup(); }}
				>
					Officer
				</button>
			</div>
			
			<!-- Signup Method Toggle -->
			<div class="grid grid-cols-2 gap-2 mb-6">
				<button 
					class="py-2 rounded-lg border text-sm font-medium transition-colors {signupMethod === 'gmail' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}" 
					on:click={() => { signupMethod = 'gmail'; resetGmailSignup(); }}
				>
					<svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
						<path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
					</svg>
					Gmail Signup
				</button>
				<button 
					class="py-2 rounded-lg border text-sm font-medium transition-colors {signupMethod === 'password' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}" 
					on:click={() => { signupMethod = 'password'; resetGmailSignup(); }}
				>
					Password Signup
				</button>
			</div>
			
			{#if signupMethod === 'gmail'}
				<!-- Gmail Signup Form -->
				<form on:submit|preventDefault={handleGmailSignup} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
								</svg>
							</div>
							<input 
								type="email" 
								class="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
								bind:value={email} 
								disabled={codeSent}
								placeholder="your.email@gmail.com"
								required 
							/>
						</div>
					</div>
					
					{#if codeSent}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
									</svg>
								</div>
								<input 
									type="text" 
									maxlength="6"
									class="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-2xl font-mono tracking-widest" 
									bind:value={verificationCode} 
									placeholder="000000"
									required 
								/>
							</div>
							<p class="text-xs text-gray-500 mt-2">Enter the 6-digit code sent to {email}</p>
							<button
								type="button"
								on:click={resetGmailSignup}
								class="text-xs text-indigo-600 hover:text-indigo-800 mt-2 underline"
							>
								Use a different email
							</button>
						</div>
					{/if}
					
					{#if errorMessage}
						<div class="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm" in:fly={{ y: 10, duration: 300 }}>
							{errorMessage}
						</div>
					{/if}
					{#if successMessage}
						<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm" in:fly={{ y: 10, duration: 300 }}>
							{successMessage}
						</div>
					{/if}
					
					<button 
						type="submit" 
						class="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-60" 
						disabled={isSubmitting || isSendingCode}
					>
						{#if isSubmitting}
							Verifying & Creating Account...
						{:else if isSendingCode}
							Sending Code...
						{:else if codeSent}
							Verify & Sign Up
						{:else}
							Send Verification Code
						{/if}
					</button>
				</form>
			{:else}
				<!-- Password Signup Form -->
				<form on:submit|preventDefault={handleSignup} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
						<input class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" bind:value={username} required />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
						<input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" bind:value={password} required />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
						<input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" bind:value={confirmPassword} required />
					</div>
					
					{#if errorMessage}
						<div class="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm" in:fly={{ y: 10, duration: 300 }}>
							{errorMessage}
						</div>
					{/if}
					{#if successMessage}
						<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm" in:fly={{ y: 10, duration: 300 }}>
							{successMessage}
						</div>
					{/if}
					
					<button type="submit" class="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-colors disabled:opacity-60" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Sign up'}
					</button>
				</form>
			{/if}
			
			<div class="text-center text-sm text-gray-600 mt-4">
				Already have an account?
				<a class="text-indigo-600 hover:underline" href="/login">Log in</a>
			</div>
		</div>
	</PageTransition>
</div>

<style>
	/* keep styles minimal and consistent */
</style>


