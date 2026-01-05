// kernel/syscalls/poll.js — Poll Syscalls AMÉLIORÉ

export function registerPollSyscalls(kernel) {
  console.log('[Syscalls:poll] Registering poll syscalls...');

  // poll: wait for I/O or timeout
  kernel.syscalls.poll = async (proc, timeout = 0) => {
    try {
      console.log(`[Syscall:poll] PID ${proc.pid} poll with timeout ${timeout}ms`);

      if (typeof timeout !== 'number' || timeout < 0) {
        console.warn(`[Syscall:poll] Invalid timeout: ${timeout}`);
        timeout = 0;
      }

      // Simple implementation: just wait
      await new Promise(resolve => setTimeout(resolve, timeout));
      
      console.log(`[Syscall:poll] PID ${proc.pid} poll complete ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:poll] Error:', e.message);
      return -1;
    }
  };

  // select: wait for multiple I/O operations (stub)
  kernel.syscalls.select = async (proc, nfds, readfds, writefds, exceptfds, timeout) => {
    try {
      console.log(`[Syscall:select] Not fully implemented, sleeping ${timeout}ms`);
      await new Promise(resolve => setTimeout(resolve, timeout || 0));
      return 0;
    } catch (e) {
      console.error('[Syscall:select] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:poll] Registered ✓');
}
