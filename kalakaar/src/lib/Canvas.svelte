<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { HTMLCanvasAttributes } from 'svelte/elements';

  export let width = 600;
  export let height = 450;
  export let strokeColor = '#000000';
  export let lineWidth = 5;

  let canvasElement: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // History for undo/redo functionality
  let history: string[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 20; // Limit history to prevent memory issues

  const dispatch = createEventDispatcher();

  onMount(() => {
    if (canvasElement) {
      context = canvasElement.getContext('2d');
      if (context) {
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.lineWidth = lineWidth;
        context.strokeStyle = strokeColor;
        // Set initial background
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
        
        // Save initial state to history
        saveToHistory();
      } else {
        console.error("Failed to get 2D context");
      }
      // Add listeners after context is potentially acquired
      canvasElement.addEventListener('mousedown', startDrawing);
      canvasElement.addEventListener('mousemove', draw);
      canvasElement.addEventListener('mouseup', stopDrawing);
      canvasElement.addEventListener('mouseout', stopDrawing);
      canvasElement.addEventListener('touchstart', handleTouchStart);
      canvasElement.addEventListener('touchmove', handleTouchMove);
      canvasElement.addEventListener('touchend', stopDrawing);
      canvasElement.addEventListener('touchcancel', stopDrawing);

    } else {
       console.error("Canvas element not found on mount");
    }

    return () => {
      // Cleanup listeners
      if (canvasElement) {
        canvasElement.removeEventListener('mousedown', startDrawing);
        canvasElement.removeEventListener('mousemove', draw);
        canvasElement.removeEventListener('mouseup', stopDrawing);
        canvasElement.removeEventListener('mouseout', stopDrawing);
        canvasElement.removeEventListener('touchstart', handleTouchStart);
        canvasElement.removeEventListener('touchmove', handleTouchMove);
        canvasElement.removeEventListener('touchend', stopDrawing);
        canvasElement.removeEventListener('touchcancel', stopDrawing);
      }
    };
  });

  // Save current canvas state to history
  function saveToHistory() {
    if (!canvasElement) return;
    
    // When drawing something new after undoing, remove all future states
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    
    // Add current state to history
    const dataUrl = canvasElement.toDataURL('image/png');
    history.push(dataUrl);
    
    // Limit history size
    if (history.length > MAX_HISTORY) {
      history = history.slice(history.length - MAX_HISTORY);
    }
    
    historyIndex = history.length - 1;
  }

  // Undo function
  export function undo() {
    if (historyIndex <= 0) return; // Can't undo beyond initial state
    
    historyIndex--;
    restoreFromHistory();
  }

  // Redo function
  export function redo() {
    if (historyIndex >= history.length - 1) return; // Can't redo beyond last state
    
    historyIndex++;
    restoreFromHistory();
  }

  // Restore canvas from history at current index
  function restoreFromHistory() {
    if (!canvasElement || !context || history.length === 0) return;
    
    const img = new Image();
    img.onload = () => {
      context?.clearRect(0, 0, canvasElement!.width, canvasElement!.height);
      context?.drawImage(img, 0, 0);
    };
    img.src = history[historyIndex];
  }

  function getCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
      if (!canvasElement) return { x: 0, y: 0 };
      const rect = canvasElement.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if (event instanceof TouchEvent) {
          if (event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
          } else { 
            return {x: lastX, y: lastY}; // Use last coords on touchend/cancel without touches
          }
      } else if (event instanceof MouseEvent) {
          clientX = event.clientX;
          clientY = event.clientY;
      } else {
          return { x: 0, y: 0 }; // Should not happen
      }
      return { x: clientX - rect.left, y: clientY - rect.top };
  }

 function startDrawing(event: MouseEvent | TouchEvent) {
    if (!context) return;
    const { x, y } = getCoordinates(event);
    isDrawing = true;
    [lastX, lastY] = [x, y];

    context.strokeStyle = strokeColor;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(lastX, lastY);
  }

  function draw(event: MouseEvent | TouchEvent) {
    if (!isDrawing || !context) return;

    if (event instanceof TouchEvent) {
        event.preventDefault(); // Prevent scrolling only during active touch drawing
    }

    const { x, y } = getCoordinates(event);

    // Styles might change mid-draw if user changes controls, re-apply
    context.strokeStyle = strokeColor;
    context.lineWidth = lineWidth;

    context.lineTo(x, y);
    context.stroke();
    [lastX, lastY] = [x, y];
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    // Save state to history when stroke is complete
    saveToHistory();
  }

  // Touch handlers simply call the main handlers
  function handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 1) {
          startDrawing(event);
      }
  }

  function handleTouchMove(event: TouchEvent) {
      if (isDrawing && event.touches.length === 1) {
          draw(event);
      }
  }

  // Method to get image data
  export function getImageDataURL(format = 'image/png'): string | null {
    // Ensure canvas has content before exporting (optional check)
    // if (!context || !canvasElement || context.getImageData(0, 0, canvasElement.width, canvasElement.height).data.some(channel => channel !== 0)) {
    //    return null; // Or return a blank image data URL
    // }
    return canvasElement ? canvasElement.toDataURL(format) : null;
  }

  // Method to clear the canvas
  export function clearCanvas() {
    if (context && canvasElement) {
        context.fillStyle = 'white'; // Clear to white
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);
        saveToHistory(); // Save the cleared state
        dispatch('clear'); // Notify parent if needed
    }
  }

  // Reactive updates for styles (can be helpful if user changes color/width mid-stroke)
  $: if (context) context.strokeStyle = strokeColor;
  $: if (context) context.lineWidth = lineWidth;

</script>

<style>
  canvas {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='24' height='24'%3E%3Cpath fill='%23000' d='M290.74 93.24l128.02 128.02-277.99 277.99-114.14 12.6C11.35 513.54-1.56 500.62.14 485.34l12.7-114.22 277.9-277.88zm207.2-19.06l-60.11-60.11c-18.75-18.75-49.16-18.75-67.91 0l-56.55 56.55 128.02 128.02 56.55-56.55c18.75-18.76 18.75-49.16 0-67.91z'/%3E%3C/svg%3E") 0 24, auto;
  }
</style>

<!-- Basic canvas structure, styling handled by parent and reactive updates -->
<canvas
  bind:this={canvasElement}
  {width}
  {height}
  class="border border-gray-400 touch-none bg-white shadow-md block"
  style="touch-action: none;"
  tabindex="0"
  on:mousedown={startDrawing}
  on:mousemove={draw}
  on:mouseup={stopDrawing}
  on:mouseout={stopDrawing}
  on:blur={stopDrawing}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={stopDrawing}
  on:touchcancel={stopDrawing}
></canvas> 