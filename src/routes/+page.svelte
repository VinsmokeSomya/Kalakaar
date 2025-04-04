<script lang="ts">
  // Explicitly type Canvas component if possible, otherwise use generic SvelteComponent
  import type CanvasComponentType from '$lib/Canvas.svelte'; 
  import Canvas from '$lib/Canvas.svelte';
  import FeedbackForm from '$lib/FeedbackForm.svelte';
  import { LoaderCircle, Palette, Trash2, Image as ImageIcon, Wand2, Moon, Sun, X, MessageSquare, Sparkles, Paintbrush } from 'lucide-svelte';
  import type { SvelteComponent } from 'svelte'; // Keep for potential generic use
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // --- Theme Store --- 
  const theme = writable<'light' | 'dark'>('light'); // Default to light

  // State for fullscreen image modal
  let isFullscreenView = false;
  let showFeedbackModal = false; // State for feedback modal visibility

  function toggleTheme() {
    theme.update(current => {
      const newTheme = current === 'light' ? 'dark' : 'light';
      localStorage.theme = newTheme;
      
      // Apply the theme immediately
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Force a full page reload to apply all styles completely
      window.location.reload();
      
      return newTheme;
    });
  }

  onMount(() => {
    // Initialize store based on localStorage/system pref on client-side
    try {
      const storedTheme = localStorage.theme;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Set the appropriate theme in the store
      const initialTheme = storedTheme === 'dark' || (!storedTheme && systemPrefersDark) ? 'dark' : 'light';
      
      // Apply theme to DOM
      theme.set(initialTheme);
      
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      
      console.log('Theme initialized to:', initialTheme, 'classList:', document.documentElement.classList.contains('dark'));
    } catch (e) {
      console.error('Error initializing theme:', e);
    }
  });
  // --- End Theme Store ---

  // Type the component instance
  let canvasComponent: CanvasComponentType;
  let strokeColor = '#000000';
  let lineWidth = 5;
  let prompt = '';
  let generatedText = '';
  let generatedImageDataUrl: string | null = null;
  let isLoading = false;
  let errorMsg = '';

  async function handleGenerate() {
    if (!prompt || isLoading || !canvasComponent) return;
    const currentDrawingData = canvasComponent.getImageDataURL();
    if (!currentDrawingData) {
      errorMsg = 'Draw something first!'; return;
    }
    isLoading = true;
    errorMsg = '';
    generatedText = '';
    generatedImageDataUrl = null;
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageData: currentDrawingData }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! Status: ${response.status}`);
      }
      generatedText = data.text || '';
      if (data.imageData?.data) {
        generatedImageDataUrl = `data:${data.imageData.mimeType};base64,${data.imageData.data}`;
      } else {
        console.log('No image data received.');
      }
    } catch (err) {
      console.error("Gen failed:", err);
      errorMsg = err instanceof Error ? err.message : 'Unknown error.';
      generatedImageDataUrl = null;
    } finally {
      isLoading = false;
    }
  }

  function clearAll() {
    canvasComponent?.clearCanvas();
    generatedText = '';
    generatedImageDataUrl = null;
    prompt = '';
    errorMsg = '';
  }

</script>

<svelte:head>
  <title>कलाkaar ✨</title>
</svelte:head>

<!-- Main container -->
<div class="min-h-screen w-full dark:bg-gray-900 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 p-0 flex flex-col items-center font-sans antialiased transition-colors duration-300 relative">
  
  <!-- Absolutely Positioned Logo -->
  <img src="/kalakar-logo.png" alt="Kalakaar Logo" class="absolute top-4 left-4 h-18 w-auto rounded-lg z-10" />

  <!-- Absolutely Positioned Theme Toggle -->
  <button 
    on:click={toggleTheme} 
    class="absolute top-4 right-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all z-10"
    aria-label="Toggle theme">
    {#if $theme === 'light'}
      <Moon class="w-5 h-5" />
    {:else}
      <Sun class="w-5 h-5" />
    {/if}
  </button>

  <!-- Header -->
  <header class="w-full max-w-[1400px] mb-6 md:mb-10 flex justify-between items-center px-4 pt-8">
    <div class="flex items-center w-24"> <!-- Added fixed width spacer for logo area -->
      <!-- Spacer, was logo area -->
    </div>
    <div class="text-center flex-1">
      <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-1 sm:mb-2 flex items-center justify-center gap-3">
        <Paintbrush class="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600"/> कलाkaar
      </h1>
      <p class="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Draw something and bring it to life with AI</p>
      <p class="text-gray-500 dark:text-gray-500 text-xs sm:text-sm mt-1">Built by Dumb Kid AI</p>
    </div>
    <div class="flex justify-end w-24"> <!-- Added fixed width spacer for button area -->
      <!-- Spacer, was theme button area -->
    </div>
  </header>

  <!-- Main content area -->
  <div class="w-full flex flex-col lg:flex-row items-start justify-center gap-4 md:gap-6 px-4">

    <!-- Left Side: Canvas and Controls -->
    <div class="flex flex-col items-center lg:order-1 w-full max-w-[1200px]">
       
       <!-- Controls Styling -->
       <div class="w-full mb-3 p-3 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex flex-wrap justify-center items-center gap-x-5 gap-y-3">
          <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer group">
            <Palette class="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"/>
            <span class="hidden sm:inline">Color:</span>
            <input 
              type="color" 
              bind:value={strokeColor} 
              class="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden appearance-none bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800"
              style="background-color: {strokeColor};" 
            />
          </label>
          
          <div class="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[160px]">
            <span class="whitespace-nowrap">Width: <span class="font-semibold">{lineWidth}px</span></span>
            <input 
              type="range" 
              bind:value={lineWidth} 
              min="1" max="30" step="1" 
              class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 accent-indigo-600 dark:accent-indigo-400"
            />
          </div>

          <!-- Undo/Redo Buttons -->
          <div class="flex gap-2">
            <button
              on:click={() => canvasComponent?.undo()}
              class="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              aria-label="Undo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7v6h6"></path>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
              </svg>
            </button>
            <button
              on:click={() => canvasComponent?.redo()}
              class="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              aria-label="Redo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 7v6h-6"></path>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
              </svg>
            </button>
          </div>

          <button
            on:click={() => canvasComponent?.clearCanvas()} 
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400 active:bg-red-200 dark:active:bg-red-800/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800"
            aria-label="Clear Canvas">
              <Trash2 class="w-5 h-5"/>
          </button>

          <!-- Download Drawing Button -->
          <button
            on:click={() => {
              if (canvasComponent) {
                const dataUrl = canvasComponent.getImageDataURL();
                if (dataUrl) {
                  const link = document.createElement('a');
                  link.download = 'kalakar-drawing.png';
                  link.href = dataUrl;
                  link.click();
                }
              }
            }}
            class="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            aria-label="Download Drawing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
       </div>

        <!-- Canvas container -->
        <div class="relative w-full aspect-[16/9] mx-auto bg-white dark:bg-gray-300 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden group transition-colors duration-300">
            <!-- Ensure Canvas component fills the container -->
            <Canvas 
                bind:this={canvasComponent} 
                {strokeColor} 
                {lineWidth} 
                width={1200} 
                height={675} 
            /> 
            <div class="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-600 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">Draw here!</div>
        </div>
    </div>

    <!-- Right Side: Prompt and Result -->
    <div class="flex flex-col lg:min-w-[350px] max-w-[500px] w-full gap-4 lg:order-2 lg:mt-[49px]">
      <!-- Prompt Input Area -->
      <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
         <label for="prompt-input" class="block text-sm font-semibold text-gray-700 dark:text-white mb-2">Enter your prompt:</label>
         <textarea
           id="prompt-input"
           bind:value={prompt}
           rows="4"
           style="color: var(--text-color, inherit); min-height: 100px;"
           class="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150 ease-in-out text-base resize-y placeholder:text-gray-400 dark:placeholder:text-gray-400"
           placeholder="e.g., 'make it look like a water color painting', 'add a cute cat'..."
         ></textarea>
      </div>

      <!-- Generate Button -->
      <button
        on:click={handleGenerate}
        disabled={isLoading || !prompt}
        class="w-full flex justify-center items-center gap-2.5 px-5 py-3 bg-indigo-600 text-white text-base font-semibold rounded-lg shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
          {#if isLoading}
             <LoaderCircle class="w-5 h-5 animate-spin" /> Generating...
          {:else}
             <Sparkles class="w-5 h-5"/> Generate Image
          {/if}
      </button>

       <!-- Error Message Display -->
       {#if errorMsg}
         <div class="p-3.5 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 rounded-lg text-sm shadow-sm">
            <strong>Error:</strong> {errorMsg}
         </div>
       {/if}

       <!-- Result Display Area -->
       <div class="p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow min-h-[200px] flex flex-col transition-colors duration-300">
         <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Result</h3>
         <div class="flex-grow flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
           {#if isLoading}
              <LoaderCircle class="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin"/>
           {:else if generatedImageDataUrl}
             <div class="relative w-full flex flex-col items-center">
               <img 
                  src={generatedImageDataUrl} 
                  alt="Generated by Gemini" 
                  class="max-w-full max-h-[450px] h-auto object-contain rounded-md shadow-inner"
               />
               <div class="flex gap-2 mt-4">
                 <a 
                   href={generatedImageDataUrl} 
                   download={`kalakar-${prompt.slice(0, 30).trim().replace(/[\\/:*?"<>|]/g, '_')}.png`}
                   class="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg flex items-center gap-2 transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                     <polyline points="7 10 12 15 17 10"></polyline>
                     <line x1="12" y1="15" x2="12" y2="3"></line>
                   </svg>
                   Download Image
                 </a>
                 <button 
                   on:click={() => {
                     if (generatedImageDataUrl) {
                       isFullscreenView = true;
                     }
                   }}
                   class="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg flex items-center gap-2 transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <polyline points="15 3 21 3 21 9"></polyline>
                     <polyline points="9 21 3 21 3 15"></polyline>
                     <line x1="21" y1="3" x2="14" y2="10"></line>
                     <line x1="3" y1="21" x2="10" y2="14"></line>
                   </svg>
                   Pop Out View
                 </button>
               </div>
             </div>
           {:else if generatedText}
             <p class="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap p-2">{generatedText}</p>
           {:else}
             <p class="text-gray-400 dark:text-gray-500 italic text-sm">Generated image will appear here</p>
           {/if}
         </div>
       </div>

      <!-- Clear All Button -->
      <button
        on:click={clearAll}
        class="w-full px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-300 dark:active:bg-gray-500 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
          Clear All
      </button>

      <!-- Give Feedback Button -->
      <button
        on:click={() => showFeedbackModal = true}
        class="mt-4 w-full flex justify-center items-center gap-2.5 px-5 py-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium rounded-lg border border-blue-200 dark:border-blue-700/50 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-800/60 active:bg-blue-300 dark:active:bg-blue-700/70 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
          <MessageSquare class="w-5 h-5"/> Give Feedback
      </button>
    </div>

  </div>

  <!-- Feedback Modal -->
  {#if showFeedbackModal}
    <div 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      on:click={() => showFeedbackModal = false} 
      on:keydown={(e) => e.key === 'Escape' && (showFeedbackModal = false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      tabindex="-1" 
    >
      <div 
        class="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto" 
        on:click|stopPropagation
        on:keydown|stopPropagation
        role="document"
        tabindex="0"
      >
        <!-- Close Button -->
        <button 
          on:click={() => showFeedbackModal = false} 
          class="absolute top-3 right-3 p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close feedback form"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Modal Content -->
        <h2 id="feedback-modal-title" class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Give Feedback</h2>
        <FeedbackForm />
      </div>
    </div>
  {/if}
</div>

<!-- Fullscreen Image Overlay -->
{#if isFullscreenView && generatedImageDataUrl}
  <div 
    class="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
    on:click={() => isFullscreenView = false}
    on:keydown={(e) => e.key === 'Escape' && (isFullscreenView = false)}
    role="dialog"
    aria-modal="true"
    aria-label="Fullscreen image view"
    tabindex="0"
  >
    <div class="absolute top-4 right-4">
      <button 
        on:click={() => isFullscreenView = false} 
        class="p-2 rounded-full bg-gray-800/30 text-white hover:bg-gray-800/50 transition-colors"
        aria-label="Close fullscreen view"
      >
        <X class="w-6 h-6" />
      </button>
    </div>
    
    <div 
      class="max-w-full max-h-full" 
      on:click|stopPropagation
      on:keydown|stopPropagation
      tabindex="-1"
      role="presentation"
    >
      <img 
        src={generatedImageDataUrl} 
        alt="Full Screen View" 
        class="max-w-full max-h-[90vh] h-auto object-contain rounded-md shadow-xl" 
      />
    </div>
  </div>
{/if}
