<script lang="ts">
  import { onMount } from 'svelte'; // Import onMount
  // Remove rune imports - they are global in Svelte 5
  // import { $effect, $state, $bindable, $inspect } from 'svelte'; 
  
  // Use $bindable() to allow two-way binding from parent
  let { value = $bindable('#000000') } = $props<{ value?: string }>();

  // Define default color swatches
  const defaultColors = $state([
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#808080', '#C0C0C0', '#FFA500', '#800080', '#4682B4', '#90EE90', '#FFC0CB', '#F0E68C'
  ]);

  // --- Saved Colors Logic ---
  const MAX_SAVED_COLORS = 12;
  let savedColors = $state<string[]>([]);

  // Load saved colors from localStorage on component mount using onMount
  onMount(() => {
    // if (typeof window !== 'undefined') { // No need for check inside onMount
      const stored = localStorage.getItem('kalakaar_saved_colors');
      if (stored) {
        try {
          savedColors = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse saved colors:", e);
          savedColors = []; 
        }
      } else {
        savedColors = [];
      }
    // }
  }); 

  // Save colors to localStorage whenever the savedColors array changes
  $effect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kalakaar_saved_colors', JSON.stringify(savedColors));
    }
  });

  function saveCurrentColor() {
    if (value && !savedColors.includes(value) && value !== '#000000' && value !== '#ffffff') { // Avoid saving black/white or duplicates
      // Add to the beginning and limit length
      savedColors = [value, ...savedColors].slice(0, MAX_SAVED_COLORS);
    }
  }

  function removeSavedColor(colorToRemove: string, event: MouseEvent) {
    //event.stopPropagation(); // Keep if needed, but might not be necessary now?
    savedColors = savedColors.filter(color => color !== colorToRemove);
  }
  // --- End Saved Colors Logic ---

  // Reactive state for the internal color picker input
  let customColor = $state(value); 

  // Effect to sync customColor input when the bound value changes externally
  $effect(() => {
    customColor = value;
  });

  // Function to update the value when a swatch is clicked
  function selectSwatch(color: string) {
    value = color; 
    customColor = color; // Sync the input picker too
  }

  // Function to update the value when the input picker changes
  function handleCustomColorInput(event: Event) {
      const target = event.target as HTMLInputElement;
      value = target.value;
      // customColor is already bound to the input, no need to set it here
  }

  // Make the component's value bindable from the parent
  $inspect(value); // Ensures reactivity works correctly with bindings
</script>

<div class="flex flex-row gap-4 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-slate-800">
  <!-- Left Side: Default Swatches & Custom Picker -->
  <div class="flex flex-col gap-2 items-start">
    <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Select Color:</span>
    
    <!-- Grid of Default Swatches -->
    <div class="grid grid-cols-6 gap-1">
      {#each defaultColors as color}
        <button 
          type="button"
          class="w-5 h-5 rounded border border-gray-400 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-700"
          style:background-color={color}
          title={color}
          aria-label="Select color {color}"
          onclick={() => selectSwatch(color)}
          class:ring-2={value === color}
          class:ring-indigo-500={value === color}
          class:ring-offset-1={value === color}
          class:dark:ring-offset-slate-700={value === color}
        ></button>
      {/each}
    </div>

    <!-- Custom Color Picker Input and Display -->
    <div class="flex items-center gap-2 mt-1">
      <input 
        type="color" 
        bind:value={customColor}
        oninput={handleCustomColorInput} 
        class="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden appearance-none bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 p-0"
        title="Custom Color Picker"
      />
      <span class="text-sm font-mono text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  </div>

  <!-- Right Side: Saved Colors Section -->
  <div class="pl-4 border-l border-gray-200 dark:border-gray-600 flex flex-col">
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Saved:</span>
      <button 
        type="button"
        onclick={saveCurrentColor}
        class="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 disabled:opacity-50"
        title="Save Current Color (Max 8)"
        disabled={savedColors.length >= MAX_SAVED_COLORS || savedColors.includes(value) || value === '#000000' || value === '#ffffff'}
      >
        + Add
      </button>
    </div>
    {#if savedColors.length > 0}
      <div class="grid grid-cols-4 gap-1 flex-grow">
        {#each savedColors as color: string (color)}
          <div class="relative group"> 
            <button 
              type="button"
              class="w-5 h-5 rounded border border-gray-400 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-700"
              style:background-color={color}
              title="Select {color}"
              aria-label="Select saved color {color}"
              onclick={() => selectSwatch(color)}
              class:ring-2={value === color}
              class:ring-indigo-500={value === color}
              class:ring-offset-1={value === color}
              class:dark:ring-offset-slate-700={value === color}
            ></button>
            <!-- Remove Button (appears on hover) -->
            <button 
              type="button"
              onclick={(e) => removeSavedColor(color, e)}
              class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 focus:outline-none focus:ring-1 focus:ring-red-700 focus:ring-offset-0"
              title="Remove {color}"
              aria-label="Remove saved color {color}"
            >
              &times;
            </button>
          </div>
        {/each}
        <!-- Fill remaining grid slots if needed -->
        {#each Array(MAX_SAVED_COLORS - savedColors.length) as _}
          <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-600 opacity-50"></div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-gray-500 dark:text-gray-400 italic mt-1">No saved colors.</p>
    {/if}
  </div>
</div> 