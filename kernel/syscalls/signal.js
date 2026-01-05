// kernel/syscalls/signal.js — Signal Syscalls AMÉLIORÉ

export function registerSignalSyscalls(kernel) {
  console.log('[Syscalls:signal] Registering signal syscalls...');

  // kill: send signal to process
  kernel.syscalls.kill = (proc, pid, sig = 15) => {
    try {
      console.log(`[Syscall:kill] PID ${proc.pid} sending signal ${sig} to PID ${pid}`);

      if (typeof pid !== 'number' || pid < 0) {
        console.warn(`[Syscall:kill] Invalid PID: ${pid}`);
        throw new Error('EINVAL: invalid pid');
      }

      if (typeof sig !== 'number' || sig < 0 || sig > 64) {
        console.warn(`[Syscall:kill] Invalid signal: ${sig}`);
        throw new Error('EINVAL: invalid signal');
      }

      const target = kernel.processTable.get(pid);
      if (!target) {
        console.warn(`[Syscall:kill] Process ${pid} not found`);
        throw new Error('ESRCH: no such process');
      }

      // Initialize signal queue if needed
      if (!target.pendingSignals) {
        target.pendingSignals = [];
      }

      target.pendingSignals.push(sig);
      console.log(`[Syscall:kill] Signal ${sig} queued for PID ${pid} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:kill] Error:', e.message);
      throw e;
    }
  };

  console.log('[Syscalls:signal] Registered ✓');
}
