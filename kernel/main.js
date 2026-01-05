// kernel/main.js — kernel entry point AMÉLIORÉ
// Exports kernelMain(bootInfo)

import { Kernel } from './kernel.js';

export async function kernelMain(bootInfo = {}) {
  console.log('[kernelMain] === Kernel initialization START ===');
  const startTime = performance.now();
  
  try {
    const kernel = new Kernel(bootInfo);
    console.log('[kernelMain] Kernel instance created');

    // Phase 1: Initialize subsystems (VFS, devices, network)
    console.log('[kernelMain] Phase 1: Initializing subsystems...');
    try {
      await kernel.initialize();
      console.log('[kernelMain] Subsystems initialized ✓');
    } catch (e) {
      console.error('[kernelMain] Subsystems init failed:', e.message);
      throw new Error(`Subsystems initialization failed: ${e.message}`);
    }

    // Phase 2: Mount virtual filesystems
    console.log('[kernelMain] Phase 2: Mounting virtual filesystems...');
    try {
      await kernel.mountProcFS();
      console.log('[kernelMain] /proc filesystem mounted ✓');
    } catch (e) {
      console.warn('[kernelMain] /proc mount failed:', e.message);
      // Non-fatal: continue without /proc
    }

    // Phase 3: Launch init process
    console.log('[kernelMain] Phase 3: Launching init process...');
    try {
      const initPathCandidates = ['/sbin/init.wasm', '/init.wasm', '/bin/init.wasm'];
      let started = false;
      
      for (const path of initPathCandidates) {
        console.log(`[kernelMain] Trying init candidate: ${path}`);
        if (await kernel.vfs.exists(path)) {
          console.log(`[kernelMain] Found init at ${path}, spawning...`);
          const pid = await kernel.spawnFromVFS(path, ['init']);
          console.log(`[kernelMain] Init process spawned (PID ${pid}) ✓`);
          started = true;
          break;
        }
      }
      
      if (!started) {
        console.warn('[kernelMain] No init found in candidates');
        console.warn('[kernelMain] Fallback: kernel idle (no builtin hello)');
      }
    } catch (e) {
      console.error('[kernelMain] Init launch failed:', e.message);
      // Non-fatal: continue to scheduler
    }

    // Phase 4: Start scheduler
    console.log('[kernelMain] Phase 4: Starting scheduler...');
    try {
      kernel.run();
      console.log('[kernelMain] Scheduler running ✓');
    } catch (e) {
      console.error('[kernelMain] Scheduler error:', e.message);
    }

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[kernelMain] === Kernel initialization COMPLETE (${duration}ms) ===`);
    
    return kernel;
    
  } catch (e) {
    console.error('[kernelMain] === FATAL ERROR ===');
    console.error('[kernelMain] Error:', e.message);
    console.error('[kernelMain] Stack:', e.stack);
    throw e;
  }
}
