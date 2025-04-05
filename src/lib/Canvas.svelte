<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
  import type { HTMLCanvasAttributes } from 'svelte/elements';

  let { 
    strokeColor = '#000000',
    lineWidth = 5,
    currentTool = 'pen',
    currentBrush,
    zoomLevel = 1,
    isSpacebarDown = false,
    offsetX = $bindable(0),
    offsetY = $bindable(0)
  } = $props<{ 
    strokeColor?: string;
    lineWidth?: number;
    currentTool?: 'pen' | 'eraser';
    currentBrush?: 'pen' | 'marker' | 'crayon' | 'spray' | 'airbrush' | 'charcoal' | 'pencil' | 'watercolor' | 'oil' | 'calligraphy';
    zoomLevel?: number;
    isSpacebarDown?: boolean;
    offsetX?: number;
    offsetY?: number;
  }>();

  let containerElement: HTMLDivElement | null = null;
  let canvasElement: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let isDrawing = $state(false);
  let lastX = $state(0);
  let lastY = $state(0);
  let isMouseOverCanvas = $state(false);
  let cursorX = $state(0);
  let cursorY = $state(0);
  let sprayAnimationId: number | null = null;
  
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);

  let history: string[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 20;

  let resizeObserver: ResizeObserver | null = null;

  const dispatch = createEventDispatcher();

  function handleResize(entries: ResizeObserverEntry[]) {
    if (!entries || entries.length === 0 || !canvasElement || !context) {
      return;
    }
    const entry = entries[0];
    const { width, height } = entry.contentRect;

    canvasElement.width = width;
    canvasElement.height = height;

    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeColor;

    restoreFromHistory(true);
  }

  onMount(() => {
    if (!canvasElement || !containerElement) {
       console.error("Canvas or Container element not found on mount");
       return;
    }
    
    context = canvasElement.getContext('2d');
    if (!context) {
        console.error("Failed to get 2D context");
        return;
    }
    
    const initialWidth = containerElement?.clientWidth ?? 800;
    const initialHeight = containerElement?.clientHeight ?? 450;
    canvasElement.width = initialWidth;
    canvasElement.height = initialHeight;
    
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeColor;
    context.fillStyle = 'white';
    context.fillRect(0, 0, initialWidth, initialHeight);
    saveToHistory();

    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerElement);

    canvasElement.addEventListener('mousedown', startDrawing);
    canvasElement.addEventListener('mousemove', handleMouseMove);
    canvasElement.addEventListener('mouseleave', handleMouseLeave);
    canvasElement.addEventListener('mouseenter', handleMouseEnter);
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchUp);

    return () => {
      if (resizeObserver && containerElement) {
        resizeObserver.unobserve(containerElement);
      }
      if (canvasElement) {
        canvasElement.removeEventListener('mousedown', startDrawing);
        canvasElement.removeEventListener('mousemove', handleMouseMove);
        canvasElement.removeEventListener('mouseleave', handleMouseLeave);
        canvasElement.removeEventListener('mouseenter', handleMouseEnter);
        canvasElement.removeEventListener('touchstart', handleTouchStart);
      }
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchUp);
    };
  });

  function saveToHistory() {
    if (!canvasElement) return;
    
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    
    const dataUrl = canvasElement.toDataURL('image/png');
    history.push(dataUrl);
    
    if (history.length > MAX_HISTORY) {
      history = history.slice(history.length - MAX_HISTORY);
    }
    
    historyIndex = history.length - 1;
  }

  export function undo() {
    if (historyIndex <= 0) return;
    
    historyIndex--;
    restoreFromHistory();
  }

  export function redo() {
    if (historyIndex >= history.length - 1) return;
    
    historyIndex++;
    restoreFromHistory();
  }

  function restoreFromHistory(isResizeRedraw = false) {
    if (!canvasElement || !context || historyIndex < 0 || historyIndex >= history.length) {
      if (canvasElement && context && isResizeRedraw) {
        context.fillStyle = 'white'; 
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      if (!context || !canvasElement) return;
      context.fillStyle = 'white'; 
      context.fillRect(0, 0, canvasElement.width, canvasElement.height);
      context.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
      context.lineWidth = lineWidth;
      context.strokeStyle = strokeColor;
      context.lineJoin = 'round';
      context.lineCap = 'round';
    };
    img.onerror = () => {
        console.error("Failed to load image from history.");
        if (canvasElement && context && isResizeRedraw) {
            context.fillStyle = 'white'; 
            context.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
    }
    img.src = history[historyIndex];
  }

  function getCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number; clientX: number; clientY: number } {
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, clientX: 0, clientY: 0 };

    let LclientX, LclientY;
    if (event instanceof TouchEvent) {
      LclientX = event.touches[0].clientX;
      LclientY = event.touches[0].clientY;
    } else {
      LclientX = event.clientX;
      LclientY = event.clientY;
    }
    
    const canvasX = (LclientX - rect.left - offsetX) / zoomLevel; 
    const canvasY = (LclientY - rect.top - offsetY) / zoomLevel;

    cursorX = LclientX - rect.left;
    cursorY = LclientY - rect.top;

    return { x: canvasX, y: canvasY, clientX: LclientX, clientY: LclientY };
  }

 function startDrawing(event: MouseEvent | TouchEvent) {
    if (!context) return;
    const { x, y, clientX, clientY } = getCoordinates(event);

    if (isSpacebarDown) {
        isPanning = true;
        panStartX = clientX;
        panStartY = clientY;
        canvasElement?.classList.add('grabbing-cursor');
        return;
    }
    
    isDrawing = true;
    [lastX, lastY] = [x, y];

    if (currentTool === 'pen' && (currentBrush === 'spray' || currentBrush === 'airbrush')) {
      if (sprayAnimationId === null) {
        sprayAnimationId = requestAnimationFrame(sprayLoop);
      }
    } else {
      context.strokeStyle = strokeColor;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.moveTo(lastX, lastY);
    }
  }

  function doSprayEffect(x: number, y: number, isAirbrush: boolean) {
    if (!context) return;
    const baseRadius = lineWidth * (isAirbrush ? 0.8 : 1.5);
    const sprayDensity = Math.max(5, Math.min(50, lineWidth * (isAirbrush ? 1.5 : 2))); 
    context.globalAlpha = isAirbrush ? 0.08 : 0.2;
    context.fillStyle = strokeColor;
    context.globalCompositeOperation = 'source-over'; 

    for (let i = 0; i < sprayDensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(-2 * Math.log(Math.random())) * (baseRadius / 3);
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      
      context.beginPath();
      context.arc(x + offsetX, y + offsetY, Math.random() * (isAirbrush ? 1.2 : 1.5), 0, Math.PI * 2); 
      context.fill();
    }
  }

  function sprayLoop() {
    const isSpraying = isDrawing && currentTool === 'pen' && (currentBrush === 'spray' || currentBrush === 'airbrush');
    if (!isSpraying) {
      if (sprayAnimationId !== null) {
        cancelAnimationFrame(sprayAnimationId);
        sprayAnimationId = null;
      }
      return; 
    }
    doSprayEffect(lastX, lastY, currentBrush === 'airbrush');
    sprayAnimationId = requestAnimationFrame(sprayLoop);
  }

  function drawSegment(event: MouseEvent | TouchEvent) {
    if (!isDrawing || !context || isPanning) return;

    const { x: currentX, y: currentY } = getCoordinates(event);

    if (event instanceof TouchEvent) {
    }

    if (currentTool === 'pen' && (currentBrush === 'spray' || currentBrush === 'airbrush')) {
        [lastX, lastY] = [currentX, currentY];
        return;
    }
    
    let drawX = currentX;
    let drawY = currentY;

    context.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';

    if (currentTool === 'pen') { 
      context.strokeStyle = strokeColor;
      context.globalAlpha = 1.0;
      context.lineCap = 'round';
      context.lineWidth = lineWidth;
      let pressure = 1.0;

      if (currentBrush === 'marker') {
        context.globalAlpha = 0.3;
        context.lineCap = 'butt';  
      } else if (currentBrush === 'crayon') {
        context.globalAlpha = 0.7; 
        const jitter = lineWidth * 0.15; 
        drawX += (Math.random() - 0.5) * jitter;
        drawY += (Math.random() - 0.5) * jitter;
      } else if (currentBrush === 'charcoal') {
        context.globalAlpha = 0.85;
        context.lineCap = 'butt';
        context.lineWidth = Math.max(1, lineWidth + (Math.random() - 0.5) * (lineWidth * 0.4)); 
      } else if (currentBrush === 'pencil') {
        context.globalAlpha = 0.6;
        context.lineWidth = Math.max(0.5, lineWidth / 3);
        const pencilJitter = context.lineWidth * 0.2;
        drawX += (Math.random() - 0.5) * pencilJitter;
        drawY += (Math.random() - 0.5) * pencilJitter;
      } else if (currentBrush === 'watercolor') {
        context.globalAlpha = 0.1;
        context.lineCap = 'round'; 
        const numStrokes = 4; 
        for (let i = 0; i < numStrokes; i++) { 
            context.lineWidth = lineWidth * (1 + Math.random() * 0.6 - 0.3);
            const offsetX = (Math.random() - 0.5) * lineWidth * 0.5;
            const offsetY = (Math.random() - 0.5) * lineWidth * 0.5;
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
        context.globalAlpha = 0.95;
        context.lineCap = 'butt';
        context.lineWidth = lineWidth; 

        context.beginPath();
        context.moveTo(lastX, lastY);
        context.lineTo(drawX, drawY);
        context.stroke();
        context.closePath();

        const shadowOffset = 0.5;
        context.globalAlpha = 0.2;
        context.strokeStyle = '#000000';
        context.lineWidth = Math.max(0.5, lineWidth * 0.1);
        context.beginPath();
        context.moveTo(lastX + shadowOffset, lastY + shadowOffset);
        context.lineTo(drawX + shadowOffset, drawY + shadowOffset);
        context.stroke();
        context.closePath();

        [lastX, lastY] = [currentX, currentY]; 
        return;

      } else if (currentBrush === 'calligraphy') {
        context.lineWidth = Math.max(2, lineWidth * 1.5);
        context.lineCap = 'butt';
        context.globalAlpha = 0.95;
      } else {
        context.globalAlpha = 1.0; 
        context.lineCap = 'round'; 
        context.lineWidth = lineWidth;
      }
    } else {
      context.globalAlpha = 1.0;
      context.lineCap = 'round'; 
      context.lineWidth = lineWidth;
    }

    context.lineJoin = 'round';
    
    context.beginPath();
    context.moveTo(lastX, lastY);
    context.lineTo(drawX, drawY);
    context.stroke();
    context.closePath();

    [lastX, lastY] = [currentX, currentY];
  }

  function stopDrawingActions() {
    const wasPanning = isPanning;
    const wasDrawing = isDrawing;

    if (isDrawing) {
      isDrawing = false;
      if (sprayAnimationId !== null) {
        cancelAnimationFrame(sprayAnimationId);
        sprayAnimationId = null;
      }
    }

    if (isPanning) {
      isPanning = false;
      canvasElement?.classList.remove('grabbing-cursor');
    }
    
    if (wasDrawing && !wasPanning) {
        saveToHistory(); 
    }
  }

  function handleGlobalMouseMove(event: MouseEvent) {
    if (isPanning) {
        const { clientX, clientY } = event;
        const dx = clientX - panStartX;
        const dy = clientY - panStartY;
        
        offsetX += dx;
        offsetY += dy;

        panStartX = clientX;
        panStartY = clientY;
    } else if (isDrawing) {
        drawSegment(event);
    }
  }

  function handleGlobalMouseUp(event: MouseEvent) {
    stopDrawingActions();
  }

  function handleGlobalTouchMove(event: TouchEvent) {
    if (isPanning) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const { clientX, clientY } = event.touches[0]; 
            const dx = clientX - panStartX;
            const dy = clientY - panStartY;
            
            offsetX += dx;
            offsetY += dy;

            panStartX = clientX;
            panStartY = clientY;
        }
    } else if (isDrawing) {
        event.preventDefault();
        if (event.touches.length === 1) {
            drawSegment(event);
        }
    }
  }

  function handleGlobalTouchUp(event: TouchEvent) {
      stopDrawingActions();
  }

  function handleMouseMove(event: MouseEvent) {
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) return;
    
    cursorX = event.clientX - rect.left;
    cursorY = event.clientY - rect.top;
  }

  function handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 1) {
          if (isSpacebarDown || currentTool) {
            event.preventDefault(); 
          }
          startDrawing(event);
      }
  }

  function handleMouseEnter() {
    isMouseOverCanvas = true;
  }

  function handleMouseLeave() {
    isMouseOverCanvas = false;
  }

  function handleTouchMove(event: TouchEvent) {
      if (isDrawing && event.touches.length === 1) {
          drawSegment(event);
      }
  }

  export function getImageDataURL(format = 'image/png'): string | null {
    return canvasElement ? canvasElement.toDataURL(format) : null;
  }

  export function clearCanvas() {
    if (context && canvasElement) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);
        saveToHistory();
        dispatch('clear');
    }
  }

  $effect(() => {
    if (context) {
      context.strokeStyle = strokeColor;
    }
  });

  function getCursorClass(tool: string, brush: string | undefined, over: boolean, spaceDown: boolean, panning: boolean): string {
    if (panning) return 'grabbing-cursor';
    if (spaceDown && over) return 'grab-cursor';
    if (tool === 'eraser') {
      return over ? 'eraser-active-cursor' : 'default';
    } 
    if (!over) return 'default'; 

    if (brush === 'spray' || brush === 'airbrush') {
      return 'crosshair-cursor';
    } else if (brush === 'charcoal') {
      return 'charcoal-cursor';
    } else if (brush === 'pencil') {
      return 'pencil-cursor';
    } else if (brush === 'calligraphy') {
      return 'calligraphy-cursor';
    } else if (brush === 'crayon') { 
      return 'crayon-cursor';
    } else if (brush === 'marker') { 
      return 'marker-cursor'; 
    } else if (brush === 'watercolor') { 
      return 'watercolor-cursor';
    } else if (brush === 'oil') { 
      return 'oil-cursor';
    } else {
      return 'pen-cursor';
    }
  }

  export function getCanvasElement(): HTMLCanvasElement | null {
    return canvasElement;
  }

