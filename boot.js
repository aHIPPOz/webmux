// boot.js — WASMUX Bootloader
// Initializes kernel, filesystem, and starts userland

import { kernelMain } from './kernel/main.js';

export async function boot() {
  const bootStartTime = performance.now();
  console.log('[boot] === WASMUX BOOT SEQUENCE START ===');
  
  try {
    // Phase 1: Canvas initialization
    console.log('[boot] Phase 1: Canvas initialization');
    let canvas = document.getElementById('screen');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'screen';
      document.body.appendChild(canvas);
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`[boot] Canvas: ${canvas.width}x${canvas.height}`);

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    // Phase 2: Boot info
    console.log('[boot] Phase 2: Boot info configuration');
    const bootInfo = {
      canvasId: 'screen',
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cmdline: ''
    };
    console.log('[boot] Boot info: ready');

    // Phase 3: Kernel initialization
    console.log('[boot] Phase 3: Kernel initialization');
    const kernel = await kernelMain(bootInfo);
    
    if (!kernel?.vfs) {
      throw new Error('Kernel initialization failed');
    }
    
    // Expose kernel for debugging
    window.wasmux = { kernel };
    console.log('[boot] Kernel ready - available as window.wasmux.kernel');
    
    // Phase 4: Boot complete
    const duration = (performance.now() - bootStartTime).toFixed(2);
    console.log(`[boot] === BOOT COMPLETE (${duration}ms) ===`);
    
    if (document.getElementById('status')) {
      document.getElementById('status').textContent = `✓ System ready (${duration}ms)`;
    }
    
    return kernel;

  } catch (err) {
    const duration = (performance.now() - bootStartTime).toFixed(2);
    console.error(`[boot] === BOOT FAILED (${duration}ms) ===`);
    console.error('[boot] Error:', err.message);
    console.error('[boot] Stack:', err.stack);
    
    if (document.getElementById('status')) {
      document.getElementById('status').textContent = '✗ Boot failed - see console (F12)';
    }
    
    throw err;
  }
}
