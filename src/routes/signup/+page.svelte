<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { supabase } from '$lib/supabaseClient';

	let fullName = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let acceptTerms = false;
	let errorMessage = '';
	let successMessage = '';
	let isSubmitting = false;

	// All new accounts are automatically set to Resident
	const role = 'Resident';

	const passwordTips = [
		'Use at least 8 characters',
		'Mix upper & lowercase letters',
		'Add a number or symbol for extra security'
	];

	function resetMessages() {
		errorMessage = '';
		successMessage = '';
	}

	async function handleSignup() {
		if (isSubmitting) return;

		resetMessages();

		const trimmedName = fullName.trim();
		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
			errorMessage = 'Please fill out all required fields.';
			return;
		}

		if (password.length < 8) {
			errorMessage = 'Password must be at least 8 characters long.';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}

		if (!acceptTerms) {
			errorMessage = 'Please agree to the Terms of Service and Privacy Policy.';
			return;
		}

		isSubmitting = true;

		try {
			const { data, error } = await supabase.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					data: {
						full_name: trimmedName
					}
				}
			});

			if (error || !data.user) {
				throw new Error(error?.message ?? 'Unable to create your account.');
			}

			const userId = data.user.id;
			const { error: profileError } = await supabase.from('users').upsert({
				id: userId,
				email: trimmedEmail,
				full_name: trimmedName,
				role: 'Resident', // All new accounts are automatically residents
				is_active: true
			});

			if (profileError) {
				console.error('Failed to sync profile to users table:', profileError);
			}

			successMessage = 'Account created! Please verify your email, then log in.';
			fullName = '';
			email = '';
			password = '';
			confirmPassword = '';
			acceptTerms = false;

			// Always redirect to resident login
			setTimeout(() => goto('/login?role=resident'), 2000);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to create your account.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden px-4">
	<PageTransition duration={300} delay={100}>
		<div class="absolute inset-0 pointer-events-none">
			<div class="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-400 opacity-10 rounded-full blur-3xl"></div>
			<div class="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-400 opacity-10 rounded-full blur-3xl"></div>
		</div>

		<div class="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border-t-4 border-primary-500 relative z-10 p-6 md:p-10" in:fly={{ y: 20, duration: 500 }}>
			<div class="flex flex-col gap-6 md:flex-row md:gap-10">
				<div class="md:w-1/2 space-y-6">
					<div class="text-center md:text-left">
						<a href="/" class="inline-flex items-center justify-center">
							<img src="/b-safe-logo.svg" alt="B-SAFE Logo" class="w-16 h-16 md:w-20 md:h-20 hover:scale-105 transition-transform" />
						</a>
						<h1 class="mt-4 text-3xl font-bold text-gray-900">Register as Resident</h1>
						<p class="text-gray-600">Create a resident account to submit and track reports</p>
					</div>

					<div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
						<h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">Why create an account?</h2>
						<ul class="mt-3 space-y-2 text-sm text-slate-600">
							<li class="flex items-start gap-2">
								<span class="text-primary-500 text-lg">•</span>
								<span>Submit and track incident reports anytime.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-primary-500 text-lg">•</span>
								<span>Receive updates directly from barangay officers.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-primary-500 text-lg">•</span>
								<span>Help keep Brgy. Banicain safer for everyone.</span>
							</li>
						</ul>
					</div>

					<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
						<p class="text-sm font-medium text-indigo-700">Password tips</p>
						<ul class="mt-2 space-y-1 text-xs text-indigo-600">
							{#each passwordTips as tip}
								<li>• {tip}</li>
							{/each}
						</ul>
					</div>

					<button
						type="button"
						on:click={() => goto('/')}
						class="hidden md:inline-flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
						</svg>
						<span>Back to Home</span>
					</button>
				</div>

				<div class="md:w-1/2 space-y-6">
					<form class="space-y-4" on:submit|preventDefault={handleSignup}>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
							<input
								type="text"
								class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								placeholder="John Doe"
								bind:value={fullName}
								required
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
							<input
								type="email"
								class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								placeholder="your@email.com"
								bind:value={email}
								required
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
							<input
								type="password"
								class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								placeholder="Create a strong password"
								bind:value={password}
								required
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
							<input
								type="password"
								class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								placeholder="Re-enter your password"
								bind:value={confirmPassword}
								required
							/>
						</div>

						<div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
							<p class="text-xs text-blue-700">
								ℹ️ All new accounts are automatically created as <strong>Resident</strong> accounts. 
								Resident accounts can submit and track incident reports.
							</p>
						</div>

						<div class="flex items-start gap-3">
							<input
								type="checkbox"
								id="terms"
								class="mt-1 w-4 h-4 border-gray-300 text-primary-600 rounded focus:ring-primary-500"
								bind:checked={acceptTerms}
							/>
							<label for="terms" class="text-sm text-gray-600">
								I agree to the
								<a href="#" class="text-primary-600 hover:underline">Terms of Service</a>
								and
								<a href="#" class="text-primary-600 hover:underline">Privacy Policy</a>.
							</label>
						</div>

						{#if errorMessage}
							<div class="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
								{errorMessage}
							</div>
						{/if}

						{#if successMessage}
							<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">
								{successMessage}
							</div>
						{/if}

						<button
							type="submit"
							class="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 transition-all duration-200 shadow-lg disabled:opacity-60"
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Creating your account...' : 'Create Account'}
						</button>
					</form>

					<div class="text-center text-sm text-gray-600">
						Already have an account?
						<a class="text-indigo-600 hover:underline" href="/login">Log in</a>
					</div>
				</div>
			</div>

			<button
				type="button"
				on:click={() => goto('/')}
				class="mt-6 md:hidden flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors w-full"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				<span>Back to Home</span>
			</button>
		</div>
	</PageTransition>
</div>
