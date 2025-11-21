<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import ActionCard from '$lib/components/ActionCard.svelte';
  import { goto } from '$app/navigation';
  
let visible = false;
let showRoleChooser = false;
let videoPlaying = false;
let currentUser: { role?: string; isAuthenticated?: boolean } | null = null;
  
  const features = [
    {
      title: "Quick Report Submission",
      description: "Submit incident reports instantly with photos and videos. Get real-time updates on your case status.",
      icon: "📱",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Real-time Tracking",
      description: "Monitor your reports as they progress through investigation stages with live status updates.",
      icon: "📍",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Community Safety",
      description: "Work together with barangay officials to build a safer and more secure neighborhood.",
      icon: "🛡️",
      color: "from-indigo-500 to-purple-500"
    },
    {
      title: "24/7 Access",
      description: "Access the platform anytime, anywhere. Report incidents and track progress at your convenience.",
      icon: "⏰",
      color: "from-orange-500 to-red-500"
    }
  ];

  const benefits = [
    {
      title: "Faster Response",
      description: "Officials receive reports instantly and can respond quickly to emergencies"
    },
    {
      title: "Better Communication",
      description: "Stay informed with updates and notifications about your reports"
    },
    {
      title: "Transparent Process",
      description: "Track every step of your report from submission to resolution"
    },
    {
      title: "Community Engagement",
      description: "Build stronger community bonds through active participation"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description: "Create your account using Gmail or password. Quick and secure verification process."
    },
    {
      number: "2",
      title: "Submit Report",
      description: "Fill out the incident form with details, location, and attach photos or videos if available."
    },
    {
      number: "3",
      title: "Track Progress",
      description: "Monitor your report status in real-time as officials investigate and resolve your case."
    },
    {
      number: "4",
      title: "Get Updates",
      description: "Receive notifications and updates from barangay officials throughout the process."
    }
  ];

onMount(() => {
  setTimeout(() => {
    visible = true;
  }, 300);
  try {
    const raw = localStorage.getItem('user');
    currentUser = raw ? JSON.parse(raw) : null;
  } catch {
    currentUser = null;
  }
});

  function toggleVideo() {
    videoPlaying = !videoPlaying;
  }

function handleResidentEntry() {
  showRoleChooser = false;
  const isResident =
    currentUser?.role === 'Resident' && currentUser?.isAuthenticated;
  if (!isResident) {
    goto('/login?role=resident');
    return;
  }
  goto('/residents');
}
</script>

