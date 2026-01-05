// kernel/syscalls/time.js — Time Syscalls AMÉLIORÉ

export function registerTimeSyscalls(kernel) {
  console.log('[Syscalls:time] Registering time syscalls...');

  // clock_gettime: get current time in nanoseconds
  kernel.syscalls.clock_gettime = (proc, clockId = 0) => {
    try {
      const ms = performance.now();
      const ns = BigInt(Math.floor(ms * 1e6));
      console.log(`[Syscall:clock_gettime] Returning ${ns}ns`);
      return ns;
    } catch (e) {
      console.error('[Syscall:clock_gettime] Error:', e.message);
      return BigInt(0);
    }
  };

  // sleep: pause execution for specified milliseconds
  kernel.syscalls.sleep = async (proc, ms = 0) => {
    try {
      if (typeof ms !== 'number' || ms < 0) {
        console.warn(`[Syscall:sleep] Invalid ms: ${ms}`);
        return 0;
      }

      console.log(`[Syscall:sleep] PID ${proc.pid} sleeping for ${ms}ms...`);
      await new Promise(resolve => setTimeout(resolve, ms));
      console.log(`[Syscall:sleep] PID ${proc.pid} woke up ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:sleep] Error:', e.message);
      return -1;
    }
  };

  // gettime: get current Unix timestamp in seconds (convenience method)
  kernel.syscalls.gettime = (proc) => {
    try {
      const seconds = Math.floor(Date.now() / 1000);
      console.log(`[Syscall:gettime] Returning ${seconds}s`);
      return seconds;
    } catch (e) {
      console.error('[Syscall:gettime] Error:', e.message);
      return 0;
    }
  };

  console.log('[Syscalls:time] Registered ✓');
}
