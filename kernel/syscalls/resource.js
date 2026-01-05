// kernel/syscalls/resource.js — Resource Limit Syscalls (COMPLET)

export function registerResourceSyscalls(kernel) {
  console.log('[Syscalls:resource] Registering resource limit syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // getrlimit: get resource limits
  kernel.syscalls.getrlimit = (proc, resource) => {
    try {
      console.log(`[Syscall:getrlimit] PID ${proc.pid} getrlimit(${resource})`);

      // RLIMIT_CPU=0, RLIMIT_FSIZE=1, RLIMIT_DATA=2, RLIMIT_STACK=3,
      // RLIMIT_CORE=4, RLIMIT_RSS=5, RLIMIT_NPROC=6, RLIMIT_NOFILE=7, RLIMIT_MEMLOCK=8, RLIMIT_AS=9

      const limits = {
        0: { soft: 3600, hard: 36000 },           // CPU
        1: { soft: 1024*1024*100, hard: 1024*1024*1024 }, // FSIZE
        2: { soft: 1024*1024*256, hard: 1024*1024*1024 }, // DATA
        3: { soft: 1024*1024*8, hard: 1024*1024*32 },     // STACK
        4: { soft: 0, hard: 1024*1024 },          // CORE
        5: { soft: 1024*1024*256, hard: 1024*1024*512 },  // RSS
        6: { soft: 256, hard: 256 },              // NPROC
        7: { soft: 1024, hard: 65536 },           // NOFILE
        8: { soft: 64*1024, hard: 256*1024 },     // MEMLOCK
        9: { soft: 1024*1024*256, hard: 1024*1024*1024 }  // AS
      };

      const limit = limits[resource] || { soft: 1024, hard: 2048 };
      console.log(`[Syscall:getrlimit] Resource ${resource}: soft=${limit.soft}, hard=${limit.hard}`);
      return limit;

    } catch (e) {
      console.error('[Syscall:getrlimit] Error:', e.message);
      return null;
    }
  };

  // setrlimit: set resource limits
  kernel.syscalls.setrlimit = (proc, resource, soft, hard) => {
    try {
      console.log(`[Syscall:setrlimit] PID ${proc.pid} setrlimit(${resource}, ${soft}, ${hard})`);

      if (typeof soft !== 'number' || typeof hard !== 'number') {
        throw new Error('EINVAL: invalid limits');
      }

      if (soft > hard && hard !== -1) {
        throw new Error('EINVAL: soft > hard');
      }

      // Store limits per process
      if (!proc.rlimits) proc.rlimits = {};
      proc.rlimits[resource] = { soft, hard };

      console.log(`[Syscall:setrlimit] Resource ${resource} limits set ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:setrlimit] Error:', e.message);
      return -1;
    }
  };

  // getrusage: get resource usage
  kernel.syscalls.getrusage = (proc, who) => {
    try {
      console.log(`[Syscall:getrusage] PID ${proc.pid} getrusage(${who})`);

      // RUSAGE_SELF=0, RUSAGE_CHILDREN=1

      const usage = {
        utime: Math.floor(Date.now() / 1000),
        stime: 0,
        maxrss: 1024 * 1024 * 256,
        ixrss: 0,
        idrss: 0,
        isrss: 0,
        minflt: 0,
        majflt: 0,
        nswap: 0,
        inblock: 0,
        oublock: 0,
        msgsnd: 0,
        msgrcv: 0,
        nsignals: 0,
        nvcsw: 0,
        nivcsw: 0
      };

      console.log(`[Syscall:getrusage] Resource usage for ${who}`);
      return usage;

    } catch (e) {
      console.error('[Syscall:getrusage] Error:', e.message);
      return null;
    }
  };

  console.log('[Syscalls:resource] Registered ✓');
}
