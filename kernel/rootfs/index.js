// kernel/rootfs/index.js — RootFS Integration Point

import { registerRootfsManager } from './manager.js';

export async function initializeRootfs(kernel) {
  console.log('[Kernel] Initializing RootFS subsystem...');

  try {
    // Register the RootFS manager
    registerRootfsManager(kernel);

    // Initialize the filesystem
    await kernel.rootfsManager.initialize();

    // Get boot command
    const bootCommand = await kernel.rootfsManager.getBootCommand();
    console.log(`[Kernel] Boot command: ${bootCommand}`);

    return {
      success: true,
      bootCommand,
      metadata: kernel.rootfsManager.getMetadata()
    };

  } catch (e) {
    console.error('[Kernel] RootFS initialization failed:', e.message);
    throw e;
  }
}

export { RootfsManager } from './manager.js';