</script>

<style>
  .pen-cursor {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='24' height='24'%3E%3Cpath fill='%23000' d='M290.74 93.24l128.02 128.02-277.99 277.99-114.14 12.6C11.35 513.54-1.56 500.62.14 485.34l12.7-114.22 277.9-277.88zm207.2-19.06l-60.11-60.11c-18.75-18.75-49.16-18.75-67.91 0l-56.55 56.55 128.02 128.02 56.55-56.55c18.75-18.76 18.75-49.16 0-67.91z'/%3E%3C/svg%3E") 0 24, auto;
  }
  .eraser-active-cursor {
    cursor: none;
  }
  .crosshair-cursor {
      cursor: crosshair;
  }
  .charcoal-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 5v14m-7-7h14'/%3E%3C/svg%3E") 12 12, auto;
  }
  .pencil-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='1' d='M10 4v12M4 10h12'/%3E%3C/svg%3E") 10 10, auto;
  }
  .crayon-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-width='4' d='M6 18 L18 6'/%3E%3C/svg%3E") 12 12, auto;
  }
  .marker-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23000' viewBox='0 0 16 16'%3E%3Crect x='5' y='5' width='6' height='6' rx='1'/%3E%3C/svg%3E") 8 8, auto;
  }
  .watercolor-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%23000' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M8 16a6 6 0 006-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.503 8 0c-.75.001-2.25 1.676-3.568 3.638C3.122 5.096 2 6.345 2 10a6 6 0 006 6zM8 12a4 4 0 100-8 4 4 0 000 8z'/%3E%3C/svg%3E") 10 10, auto;
  }
  .oil-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='1' d='M10 4v12M4 10h12'/%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23333'/%3E%3C/svg%3E") 10 10, auto;
  }
  .calligraphy-cursor {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23000' stroke-linecap='butt' stroke-width='2' d='M7 13 L13 7'/%3E%3C/svg%3E") 10 10, auto;
  }
  .custom-cursor {
    position: absolute;
    border: 1px solid black;
    border-radius: 50%;
    pointer-events: none;
    mix-blend-mode: difference;
    background-color: white;
    opacity: 0.7;
    z-index: 1000;
  }
  .grab-cursor {
    cursor: grab;
  }
  .grabbing-cursor {
    cursor: grabbing;
  }
  .default {
      cursor: default;
  }
</style>

<div bind:this={containerElement} class="relative w-full h-full overflow-hidden">
  <canvas 
    bind:this={canvasElement}
    class="absolute inset-0 touch-none {getCursorClass(currentTool, currentBrush, isMouseOverCanvas, isSpacebarDown, isPanning)}"
    style={`
        touch-action: none;
        transform-origin: top left; 
        transform: translateX(${offsetX}px) translateY(${offsetY}px) scale(${zoomLevel});
    `}
    tabindex="0"
  ></canvas> 

  {#if currentTool === 'eraser' && isMouseOverCanvas && !isPanning && !isSpacebarDown}
    <div 
      class="custom-cursor"
      style={`
        left: ${cursorX - (lineWidth * zoomLevel) / 2}px;
        top: ${cursorY - (lineWidth * zoomLevel) / 2}px; 
        width: ${lineWidth * zoomLevel}px; 
        height: ${lineWidth * zoomLevel}px;
      `}
    ></div>
  {/if}
</div> 