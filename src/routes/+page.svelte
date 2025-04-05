<script lang="ts">
  // Explicitly type Canvas component if possible, otherwise use generic SvelteComponent
  import type CanvasComponentType from '$lib/Canvas.svelte'; 
  import Canvas from '$lib/Canvas.svelte';
  import FeedbackForm from '$lib/FeedbackForm.svelte';
  import { LoaderCircle, Palette, Trash2, Image as ImageIcon, Wand2, Moon, Sun, X, MessageSquare, Sparkles, Paintbrush, Eraser, Pen, Highlighter, Feather, SprayCan, Wind, Edit3, Pencil, Droplet, PenTool, ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';
  import type { SvelteComponent } from 'svelte'; // Keep for potential generic use
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import ColorPalette from '$lib/ColorPalette.svelte'; // Import the new component

  // --- Theme Store --- 
  const theme = writable<'light' | 'dark'>('light'); // Default to light

  // State for fullscreen image modal
  let isFullscreenView = $state(false); // Use $state
  let showFeedbackModal = $state(false); // Use $state

  // --- Pan State ---
  let isSpacebarDown = $state(false);
  let offsetX = $state(0);
  let offsetY = $state(0);
  // --- End Pan State ---

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
      // --- Load Custom Presets --- (Moved inside onMount's try block)
      const savedCustomPresets = localStorage.getItem('customStylePresets');
      if (savedCustomPresets) {
        customStylePresets = JSON.parse(savedCustomPresets);
      }
      // --- End Load Custom Presets ---

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
      console.error('Error initializing theme or custom presets:', e);
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
  let showPromptTemplates = $state(false); // State for template visibility
  let generatedText = $state('');
  let generatedImageDataUrl: string | null = $state(null); // Use $state
  let isLoading = $state(false);     // Use $state
  let errorMsg = $state('');       // Use $state

  // --- Zoom State ---
  const MIN_ZOOM = 0.1; // 10%
  const MAX_ZOOM = 5;   // 500%
  const ZOOM_STEP = 0.1;
  let zoomLevel = $state(1);

  function zoomIn() {
    zoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
  }

  function zoomOut() {
    zoomLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
  }

  function resetZoom() {
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
  }
  // --- End Zoom State ---

  // --- Canvas Size State ---
  type AspectRatioOption = { label: string; value: string; class: string; title: string }; // value can be string now
  const aspectRatios: AspectRatioOption[] = [
    { label: '16:9', value: 'video', class: 'aspect-video', title: 'Widescreen (16:9)' },
    { label: '1:1', value: 'square', class: 'aspect-square', title: 'Square (1:1)' },
    { label: '4:3', value: '4/3', class: 'aspect-[4/3]', title: 'Standard (4:3)' },
    { label: '3:2', value: '3/2', class: 'aspect-[3/2]', title: 'Photography (3:2)' },
    { label: '21:9', value: '21/9', class: 'aspect-[21/9]', title: 'Cinematic (21:9)' },
    { label: '2:1', value: '2/1', class: 'aspect-[2/1]', title: 'Landscape (2:1)' },
    { label: '10:5', value: '10/5', class: 'aspect-[10/5]', title: 'Portrait (10:5)' },
    { label: '3:1', value: '3/1', class: 'aspect-[3/1]', title: 'Landscape (3:1)' },
    { label: '4:2', value: '4/2', class: 'aspect-[4/2]', title: 'Landscape (4:2)' },
  ];
  let currentAspectRatio = $state<AspectRatioOption>(aspectRatios[0]); // Default to 16:9

  function changeAspectRatio(newRatio: AspectRatioOption) {
    if (newRatio.value !== currentAspectRatio.value) {
      currentAspectRatio = newRatio;
      // Clear canvas when ratio changes to avoid distortion/unexpected drawing
      canvasComponent?.clearCanvas(); 
      // Optional: clear AI output too if desired
      // generatedText = '';
      // generatedImageDataUrl = null;
    }
  }
  // --- End Canvas Size State ---

  // --- Style Presets --- (Default)
  type StylePreset = { name: string; suffix: string; icon?: typeof SvelteComponent }; // Icon is optional
  const stylePresets: StylePreset[] = [
    { name: 'Watercolor', suffix: ', watercolor painting style' },
    { name: 'Oil Painting', suffix: ', oil painting style' },
    { name: 'Cartoon', suffix: ', cartoon art style' },
    { name: 'Pixel Art', suffix: ', pixel art style' },
    { name: 'Sketch', suffix: ', pencil sketch style' },
    { name: 'Minimalist', suffix: ', minimalist style' },
    { name: 'Line Art', suffix: ', line art style' },
    { name: '3D Render', suffix: ', 3D render style' },
    { name: 'Anime', suffix: ', anime style' },
    { name: 'Cyberpunk', suffix: ', cyberpunk style' },
    { name: 'Steampunk', suffix: ', steampunk style' },
    { name: 'Abstract', suffix: ', abstract style' },
  ];

  // --- Custom Style Presets --- 
  type CustomPreset = { suffix: string }; // Simplified for now, maybe add name later
  let customStylePresets = $state<CustomPreset[]>([]);
  let newCustomStyleSuffix = $state('');

  // Save custom presets to localStorage whenever they change
  $effect(() => {
    // Ensure this only runs after mount (when localStorage is available)
    if (typeof window !== 'undefined') { 
        try {
          localStorage.setItem('customStylePresets', JSON.stringify(customStylePresets));
        } catch (e) {
          console.error("Error saving custom style presets:", e);
        }
    }
  });

  function addCustomPreset() {
    const trimmedSuffix = newCustomStyleSuffix.trim();
    if (!trimmedSuffix) return; // Don't add empty presets

    // Optional: Add comma prefix if not already there for consistency
    const suffixToAdd = (trimmedSuffix.startsWith(',') ? '' : ', ') + trimmedSuffix;

    // Check for duplicates (case-insensitive)
    if (!customStylePresets.some(p => p.suffix.toLowerCase() === suffixToAdd.toLowerCase())) {
      customStylePresets = [...customStylePresets, { suffix: suffixToAdd }];
    }
    newCustomStyleSuffix = ''; // Clear input
  }

  function deleteCustomPreset(index: number) {
    customStylePresets = customStylePresets.filter((_, i) => i !== index);
  }

  // --- Combined Style Application Logic --- (Handles both default and custom)
  function applyStylePreset(suffix: string) {
    const trimmedSuffix = suffix.trim().replace(/^,/, '').trim(); // Get the core style text
    const currentPromptLower = prompt.toLowerCase();
    const suffixLower = trimmedSuffix.toLowerCase();

    // Check if the core style text already exists in the prompt (case-insensitive)
    if (currentPromptLower.includes(suffixLower)) {
      return; // Style already exists, do nothing
    }

    // Append suffix if it doesn't exist
    if (prompt.trim() === '') {
      prompt = trimmedSuffix; // Start with suffix if prompt is empty
    } else if (/[\s,;]$/.test(prompt.trim())) { 
      // If prompt ends with whitespace, comma, or semicolon, append suffix (add comma if needed)
      prompt = prompt.trim() + (suffix.startsWith(',') ? '' : ', ') + trimmedSuffix;
    } else {
      // Otherwise, add comma and space before suffix
      prompt += ', ' + trimmedSuffix;
    }
    // Ensure prompt is trimmed after modification
    prompt = prompt.trim();
  }
  // --- End Style Presets --- 

  // --- Prompt Templates Data ---
  type PromptTemplate = {
    category: string;
    prompts: string[];
  };

  const promptTemplates: PromptTemplate[] = [
    {
      category: "Characters",
      prompts: [
        "A cute cat wearing a wizard hat",
        "A brave knight standing on a cliff edge",
        "A futuristic robot exploring an alien planet",
        "An old librarian surrounded by magical books",
        "A robot bartender serving drinks in a sci-fi bar",
        "A wise old tree spirit in an enchanted forest",
      ]
    },
    {
      category: "Landscapes",
      prompts: [
        "A serene mountain lake at sunrise",
        "A bustling cyberpunk city street at night",
        "A magical forest with glowing mushrooms",
        "A tropical beach with palm trees and clear water",
        "A futuristic cityscape on Mars",
        "A cozy village nestled in a snowy mountain range",
      ]
    },
    {
      category: "Abstract",
      prompts: [
        "Geometric shapes floating in vibrant colors",
        "A swirling vortex of light and energy",
        "Melting clocks in a surreal landscape",
        "Explosion of colorful powder",
        "Fractal patterns in neon colors",
        "Ink splashes forming chaotic shapes",
      ]
    },
    {
      category: "Objects & Scenes",
      prompts: [
        "A detailed vintage pocket watch on a wooden table",
        "A spaceship flying through a colorful nebula",
        "A steaming cup of coffee on a rainy window sill",
        "A stack of old books in a dusty library corner",
      ]
    },
    // Add more categories and prompts as needed
  ];

  function applyPromptTemplate(templateText: string) {
    prompt = templateText; // Replace current prompt
    showPromptTemplates = false; // Optionally hide templates after selection
  }
  // --- End Prompt Templates Data ---

  // --- Keyboard Shortcuts --- 
  $effect(() => {
    function handleKeydown(event: KeyboardEvent) {
      // Track spacebar separately
      if (event.code === 'Space') {
        // Only prevent default if spacebar is pressed outside of text inputs
        const target = event.target as HTMLElement;
        if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
            isSpacebarDown = true;
            event.preventDefault(); // Prevent spacebar scroll
        }
      }
      
      // Ignore other shortcuts if focus is on an input/textarea or space is down (panning)
      const target = event.target as HTMLElement;
      if (isSpacebarDown || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'))) {
        return;
      }

      // Ignore shortcuts if focus is on an input/textarea
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
      
      // --- NEW Zoom Shortcuts --- 
      else if (event.key === '+') { // Plus key for Zoom In
        event.preventDefault();
        zoomIn();
      }
      else if (event.key === '-') { // Minus key for Zoom Out
        event.preventDefault();
        zoomOut();
      }
      else if (event.key === '0') { // Zero key for Reset Zoom/Pan
        event.preventDefault();
        resetZoom();
      }
    }

    function handleKeyup(event: KeyboardEvent) {
      if (event.code === 'Space') {
          isSpacebarDown = false;
          // No need to call canvas directly, rely on prop change
      }
    }

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup); // Add keyup listener

    // Cleanup listener on component destroy
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup); // Remove keyup listener
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
    } catch (error: any) {
      console.error('Error generating image:', error);
      
      // Check for specific overload error message
      if (error instanceof Error && error.message?.includes('The model is overloaded')) {
          errorMsg = "The AI model is currently busy handling requests. Please wait a moment and try generating again. ✨";
      } 
      // Handle other potential errors
      else if (error instanceof Error) {
        // Check for potentially sensitive information before displaying full message
        // For now, display the message, but consider filtering in production
        errorMsg = `Generation failed: ${error.message}`;
      } else {
        errorMsg = 'An unknown error occurred during generation. Please check the console.';
      }
      generatedImageDataUrl = null; // Clear any previous image on error
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
        
        <!-- NEW Zoom Shortcuts Section -->
        <li class="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2"><strong>View:</strong></li>
        <li class="flex items-center gap-2"><ZoomIn class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">+</kbd>: Zoom In</li>
        <li class="flex items-center gap-2"><ZoomOut class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">-</kbd>: Zoom Out</li>
        <li class="flex items-center gap-2"><RotateCcw class="w-4 h-4 inline-block"/> <kbd class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">0</kbd>: Reset Zoom/Pan</li>
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
    <div class="flex flex-col items-center justify-start p-4 lg:p-6 w-full lg:w-3/5 xl:w-2/3 order-1 lg:order-1">
       
       <!-- Controls Styling -->
       <div class="w-full mb-3 p-3 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex flex-wrap justify-center items-center gap-x-5 gap-y-3">
          
          <!-- NEW: Tools Box Container -->
          <div class="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex flex-row items-start gap-3"> 
            <!-- Tool Selection Buttons (Vertical Layout, Left Side, with Box and Label) -->
            <div class="flex flex-col items-start gap-1">
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1">Tool:</span>
              <div class="flex flex-col gap-2 p-1 border border-gray-300 dark:border-gray-600 rounded-lg">
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
            </div>

            <!-- Container for Brush Grid and Width Slider (Right Side) -->
            <div class="flex flex-col items-start w-full flex-1"> 
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1">Brushes:</span>
              <!-- Brush Type Selection Grid (with Box) -->
              <div class="grid grid-cols-5 gap-1 p-1 border border-gray-300 dark:border-gray-600 rounded-lg w-full">
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

              <!-- Width Slider with Numerical Indicator -->
              <div 
                class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-full mt-2"
                title="Adjust Brush Width"
              >
                <span class="whitespace-nowrap">Width: <span class="font-semibold w-6 inline-block text-right">{lineWidth}</span>px</span>
            <input 
              type="range" 
              bind:value={lineWidth} 
              min="1" max="30" step="1" 
              class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 accent-indigo-600 dark:accent-indigo-400"
            />
              </div>
            </div>
          </div>
          
          <!-- New Color Palette Component -->
          <ColorPalette bind:value={strokeColor} />

          <!-- NEW: Canvas Size/Aspect Ratio Controls (Label + Grid Layout) -->
          <div class="flex flex-col items-start gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio:</span>
            <div class="grid grid-cols-3 gap-1">
              {#each aspectRatios as ratio (ratio.value)}
                <button
                  onclick={() => changeAspectRatio(ratio)}
                  class="p-2 rounded-md text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  class:bg-indigo-100={currentAspectRatio.value === ratio.value}
                  class:dark:bg-indigo-900={currentAspectRatio.value === ratio.value}
                  class:text-indigo-700={currentAspectRatio.value === ratio.value}
                  class:dark:text-indigo-300={currentAspectRatio.value === ratio.value}
                  aria-label={ratio.title}
                  title={ratio.title}
                >
                  {ratio.label}
                </button>
              {/each}
            </div>
          </div>

          <!-- MOVED: Zoom Controls (Vertical Layout) -->
          <div class="flex flex-col items-center gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Zoom:</span>
            <div class="flex flex-col items-center gap-1">
                <button
                    onclick={zoomIn}
                    disabled={zoomLevel >= MAX_ZOOM}
                    class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    title="Zoom In (+)"
                >
                    <ZoomIn class="w-5 h-5"/>
                </button>
                <span class="text-xs font-semibold w-10 text-center tabular-nums" title="Current Zoom">{(zoomLevel * 100).toFixed(0)}%</span>
                <button
                    onclick={zoomOut}
                    disabled={zoomLevel <= MIN_ZOOM}
                    class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    title="Zoom Out (-)"
                >
                    <ZoomOut class="w-5 h-5"/>
                </button>
                <button
                    onclick={resetZoom}
                    disabled={zoomLevel === 1 && offsetX === 0 && offsetY === 0}
                    class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors mt-1"
                    title="Reset Zoom & Pan (0)"
                >
                    <RotateCcw class="w-5 h-5"/>
                </button>
            </div>
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

        <!-- Canvas Area Container - Apply the "Outer Area" background here -->
        <div class="relative w-full {currentAspectRatio.class} mx-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden group transition-colors duration-300 bg-gray-100 dark:bg-gray-800">
            <!-- Canvas Component -->
            <Canvas 
                bind:this={canvasComponent} 
                {strokeColor} 
                {lineWidth} 
                {currentTool}
                {currentBrush}
                {zoomLevel}
                {isSpacebarDown} 
                bind:offsetX 
                bind:offsetY 
            /> 
            <!-- Draw Here Overlay -->
            {#if !canvasComponent?.isDrawing && !canvasComponent?.hasHistory() && !canvasComponent?.isPanning} 
                 <!-- ... existing overlay ... -->
            {/if}
        </div>
    </div>

    <!-- Right Side: Prompt and Result -->
    <div class="flex flex-col lg:min-w-[350px] max-w-[500px] w-full gap-4 lg:order-2 lg:mt-[49px]">
      <!-- Prompt Input Area -->
      <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
         <label for="prompt-input" class="block text-sm font-semibold text-gray-700 dark:text-white mb-2">Enter your prompt:</label>
          <!-- Prompt Templates Button -->
         <button 
             onclick={() => showPromptTemplates = !showPromptTemplates}
             class="text-xs float-right text-indigo-600 dark:text-indigo-400 hover:underline mb-1 relative -top-1"
         >
             {showPromptTemplates ? 'Hide Ideas' : 'Get Prompt Ideas ✨'}
         </button>
         <!-- End Prompt Templates Button -->
         <textarea
           id="prompt-input"
           bind:value={prompt}
           rows="4"
           style="color: var(--text-color, inherit); min-height: 100px;"
           class="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150 ease-in-out text-base resize-y placeholder:text-gray-400 dark:placeholder:text-gray-400"
           placeholder="e.g., 'make it look like a water color painting', 'add a cute cat'..."
         ></textarea>

          <!-- Prompt Templates Section (Conditional) -->
         {#if showPromptTemplates}
            <div class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
               <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Prompt Ideas:</h4>
               {#each promptTemplates as categoryItem (categoryItem.category)}
                  <div class="mb-3">
                      <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{categoryItem.category}</p>
                      <div class="flex flex-wrap gap-1.5">
                          {#each categoryItem.prompts as templatePrompt (templatePrompt)}
                              <button
                                  onclick={() => applyPromptTemplate(templatePrompt)}
                                  class="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400 text-left"
                                  title="Use this prompt"
                              >
                                  {templatePrompt}
                              </button>
                          {/each}
                      </div>
                  </div>
               {/each}
            </div>
         {/if}
         <!-- End Prompt Templates Section -->
         
         <!-- Style Preset Buttons (Default + Custom) -->
         <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Add Style:</span>
            <!-- Default Styles -->
            <div class="flex flex-wrap gap-1.5 mb-2"> <!-- Added mb-2 -->
               {#each stylePresets as preset (preset.name)}
                 <button
                    onclick={() => applyStylePreset(preset.suffix)}
                    class="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    title={`Append "${preset.suffix}"`}
                 >
                    {preset.name}
                 </button>
               {/each}
            </div>
            <!-- End Default Styles -->
            
            <!-- Saved Custom Styles (Always Visible if any exist) -->
            {#if customStylePresets.length > 0}
              <!-- Removed redundant label: <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">My Styles:</span> -->
              <div class="flex flex-wrap gap-1.5">
                  {#each customStylePresets as preset, index (preset.suffix)}
                    <div class="relative group">
                       <button
                          onclick={() => applyStylePreset(preset.suffix)} 
                          class="pl-2.5 pr-6 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-400 whitespace-nowrap"
                          title={`Append "${preset.suffix}"`}
                       >
                          {preset.suffix.replace(/^,\s*/, '')} <!-- Show without leading comma -->
                       </button>
                       <!-- Delete Button (appears on hover) -->
                       <button 
                          onclick={() => deleteCustomPreset(index)}
                          class="absolute top-0 right-0 bottom-0 w-5 flex items-center justify-center text-teal-600 dark:text-teal-400 hover:text-red-600 dark:hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                          title="Delete this style"
                          aria-label="Delete custom style"
                       >
                           <X class="w-3 h-3" />
                       </button>
                     </div>
                  {/each}
              </div>
            {/if}
            <!-- End Saved Custom Styles -->
         </div>
         <!-- End Combined Style Buttons -->

         <!-- Create New Custom Style Section -->
         <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <!-- Removed Dropdown Trigger Button -->
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Create New Style:</span>
            <!-- Input to Add New Custom Style -->
            <div class="flex gap-2">
                <input 
                    type="text"
                    bind:value={newCustomStyleSuffix}
                    placeholder="Type style suffix & click Add..."
                    class="flex-grow px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 rounded-md focus:ring-1 focus:ring-indigo-400 focus:border-transparent"
                    onkeydown={(e) => { if(e.key === 'Enter') addCustomPreset() }}
                />
                <button
                    onclick={addCustomPreset}
                    disabled={!newCustomStyleSuffix.trim()}
                    class="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Add
                </button>
            </div>
            {#if customStylePresets.length === 0}
                <span class="text-xs text-gray-400 italic mt-1 block">Saved styles will appear above the line.</span>
            {/if}
            <!-- Removed Dropdown Content Wrapper -->
         </div>
         <!-- End Create New Custom Style Section -->
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
