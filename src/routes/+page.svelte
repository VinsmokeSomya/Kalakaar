<script lang="ts">
  // Explicitly type Canvas component if possible, otherwise use generic SvelteComponent
  import type CanvasComponentType from '$lib/Canvas.svelte'; 
  import Canvas from '$lib/Canvas.svelte';
  import FeedbackForm from '$lib/FeedbackForm.svelte';
  import { LoaderCircle, Palette, Trash2, Image as ImageIcon, Wand2, Moon, Sun, X, MessageSquare, Sparkles, Paintbrush, Eraser, Pen, Highlighter, Feather, SprayCan, Wind, Edit3, Pencil, Droplet, PenTool } from 'lucide-svelte';
  import type { SvelteComponent } from 'svelte'; // Keep for potential generic use
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // --- Theme Store --- 
  const theme = writable<'light' | 'dark'>('light'); // Default to light

  // State for fullscreen image modal
  let isFullscreenView = $state(false); // Use $state
  let showFeedbackModal = $state(false); // Use $state

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
  let strokeColor = $state('#000000');
  let lineWidth = $state(5);
  let currentTool: 'pen' | 'eraser' = $state('pen');
  let currentBrush: 'pen' | 'marker' | 'crayon' | 'spray' | 'airbrush' | 'charcoal' | 'pencil' | 'watercolor' | 'oil' | 'calligraphy' = $state('pen');
  let prompt = $state('');
  let generatedText = $state('');
  let generatedImageDataUrl: string | null = $state(null); // Use $state
  let isLoading = $state(false);     // Use $state
  let errorMsg = $state('');       // Use $state

  // --- Keyboard Shortcuts --- 
  $effect(() => {
    function handleKeydown(event: KeyboardEvent) {
      // Ignore shortcuts if focus is on an input/textarea
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // Undo (Ctrl/Cmd + Z)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); // Prevent browser default undo
        canvasComponent?.undo();
      }
      // Redo (Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z)
      else if (
        (event.ctrlKey || event.metaKey) && 
        (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))
      ) {
        event.preventDefault(); // Prevent browser default redo
        canvasComponent?.redo();
      }
      // Eraser Tool (E)
      else if (event.key.toLowerCase() === 'e') {
        event.preventDefault(); 
        currentTool = 'eraser';
      }
      // Pen Tool / Default Pen Brush (P)
      else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        currentTool = 'pen'; // Switch to pen tool if eraser was active
        currentBrush = 'pen'; // Select pen brush
      }
      // Other Brush Shortcuts (only if pen tool is active)
      else if (currentTool === 'pen') {
        switch (event.key.toLowerCase()) {
          case 'm':
            event.preventDefault();
            currentBrush = 'marker';
            break;
          case 'c':
            event.preventDefault();
            currentBrush = 'crayon';
            break;
          case 's':
            event.preventDefault();
            currentBrush = 'spray';
            break;
          case 'a':
            event.preventDefault();
            currentBrush = 'airbrush';
            break;
          case 'h':
            event.preventDefault();
            currentBrush = 'charcoal';
            break;
          case 'l':
            event.preventDefault();
            currentBrush = 'pencil';
            break;
          case 'w':
            event.preventDefault();
            currentBrush = 'watercolor';
            break;
          case 'o':
            event.preventDefault();
            currentBrush = 'oil';
            break;
          case 'g':
            event.preventDefault();
            currentBrush = 'calligraphy';
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeydown);

    // Cleanup listener on component destroy
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
  // --- End Keyboard Shortcuts ---

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
  
  <!-- Sidebar Group Container - NOW acts as the narrow trigger -->
  <div class="group fixed top-0 left-0 h-full z-40 w-2 cursor-pointer"> <!-- Added w-2, removed inner trigger -->
    <!-- Removed Hover Trigger Area -->

    <!-- Sidebar Content (moves with group hover) -->
    <aside class="absolute top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 shadow-lg p-4 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto border-r border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Keyboard Shortcuts</h3>
      <ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li><kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Ctrl/Cmd</kbd> + <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Z</kbd>: Undo</li>
        <li><kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Ctrl/Cmd</kbd> + <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Y</kbd>: Redo</li>
        <li class="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2"><strong>Tools:</strong></li>
        <li class="flex items-center gap-2"><Eraser class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">E</kbd>: Eraser</li>
        <li class="flex items-center gap-2"><Pen class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">P</kbd>: Pen Brush</li>
        <li class="flex items-center gap-2"><Highlighter class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">M</kbd>: Marker Brush</li>
        <li class="flex items-center gap-2"><Feather class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">C</kbd>: Crayon Brush</li>
        <li class="flex items-center gap-2"><SprayCan class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">S</kbd>: Spray Brush</li>
        <li class="flex items-center gap-2"><Wind class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">A</kbd>: Airbrush</li>
        <li class="flex items-center gap-2"><Edit3 class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">H</kbd>: Charcoal Brush</li>
        <li class="flex items-center gap-2"><Pencil class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">L</kbd>: Pencil Brush</li>
        <li class="flex items-center gap-2"><Droplet class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">W</kbd>: Watercolor Brush</li>
        <li class="flex items-center gap-2"><Paintbrush class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">O</kbd>: Oil Brush</li>
        <li class="flex items-center gap-2"><PenTool class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">G</kbd>: Calligraphy Pen</li>
      </ul>
    </aside>
  </div>
  
  <!-- Absolutely Positioned Logo -->
  <img src="/kalakar-logo.png" alt="Kalakaar Logo" class="absolute top-4 left-4 h-12 md:h-16 w-auto rounded-lg z-10" />

  <!-- Absolutely Positioned Theme Toggle -->
  <button 
    onclick={toggleTheme}
    class="absolute top-4 right-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all z-10"
    aria-label="Toggle theme"
    title="Toggle Dark/Light Mode"
  >
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
      <p class="text-gray-500 dark:text-gray-500 text-xs sm:text-sm mt-1">Built by <span class="text-orange-500 font-semibold">Dumb Kid AI</span></p>
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
          
          <!-- Tool Selection Buttons -->
          <div class="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
            <button
              onclick={() => currentTool = 'pen'}
              class:bg-indigo-100={currentTool === 'pen'}
              class:dark:bg-indigo-900={currentTool === 'pen'}
              class:text-indigo-700={currentTool === 'pen'}
              class:dark:text-indigo-300={currentTool === 'pen'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Pen Tool"  
              title="Pen Tool (P)"
            >
              <Pen class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentTool = 'eraser'}
              class:bg-indigo-100={currentTool === 'eraser'}
              class:dark:bg-indigo-900={currentTool === 'eraser'}
              class:text-indigo-700={currentTool === 'eraser'}
              class:dark:text-indigo-300={currentTool === 'eraser'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Eraser Tool"
              title="Eraser Tool (E)"
            >
              <Eraser class="w-5 h-5"/>
            </button>
          </div>

          <!-- Brush Type Selection -->
          <div class="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 flex-wrap">
            <button
              onclick={() => currentBrush = 'pen'}
              class:bg-indigo-100={currentBrush === 'pen'}
              class:dark:bg-indigo-900={currentBrush === 'pen'}
              class:text-indigo-700={currentBrush === 'pen'}
              class:dark:text-indigo-300={currentBrush === 'pen'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Pen Brush"
              title="Pen Brush (P)"
              disabled={currentTool === 'eraser'}
            >
              <Pen class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'marker'}
              class:bg-indigo-100={currentBrush === 'marker'}
              class:dark:bg-indigo-900={currentBrush === 'marker'}
              class:text-indigo-700={currentBrush === 'marker'}
              class:dark:text-indigo-300={currentBrush === 'marker'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Marker Brush"
              title="Marker Brush (M)"
              disabled={currentTool === 'eraser'}
            >
              <Highlighter class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'crayon'}
              class:bg-indigo-100={currentBrush === 'crayon'}
              class:dark:bg-indigo-900={currentBrush === 'crayon'}
              class:text-indigo-700={currentBrush === 'crayon'}
              class:dark:text-indigo-300={currentBrush === 'crayon'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Crayon Brush"
              title="Crayon Brush (C)"
              disabled={currentTool === 'eraser'}
            >
              <Feather class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'spray'}
              class:bg-indigo-100={currentBrush === 'spray'}
              class:dark:bg-indigo-900={currentBrush === 'spray'}
              class:text-indigo-700={currentBrush === 'spray'}
              class:dark:text-indigo-300={currentBrush === 'spray'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Spray Brush"
              title="Spray Brush (S)"
              disabled={currentTool === 'eraser'}
            >
              <SprayCan class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'airbrush'}
              class:bg-indigo-100={currentBrush === 'airbrush'}
              class:dark:bg-indigo-900={currentBrush === 'airbrush'}
              class:text-indigo-700={currentBrush === 'airbrush'}
              class:dark:text-indigo-300={currentBrush === 'airbrush'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Airbrush Brush"
              title="Airbrush Brush (A)"
              disabled={currentTool === 'eraser'}
            >
              <Wind class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'charcoal'}
              class:bg-indigo-100={currentBrush === 'charcoal'}
              class:dark:bg-indigo-900={currentBrush === 'charcoal'}
              class:text-indigo-700={currentBrush === 'charcoal'}
              class:dark:text-indigo-300={currentBrush === 'charcoal'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Charcoal Brush"
              title="Charcoal Brush (H)"
              disabled={currentTool === 'eraser'}
            >
              <Edit3 class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'pencil'}
              class:bg-indigo-100={currentBrush === 'pencil'}
              class:dark:bg-indigo-900={currentBrush === 'pencil'}
              class:text-indigo-700={currentBrush === 'pencil'}
              class:dark:text-indigo-300={currentBrush === 'pencil'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Pencil Brush"
              title="Pencil Brush (L)"
              disabled={currentTool === 'eraser'}
            >
              <Pencil class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'watercolor'}
              class:bg-indigo-100={currentBrush === 'watercolor'}
              class:dark:bg-indigo-900={currentBrush === 'watercolor'}
              class:text-indigo-700={currentBrush === 'watercolor'}
              class:dark:text-indigo-300={currentBrush === 'watercolor'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Watercolor Brush"
              title="Watercolor Brush (W)"
              disabled={currentTool === 'eraser'}
            >
              <Droplet class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'oil'}
              class:bg-indigo-100={currentBrush === 'oil'}
              class:dark:bg-indigo-900={currentBrush === 'oil'}
              class:text-indigo-700={currentBrush === 'oil'}
              class:dark:text-indigo-300={currentBrush === 'oil'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Oil Brush"
              title="Oil Brush (O)"
              disabled={currentTool === 'eraser'}
            >
              <Paintbrush class="w-5 h-5"/>
            </button>
            <button
              onclick={() => currentBrush = 'calligraphy'}
              class:bg-indigo-100={currentBrush === 'calligraphy'}
              class:dark:bg-indigo-900={currentBrush === 'calligraphy'}
              class:text-indigo-700={currentBrush === 'calligraphy'}
              class:dark:text-indigo-300={currentBrush === 'calligraphy'}
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Select Calligraphy Pen"
              title="Calligraphy Pen (G)"
              disabled={currentTool === 'eraser'}
            >
              <PenTool class="w-5 h-5"/>
            </button>
          </div>

          <label 
            class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer group"
            title="Select Brush Color"
          >
            <Palette class="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"/>
            <span class="hidden sm:inline">Color:</span>
            <input 
              type="color" 
              bind:value={strokeColor} 
              class="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden appearance-none bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800"
              style="background-color: {strokeColor};" 
            />
          </label>
          
          <div 
            class="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[160px]"
            title="Adjust Brush Width"
          >
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
              onclick={() => canvasComponent?.undo()}
              class="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7v6h6"></path>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
              </svg>
            </button>
            <button
              onclick={() => canvasComponent?.redo()}
              class="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 7v6h-6"></path>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
              </svg>
            </button>
          </div>

          <button
            onclick={() => canvasComponent?.clearCanvas()}
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400 active:bg-red-200 dark:active:bg-red-800/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800"
            aria-label="Clear Canvas"
            title="Clear Canvas"
          >
              <Trash2 class="w-5 h-5"/>
          </button>

          <!-- Download Drawing Button -->
          <button
            onclick={() => {
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
            title="Download Drawing"
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
                {currentTool}
                {currentBrush}
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
        onclick={handleGenerate}
        disabled={isLoading || !prompt}
        class="w-full flex justify-center items-center gap-2.5 px-5 py-3 bg-indigo-600 text-white text-base font-semibold rounded-lg shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 {isLoading ? 'animate-pulse' : ''}"
        title="Generate image based on drawing and prompt"
      >
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
         <div class="flex-grow flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[150px]">
           {#if isLoading}
              <!-- Prominent Loader -->
              <div class="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                <LoaderCircle class="w-10 h-10 animate-spin mb-2"/>
                <p class="text-sm">Generating your masterpiece...</p>
              </div>
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
                   onclick={() => {
                     if (generatedImageDataUrl) {
                       isFullscreenView = true;
                     }
                   }}
                   class="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg flex items-center gap-2 transition-colors"
                   title="View generated image fullscreen"
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
        onclick={clearAll}
        class="w-full px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-300 dark:active:bg-gray-500 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        title="Clear canvas, prompt, and results"
      >
          Clear All
      </button>

      <!-- Give Feedback Button -->
      <button
        onclick={() => showFeedbackModal = true}
        class="mt-4 w-full flex justify-center items-center gap-2.5 px-5 py-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium rounded-lg border border-blue-200 dark:border-blue-700/50 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-800/60 active:bg-blue-300 dark:active:bg-blue-700/70 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        title="Open feedback form"
      >
          <MessageSquare class="w-5 h-5"/> Give Feedback
      </button>
    </div>

  </div>

  <!-- Feedback Modal -->
  {#if showFeedbackModal}
    <div 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      onkeydown={(e) => { if (e.key === 'Escape') showFeedbackModal = false; }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      tabindex="-1"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div 
        class="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto" 
        onclick={(event) => { event.stopPropagation(); }}
        onkeydown={(event) => { event.stopPropagation(); }}
        role="document"
      >
        <!-- Close Button -->
        <button 
          onclick={() => showFeedbackModal = false} 
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
    onkeydown={(e) => { if (e.key === 'Escape') isFullscreenView = false; }}
    role="dialog"
    aria-modal="true"
    aria-label="Fullscreen image view"
    tabindex="-1"
  >
    <div class="absolute top-4 right-4">
      <button 
        onclick={() => isFullscreenView = false} 
        class="p-2 rounded-full bg-gray-800/30 text-white hover:bg-gray-800/50 transition-colors"
        aria-label="Close fullscreen view"
      >
        <X class="w-6 h-6" />
      </button>
    </div>
    
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="max-w-full max-h-full" 
      onclick={(event) => { event.stopPropagation(); }}
      onkeydown={(event) => { event.stopPropagation(); }}
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
