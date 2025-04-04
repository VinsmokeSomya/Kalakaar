<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { HTMLCanvasAttributes } from 'svelte/elements';

  let { 
    strokeColor = '#000000',
    lineWidth = 5,
    width = 800, 
    height = 450,
    currentTool = 'pen', // Accept currentTool prop, default to 'pen'
    currentBrush // Define brush prop type
  } = $props<{ 
    strokeColor?: string;
    lineWidth?: number;
    width?: number;
    height?: number;
    currentTool?: 'pen' | 'eraser'; // Define the prop type
    currentBrush?: 'pen' | 'marker' | 'crayon' | 'spray' | 'airbrush' | 'charcoal' | 'pencil' | 'watercolor' | 'oil' | 'calligraphy'; // Updated prop type
  }>();

  let canvasElement: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let isDrawing = $state(false);
  let lastX = $state(0);
  let lastY = $state(0);
  let isMouseOverCanvas = $state(false);
  let cursorX = $state(0);
  let cursorY = $state(0);
  let sprayAnimationId: number | null = null; // ID for spray animation frame
  
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

    // Start continuous spray/airbrush if selected
    if (currentTool === 'pen' && (currentBrush === 'spray' || currentBrush === 'airbrush')) {
      if (sprayAnimationId === null) { // Prevent multiple loops
        sprayAnimationId = requestAnimationFrame(sprayLoop);
      }
    } else {
      // Standard start for other tools/brushes
      context.strokeStyle = strokeColor;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.moveTo(lastX, lastY);
    }
  }

  // --- SPRAY PAINT LOGIC --- 
  function doSprayEffect(x: number, y: number, isAirbrush: boolean) {
    if (!context) return;
    const baseRadius = lineWidth * (isAirbrush ? 0.8 : 1.5); // Airbrush is more focused
    const sprayDensity = Math.max(5, Math.min(50, lineWidth * (isAirbrush ? 1.5 : 2))); 
    context.globalAlpha = isAirbrush ? 0.08 : 0.2; // Airbrush is lighter
    context.fillStyle = strokeColor;
    context.globalCompositeOperation = 'source-over'; 

    for (let i = 0; i < sprayDensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Gaussian distribution for softer edges (more dots near center)
      const radius = Math.sqrt(-2 * Math.log(Math.random())) * (baseRadius / 3);
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      
      // Optional: Check distance if strict circle needed, but Gaussian might be enough
      // const distSq = offsetX * offsetX + offsetY * offsetY;
      // if (distSq < baseRadius * baseRadius) { 
      context.beginPath();
      context.arc(x + offsetX, y + offsetY, Math.random() * (isAirbrush ? 1.2 : 1.5), 0, Math.PI * 2); 
      context.fill();
      // }
    }
  }

  // Animation loop for continuous spray/airbrush
  function sprayLoop() {
    const isSpraying = isDrawing && currentTool === 'pen' && (currentBrush === 'spray' || currentBrush === 'airbrush');
    if (!isSpraying) {
      if (sprayAnimationId !== null) {
        cancelAnimationFrame(sprayAnimationId);
        sprayAnimationId = null;
      }
      return; 
    }
    doSprayEffect(lastX, lastY, currentBrush === 'airbrush'); // Pass airbrush flag
    sprayAnimationId = requestAnimationFrame(sprayLoop);
  }
  // --- END SPRAY PAINT LOGIC ---

  function draw(event: MouseEvent | TouchEvent) {
    // Update last coordinates needed for spray loop and lines
    const { x: currentX, y: currentY } = getCoordinates(event);
    if (!isDrawing || !context) return;

    if (event instanceof TouchEvent) {
      event.preventDefault(); 
    }

    // If spraying/airbrushing, the loop handles drawing, just update position
    if (currentTool === 'pen' && (currentBrush === 'spray' || currentBrush === 'airbrush')) {
        [lastX, lastY] = [currentX, currentY]; // Update position for loop
        return; 
    }
    
    // --- STANDARD LINE/ERASER LOGIC --- 
    let drawX = currentX;
    let drawY = currentY;

    context.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';

    if (currentTool === 'pen') { 
      context.strokeStyle = strokeColor;
      // Reset defaults before applying brush-specific styles
      context.globalAlpha = 1.0;
      context.lineCap = 'round';
      context.lineWidth = lineWidth;
      let pressure = 1.0; // Placeholder for potential future pressure sensitivity

      if (currentBrush === 'marker') {
        context.globalAlpha = 0.3;
        context.lineCap = 'butt';  
      } else if (currentBrush === 'crayon') {
        context.globalAlpha = 0.7; 
        const jitter = lineWidth * 0.15; 
        drawX += (Math.random() - 0.5) * jitter;
        drawY += (Math.random() - 0.5) * jitter;
      } else if (currentBrush === 'charcoal') {
        context.globalAlpha = 0.85; // Darker alpha
        context.lineCap = 'butt'; // Flat ends can look charcoal-like
        // Simulate varying line width slightly for texture
        context.lineWidth = Math.max(1, lineWidth + (Math.random() - 0.5) * (lineWidth * 0.4)); 
      } else if (currentBrush === 'pencil') {
        context.globalAlpha = 0.6; // Lighter than crayon
        context.lineWidth = Math.max(0.5, lineWidth / 3); // Thinner line
        const pencilJitter = context.lineWidth * 0.2;
        drawX += (Math.random() - 0.5) * pencilJitter;
        drawY += (Math.random() - 0.5) * pencilJitter;
      } else if (currentBrush === 'watercolor') {
        context.globalAlpha = 0.1; // Lower alpha further
        context.lineCap = 'round'; 
        // Simulate bleed with more variation
        const numStrokes = 4; 
        for (let i = 0; i < numStrokes; i++) { 
            context.lineWidth = lineWidth * (1 + Math.random() * 0.6 - 0.3); // More width variation
            const offsetX = (Math.random() - 0.5) * lineWidth * 0.5; // Larger offset
            const offsetY = (Math.random() - 0.5) * lineWidth * 0.5; // Larger offset
            context.beginPath();
            context.moveTo(lastX + offsetX, lastY + offsetY);
            context.lineTo(drawX + offsetX, drawY + offsetY);
            context.stroke();
            context.closePath();
        }
        context.lineWidth = lineWidth; 
        [lastX, lastY] = [currentX, currentY]; 
        return; 
      } else if (currentBrush === 'oil') {
        context.globalAlpha = 0.95; // Keep high opacity
        context.lineCap = 'butt';
        context.lineWidth = lineWidth; 

        // Draw main stroke
        context.beginPath();
        context.moveTo(lastX, lastY);
        context.lineTo(drawX, drawY);
        context.stroke();
        context.closePath();

        // Draw subtle darker edge/shadow (optional effect)
        const shadowOffset = 0.5;
        context.globalAlpha = 0.2;
        context.strokeStyle = '#000000'; // Or derive darker shade from strokeColor
        context.lineWidth = Math.max(0.5, lineWidth * 0.1);
        context.beginPath();
        context.moveTo(lastX + shadowOffset, lastY + shadowOffset);
        context.lineTo(drawX + shadowOffset, drawY + shadowOffset);
        context.stroke();
        context.closePath();

        // Reset alpha/stroke for next draw cycle if needed (handled by defaults at start)
        [lastX, lastY] = [currentX, currentY]; 
        return; // Skip the standard single line draw at the end

      } else if (currentBrush === 'calligraphy') {
        // Basic approximation: thicker line, maybe slightly flat cap
        context.lineWidth = Math.max(2, lineWidth * 1.5);
        context.lineCap = 'butt';
        context.globalAlpha = 0.95;
        // True calligraphy requires varying width based on angle - complex
      } else { // Default 'pen' uses the reset defaults (alpha=1, cap=round, lineWidth=lineWidth)
        context.globalAlpha = 1.0; 
        context.lineCap = 'round'; 
        context.lineWidth = lineWidth; // Ensure reset to base lineWidth
      }
    } else { // Eraser
      context.globalAlpha = 1.0;
      context.lineCap = 'round'; 
      context.lineWidth = lineWidth; // Ensure eraser uses base lineWidth
    }

    context.lineJoin = 'round';
    
    context.beginPath(); // Begin path for the segment
    context.moveTo(lastX, lastY); // Move to the *last* position
    context.lineTo(drawX, drawY); // Draw line to the *current* (potentially jittered) position
    context.stroke();
    context.closePath(); // Close path for the segment

    // Update last coordinates for next segment
    [lastX, lastY] = [currentX, currentY]; 
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    // Stop spray animation loop if active
    if (sprayAnimationId !== null) {
      cancelAnimationFrame(sprayAnimationId);
      sprayAnimationId = null;
    }
    saveToHistory(); // Save final state
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

  // Update cursor position on mouse move
  function handleMouseMove(event: MouseEvent) {
    if (!isMouseOverCanvas) return;
    const rect = canvasElement?.getBoundingClientRect();
    if (rect) {
        cursorX = event.clientX - rect.left;
        cursorY = event.clientY - rect.top;
    }
    // Also call the drawing logic if currently drawing
    if (isDrawing) {
      draw(event);
    }
  }

  // Handle mouse entering the canvas
  function handleMouseEnter() {
    isMouseOverCanvas = true;
  }

  // Handle mouse leaving the canvas
  function handleMouseLeave() {
    isMouseOverCanvas = false;
    // Also stop drawing if mouse leaves while button is down
    stopDrawing(); 
  }

  // Use $effect to reactively update context properties
  $effect(() => {
    if (context) {
      context.strokeStyle = strokeColor;
      context.lineWidth = lineWidth;
    }
  });

  // Function to determine cursor class
  function getCursorClass(tool: string, brush: string, isOver: boolean): string {
    if (tool === 'eraser') {
      return isOver ? 'eraser-active-cursor' : 'pen-cursor'; // Keep eraser logic
    } else if (brush === 'spray' || brush === 'airbrush') {
      return 'crosshair-cursor';
    } else if (brush === 'charcoal') {
      return 'charcoal-cursor';
    } else if (brush === 'pencil') {
      return 'pencil-cursor'; // Use new pencil cursor
    } else if (brush === 'calligraphy') {
      return 'calligraphy-cursor'; // Use new calligraphy cursor
    } else if (brush === 'crayon') { 
      return 'crayon-cursor'; // Use new crayon cursor
    } else if (brush === 'marker') { 
      return 'marker-cursor'; 
    } else if (brush === 'watercolor') { 
      return 'watercolor-cursor'; // Use new watercolor cursor
    } else if (brush === 'oil') { 
      return 'oil-cursor';
    } else { // Pen (default)
      return 'pen-cursor';
    }
  }

</script>

<style>
  /* Base Pen cursor */
  .pen-cursor {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='24' height='24'%3E%3Cpath fill='%23000' d='M290.74 93.24l128.02 128.02-277.99 277.99-114.14 12.6C11.35 513.54-1.56 500.62.14 485.34l12.7-114.22 277.9-277.88zm207.2-19.06l-60.11-60.11c-18.75-18.75-49.16-18.75-67.91 0l-56.55 56.55 128.02 128.02 56.55-56.55c18.75-18.76 18.75-49.16 0-67.91z'/%3E%3C/svg%3E") 0 24, auto;
  }
  /* Hide default cursor when eraser is active and over canvas */
  .eraser-active-cursor {
    cursor: none;
  }
  /* Crosshair for spray/airbrush/calligraphy */
  .crosshair-cursor {
      cursor: crosshair;
  }
  /* Custom cursor for charcoal */
  .charcoal-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 5v14m-7-7h14'/%3E%3C/svg%3E") 12 12, auto;
  }
  /* Custom cursor for pencil (fine crosshair) */
  .pencil-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='1' d='M10 4v12M4 10h12'/%3E%3C/svg%3E") 10 10, auto;
  }
  /* Standard cell cursor for crayon - Replace with SVG */
  .crayon-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-width='4' d='M6 18 L18 6'/%3E%3C/svg%3E") 12 12, auto;
  }
  /* Custom cursor for marker (filled rectangle) */
  .marker-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23000' viewBox='0 0 16 16'%3E%3Crect x='5' y='5' width='6' height='6' rx='1'/%3E%3C/svg%3E") 8 8, auto;
  }
  /* Custom cursor for watercolor (droplet) */
  .watercolor-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%23000' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M8 16a6 6 0 006-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.503 8 0c-.75.001-2.25 1.676-3.568 3.638C3.122 5.096 2 6.345 2 10a6 6 0 006 6zM8 12a4 4 0 100-8 4 4 0 000 8z'/%3E%3C/svg%3E") 10 10, auto;
  }
  /* Custom cursor for oil (crosshair with dot) */
  .oil-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='1' d='M10 4v12M4 10h12'/%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23333'/%3E%3C/svg%3E") 10 10, auto;
  }
  /* Custom cursor for calligraphy (angled line) */
  .calligraphy-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23000' stroke-linecap='butt' stroke-width='2' d='M7 13 L13 7'/%3E%3C/svg%3E") 10 10, auto;
  }
  /* Custom circular cursor style */
  .custom-cursor {
    position: absolute;
    border: 1px solid black;
    border-radius: 50%;
    pointer-events: none; /* Prevent cursor from interfering with canvas events */
    mix-blend-mode: difference; /* Helps visibility on different colors */
    background-color: white; /* Use difference blend */
    opacity: 0.7;
    z-index: 1000; /* Ensure it's on top */
  }
</style>

<!-- Container to position canvas and custom cursor -->
<div class="relative" style={`width: ${width}px; height: ${height}px;`}>
  <!-- Canvas Element -->
  <canvas 
    bind:this={canvasElement}
    {width} 
    {height}
    class="absolute inset-0 touch-none {getCursorClass(currentTool, currentBrush, isMouseOverCanvas)}"
    style="touch-action: none;"
    tabindex="0"
    onmousedown={startDrawing}
    onmousemove={handleMouseMove}
    onmouseup={stopDrawing} 
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onblur={stopDrawing} 
    ontouchstart={handleTouchStart} 
    ontouchmove={handleTouchMove} 
    ontouchend={stopDrawing} 
    ontouchcancel={stopDrawing}
  ></canvas> 

  <!-- Custom Eraser Cursor -->
  {#if currentTool === 'eraser' && isMouseOverCanvas}
    <div 
      class="custom-cursor"
      style={`
        left: ${cursorX - lineWidth / 2}px; 
        top: ${cursorY - lineWidth / 2}px; 
        width: ${lineWidth}px; 
        height: ${lineWidth}px;
      `}
    ></div>
  {/if}
</div> 