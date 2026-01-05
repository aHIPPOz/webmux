// kernel/syscalls/process.js — Process Syscalls AMÉLIORÉ

export function registerProcessSyscalls(kernel) {
  console.log('[Syscalls:process] Registering process syscalls...');

  // exit: terminate current process
  kernel.syscalls.exit = (proc, code = 0) => {
    try {
      console.log(`[Syscall:exit] PID ${proc.pid} exiting with code ${code}`);
      proc.state = 'ZOMBIE';
      proc.exitCode = code;
      proc.alive = false;
      kernel.processTable.delete(proc.pid);
      console.log(`[Syscall:exit] PID ${proc.pid} removed from process table ✓`);
      return 0;
    } catch (e) {
      console.error(`[Syscall:exit] Error:`, e.message);
      throw e;
    }
  };

  // exec: load and execute new binary (replaces current process)
  kernel.syscalls.exec = async (proc, path, argv = []) => {
    try {
      console.log(`[Syscall:exec] PID ${proc.pid} executing ${path} with args ${argv.join(' ')}`);
      
      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: path must be a string');
      }

      const data = await kernel.vfs.read(path);
      if (!data || data.length === 0) {
        throw new Error(`ENOENT: ${path} not found or empty`);
      }

      console.log(`[Syscall:exec] Loaded ${data.length} bytes from ${path}`);
      const newPid = await kernel.spawnWasmBinary(data, { args: argv });
      console.log(`[Syscall:exec] Spawned new process PID ${newPid}`);
      
      // Exit current process
      kernel.syscalls.exit(proc, 0);
      return newPid;

    } catch (e) {
      console.error(`[Syscall:exec] Error:`, e.message);
      throw e;
    }
  };

  // fork: create child process (clone of current process)
  kernel.syscalls.fork = async (proc) => {
    try {
      console.log(`[Syscall:fork] PID ${proc.pid} forking...`);

      // Create child process copy
      const childPid = proc.pid + 10000 + Math.floor(Math.random() * 10000);
      
      const child = {
        pid: childPid,
        ppid: proc.pid,
        state: 'READY',
        alive: true,
        exitCode: 0,
        uid: proc.uid || 0,
        gid: proc.gid || 0,
        cwd: proc.cwd || '/',
        memory: proc.memory ? new WebAssembly.Memory({ initial: 16, maximum: 256 }) : null,
        fdTable: new Map(proc.fdTable),
        nextFd: proc.nextFd || 3,
        pendingSignals: [],
        sighandlers: { ...proc.sighandlers },
        sigactions: { ...proc.sigactions },
        sigmask: proc.sigmask || 0,
        heap: proc.heap ? { ...proc.heap } : null,
        mmap: new Map(proc.mmap || [])
      };

      // Register child
      kernel.processTable.set(childPid, child);
      console.log(`[Syscall:fork] Child PID ${childPid} created ✓`);

      // Return child PID to parent, 0 to child (handled by caller)
      return childPid;

    } catch (e) {
      console.error('[Syscall:fork] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:process] Registered ✓');
}
