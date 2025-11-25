<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { supabase } from '$lib/supabaseClient';

	type PortalRole = 'resident' | 'officer';

	const officerRoles = ['Administrator', 'Police Officer', 'Police Chief', 'Crime Analyst'];

	let role: PortalRole = 'officer';
	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = false;
	let visible = false;

	onMount(() => {
		setTimeout(() => {
			visible = true;
		}, 100);

		try {
			const params = new URLSearchParams(window.location.search);
			const qRole = params.get('role');
			if (qRole === 'resident' || qRole === 'officer') {
				role = qRole;
			}
		} catch {
			// Ignore parsing issues
		}
	});

	async function handleLogin() {
		if (isLoading) return;

		isLoading = true;
		errorMessage = '';

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.trim().toLowerCase(),
				password
			});

			if (error || !data.user) {
				throw new Error(error?.message ?? 'Invalid email or password.');
			}

			const { data: profile, error: profileError } = await supabase
				.from('users')
				.select('id, full_name, role')
				.eq('id', data.user.id)
				.maybeSingle();

			if (profileError) {
				throw new Error(profileError.message);
			}

			const resolvedRole = profile?.role ?? 'Resident';
			const isOfficer = officerRoles.includes(resolvedRole);

			if (role === 'officer' && !isOfficer) {
				throw new Error('This account is not authorized for officer access.');
			}

			if (role === 'resident' && isOfficer) {
				throw new Error('Please switch to the Officer login option for this account.');
			}

			const sessionUser = {
				id: profile?.id ?? data.user.id,
				username: profile?.full_name ?? data.user.email?.split('@')[0] ?? 'User',
				email: data.user.email,
				role: resolvedRole,
				isAuthenticated: true
			};

			localStorage.setItem('user', JSON.stringify(sessionUser));

			goto(isOfficer ? '/dashboard' : '/residents');
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Unable to sign you in right now.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
  <PageTransition duration={300} delay={100}>
    <!-- Background elements -->
    <div class="absolute top-0 left-0 w-full h-full">
      <div class="absolute top-1/4 right-1/4 w-64 h-64 bg-indigo-300 opacity-20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
    </div>
  <!-- Animated Background Elements -->
  <div class="absolute inset-0">
    <div class="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-400 opacity-10 rounded-full blur-3xl animate-float"></div>
    <div class="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-400 opacity-10 rounded-full blur-3xl animate-float" style="animation-delay: 1s;"></div>
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-400 opacity-5 rounded-full blur-3xl animate-float" style="animation-delay: 2s;"></div>
  </div>
  
  <!-- Grid Pattern Overlay -->
  <div class="absolute inset-0 opacity-30">
    <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 60px 60px;"></div>
  </div>
  
  {#if visible}
    <div 
      class="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl border-t-4 border-primary-500 relative z-10 transform transition-all duration-500"
      in:fly={{ y: 20, duration: 500, delay: 300 }}
    >
      <!-- Shimmer Effect -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full animate-pulse-glow"></div>
      
      <div class="text-center">
        <div class="relative inline-block">
          <a href="/" class="inline-block">
            <img src="/b-safe-logo.svg" alt="B-SAFE Logo" class="w-32 h-32 mx-auto filter drop-shadow-md hover:drop-shadow-xl transition-all duration-300 cursor-pointer" />
          </a>
          <div class="absolute inset-0 w-32 h-32 mx-auto bg-primary-400 rounded-full opacity-20 animate-pulse-glow pointer-events-none"></div>
        </div>
        <h1 class="mt-6 text-3xl font-extrabold text-gray-900">{role === 'officer' ? 'Officer Login' : 'Resident Login'}</h1>
        <p class="mt-2 text-sm text-gray-600">{role === 'officer' ? 'Authorized Personnel Only' : 'Welcome back to B-SAFE'}</p>
        <div class="h-1 w-16 bg-primary-500 mx-auto mt-4 rounded-full"></div>
        <button
          on:click={() => goto('/')}
          class="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors mx-auto"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back to Home</span>
        </button>
      </div>
      
      <!-- Role toggle -->
      <div class="grid grid-cols-2 gap-2 -mt-4">
        <button class="py-2 rounded-lg border text-sm font-medium transition-colors {role === 'resident' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}" on:click={() => role = 'resident'}>
          Resident
        </button>
        <button class="py-2 rounded-lg border text-sm font-medium transition-colors {role === 'officer' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}" on:click={() => role = 'officer'}>
          Officer
        </button>
      </div>
      
      <form class="mt-8 space-y-6 relative z-10" on:submit|preventDefault={handleLogin} in:fly={{ y: 20, duration: 600, delay: 600 }}>
        <div class="rounded-md shadow-sm space-y-5">
          <div class="group relative">
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1 ml-1">Email address</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2.003 5.884l8 4.8a1 1 0 00.994 0l8-4.8A1 1 0 0018 4H2a1 1 0 00.997 1.884zM18 8.118l-7.447 4.47a3 3 0 01-3.106 0L0 8.118V15a2 2 0 002 2h16a2 2 0 002-2V8.118z" clip-rule="evenodd" />
                </svg>
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                bind:value={email}
                class="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm"
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div class="group relative">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1 ml-1">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                bind:value={password}
                class="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>
        </div>

          {#if errorMessage}
            <div 
              class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm relative" 
              role="alert"
              in:fly={{ y: 10, duration: 300 }}
            >
              <div class="flex items-center">
                <svg class="h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span class="block sm:inline font-medium">{errorMessage}</span>
              </div>
            </div>
          {/if}

          <div class="relative">
            <!-- Login label -->
            <div class="text-center mb-3">
              <h3 class="text-lg font-bold text-indigo-700">🔐 Secure Login</h3>
              <p class="text-sm text-gray-600">Enter your credentials to access B-SAFE</p>
            </div>
            <!-- Glowing background effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-xl blur-lg opacity-30"></div>
            <button
              type="submit"
              disabled={isLoading}
              class="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-glow hover:shadow-glow-lg"
            >
              {#if isLoading}
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg class="animate-spin h-5 w-5 text-primary-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                <span class="ml-2">Logging in...</span>
              {:else}
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg class="h-5 w-5 text-primary-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <span class="ml-2">Log in</span>
              {/if}
            </button>
          </div>
        </form>
      
      <div class="text-center text-sm text-gray-600">
        <span>New here?</span>
        <a class="text-indigo-600 hover:underline ml-1" href="/signup">Create an account</a>
      </div>
      
    </div>
  {/if}
  </PageTransition>
</div>

<style>
  /* Custom animations and styles */
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 0.2;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.1);
    }
  }
  
  .animate-pulse-glow {
    animation: pulse-glow 3s ease-in-out infinite;
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 0.1;
    }
    50% {
      opacity: 0.3;
    }
  }
  
  .animation-delay-1000 {
    animation-delay: 1s;
  }
</style>