<div class="landing-page min-h-screen relative overflow-hidden">
  <!-- Video Background Section -->
  <div class="hero-section relative h-screen flex items-center justify-center overflow-hidden">
    <!-- Video Background (optional - can be enabled when video is available) -->
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900">
      <!-- Placeholder for video - replace with actual video when available -->
      <!-- 
      <video 
        autoplay 
        muted 
        loop 
        playsinline
        class="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source src="/videos/barangay-hero.mp4" type="video/mp4">
      </video>
      -->
      <!-- Fallback gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-blue-900/80 to-slate-900/80"></div>
    </div>

    <!-- Animated Background Elements -->
    <div class="absolute inset-0">
      <div class="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-400 opacity-20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-400 opacity-20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
    </div>

    <!-- Hero Content -->
    <div class="container mx-auto px-4 relative z-10 text-center">
      {#if visible}
        <div in:fly={{ y: -50, duration: 1000 }}>
          <!-- Logo -->
          <div class="mb-8">
            <a href="/" class="inline-block">
              <img src="/b-safe-logo.svg" alt="B-SAFE Logo" class="w-32 h-32 mx-auto filter drop-shadow-2xl hover:scale-110 transition-transform duration-300 cursor-pointer" />
            </a>
          </div>

          <!-- Main Heading -->
          <h1 class="text-5xl md:text-7xl font-bold mb-4 text-white drop-shadow-2xl" in:fade={{ duration: 1000, delay: 200 }}>
            B-SAFE
          </h1>
          
          <p class="text-2xl md:text-3xl mb-2 text-blue-200 font-light drop-shadow-lg" in:fade={{ duration: 1000, delay: 400 }}>
            Barangay Secure And Fast Engagement
          </p>
          
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mt-4" in:fade={{ duration: 1000, delay: 500 }}>
            <svg class="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm text-white font-medium">Serving Brgy. Banicain Community</span>
          </div>

          <!-- Barangay Info -->
          <div class="mb-8" in:fade={{ duration: 1000, delay: 600 }}>
            <p class="text-xl md:text-2xl text-white/90 font-semibold mb-2">
              Brgy. Banicain
            </p>
            <p class="text-lg text-blue-200">
              Olongapo City, Zambales
            </p>
          </div>

          <!-- Tagline -->
          <p class="text-lg md:text-xl mb-12 max-w-3xl mx-auto text-gray-200 leading-relaxed drop-shadow-lg" in:fade={{ duration: 1000, delay: 800 }}>
            Building a Safer Community Through Technology and Active Citizen Engagement
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center" in:scale={{ duration: 800, delay: 1000 }}>
            <button 
              type="button"
              on:click={() => showRoleChooser = true}
              class="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-full shadow-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <span>Get Started</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </button>
            
            <button 
              type="button"
              on:click={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              class="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-bold text-lg rounded-full hover:bg-white/20 transition-all duration-300"
            >
              Learn More
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Scroll Indicator -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
      <svg class="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
      </svg>
    </div>
  </div>

  <!-- About Section -->
  <section id="about" class="py-20 bg-gradient-to-b from-slate-50 to-white">
    <div class="container mx-auto px-4">
      {#if visible}
        <div class="max-w-4xl mx-auto text-center" in:fly={{ y: 30, duration: 800 }}>
          <h2 class="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            About B-SAFE
          </h2>
          <p class="text-xl text-gray-700 mb-8 leading-relaxed">
            B-SAFE is a comprehensive digital platform designed specifically for 
            <strong class="text-indigo-600">Brgy. Banicain, Olongapo City, Zambales</strong>. 
            Our mission is to bridge the gap between residents and barangay officials, 
            making it easier to report incidents, track cases, and build a safer community together.
          </p>
          <div class="bg-gradient-to-r from-indigo-50 to-blue-50 p-8 rounded-2xl border border-indigo-100">
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
            <p class="text-lg text-gray-700">
              To create a digitally empowered barangay where every resident can easily 
              report incidents, stay informed, and actively participate in community safety initiatives.
            </p>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Features Section -->
  <section class="py-20 bg-white">
    <div class="container mx-auto px-4">
      {#if visible}
        <div class="text-center mb-16" in:fade={{ duration: 800 }}>
          <h2 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Key Features</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to stay connected with your barangay officials
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {#each features as feature, index}
            <div 
              class="feature-card bg-gradient-to-br {feature.color} p-8 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              in:fly={{ y: 30, duration: 600, delay: index * 100 }}
            >
              <div class="text-5xl mb-4">{feature.icon}</div>
              <h3 class="text-xl font-bold mb-3">{feature.title}</h3>
              <p class="text-white/90 leading-relaxed">{feature.description}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- How It Works Section -->
  <section class="py-20 bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50">
    <div class="container mx-auto px-4">
      {#if visible}
        <div class="text-center mb-16" in:fade={{ duration: 800 }}>
          <h2 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900">How It Works</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Simple steps to report incidents and track your cases
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {#each steps as step, index}
            <div 
              class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              in:fly={{ y: 30, duration: 600, delay: index * 150 }}
            >
              <div class="w-16 h-16 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 mx-auto">
                {step.number}
              </div>
              <h3 class="text-xl font-bold mb-3 text-gray-900 text-center">{step.title}</h3>
              <p class="text-gray-600 text-center leading-relaxed">{step.description}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Benefits Section -->
  <section class="py-20 bg-white">
    <div class="container mx-auto px-4">
      {#if visible}
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16" in:fade={{ duration: 800 }}>
            <h2 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Why Choose B-SAFE?</h2>
            <p class="text-xl text-gray-600">
              Benefits for residents and the community
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            {#each benefits as benefit, index}
              <div 
                class="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:border-indigo-300 transition-all duration-300 shadow-md hover:shadow-lg"
                in:fly={{ x: index % 2 === 0 ? -30 : 30, duration: 600, delay: index * 100 }}
              >
                <h3 class="text-2xl font-bold mb-3 text-gray-900 flex items-center gap-3">
                  <span class="text-indigo-600">✓</span>
                  {benefit.title}
                </h3>
                <p class="text-gray-700 leading-relaxed">{benefit.description}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>


  <!-- CTA Section -->
  <section class="py-20 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
    <div class="container mx-auto px-4 text-center">
      {#if visible}
        <div in:scale={{ duration: 800 }}>
          <h2 class="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Get Started?
          </h2>
          <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join your neighbors in building a safer Brgy. Banicain
          </p>
          <button 
            type="button"
            on:click={() => showRoleChooser = true}
            class="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xl rounded-full shadow-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
          >
            Start Reporting Now
          </button>
        </div>
      {/if}
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-slate-900 text-gray-300 py-12">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 class="text-white font-bold text-lg mb-4">B-SAFE</h3>
          <p class="text-gray-400">
            Barangay Secure And Fast Engagement<br>
            Brgy. Banicain<br>
            Olongapo City, Zambales
          </p>
        </div>
        <div>
          <h3 class="text-white font-bold text-lg mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li><a href="/residents" class="hover:text-white transition">Report Incident</a></li>
            <li><a href="/login" class="hover:text-white transition">Login</a></li>
            <li><a href="/signup" class="hover:text-white transition">Sign Up</a></li>
            <li><a href="/dashboard" class="hover:text-white transition">Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-white font-bold text-lg mb-4">Contact</h3>
          <p class="text-gray-400 mb-3">
            Barangay Hall<br>
            Brgy. Banicain, Olongapo City, Zambales
          </p>
          <div class="space-y-2">
            <a href="tel:+63" class="block text-blue-400 hover:text-blue-300 transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
              Contact Barangay Office
            </a>
            <a href="mailto:info@bsafe-banicain.gov.ph" class="block text-blue-400 hover:text-blue-300 transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              Email Us
            </a>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
        <p>&copy; 2024 B-SAFE - Brgy. Banicain, Olongapo City, Zambales. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <!-- Role Chooser Modal -->
  {#if showRoleChooser}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" transition:fade={{ duration: 200 }} on:click={() => showRoleChooser = false}>
      <div class="w-full max-w-3xl mx-4 bg-white rounded-2xl p-8 shadow-2xl relative" transition:scale={{ duration: 300 }} on:click|stopPropagation>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-3xl font-bold text-gray-900">Continue as</h2>
          <button class="text-gray-500 hover:text-gray-700 transition text-2xl" on:click={() => showRoleChooser = false} aria-label="Close">
            ✕
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div on:click={handleResidentEntry} class="cursor-pointer">
            <ActionCard
              title="Resident"
              description="Submit reports, track cases, and stay updated with community news"
              bgColor="bg-gradient-to-r from-blue-500 to-indigo-500"
              hoverColor="hover:from-blue-600 hover:to-indigo-600"
            />
          </div>
          <div on:click={() => { goto('/login'); showRoleChooser = false; }} class="cursor-pointer">
            <ActionCard
              title="Barangay Official"
              description="Manage reports, investigate cases, and serve the community"
              bgColor="bg-gradient-to-r from-slate-700 to-slate-800"
              hoverColor="hover:from-slate-800 hover:to-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .landing-page {
    scroll-behavior: smooth;
  }

  .hero-section {
    min-height: 100vh;
  }

  .feature-card {
    position: relative;
    overflow: hidden;
  }

  .feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  .feature-card:hover::before {
    left: 100%;
  }

  @keyframes pulse-slow {
    0%, 100% {
      opacity: 0.1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .animate-pulse-slow {
    animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animation-delay-1000 {
    animation-delay: 1s;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
</style>
