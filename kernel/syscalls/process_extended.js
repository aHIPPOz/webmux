// kernel/syscalls/process_extended.js — Extended Process Control Syscalls (COMPLET)

export function registerProcessExtendedSyscalls(kernel) {
  console.log('[Syscalls:process_extended] Registering extended process syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // getpid: get process ID
  kernel.syscalls.getpid = (proc) => {
    try {
      console.log(`[Syscall:getpid] PID ${proc.pid} getpid()`);
      return proc.pid;
    } catch (e) {
      console.error('[Syscall:getpid] Error:', e.message);
      return -1;
    }
  };

  // getppid: get parent process ID
  kernel.syscalls.getppid = (proc) => {
    try {
      console.log(`[Syscall:getppid] PID ${proc.pid} getppid()`);
      const ppid = proc.ppid || 1; // Default to init
      return ppid;
    } catch (e) {
      console.error('[Syscall:getppid] Error:', e.message);
      return 1;
    }
  };

  // getuid: get user ID
  kernel.syscalls.getuid = (proc) => {
    try {
      console.log(`[Syscall:getuid] PID ${proc.pid} getuid()`);
      return proc.uid || 0; // Default to root
    } catch (e) {
      console.error('[Syscall:getuid] Error:', e.message);
      return 0;
    }
  };

  // getgid: get group ID
  kernel.syscalls.getgid = (proc) => {
    try {
      console.log(`[Syscall:getgid] PID ${proc.pid} getgid()`);
      return proc.gid || 0; // Default to root group
    } catch (e) {
      console.error('[Syscall:getgid] Error:', e.message);
      return 0;
    }
  };

  // setuid: set user ID
  kernel.syscalls.setuid = (proc, uid) => {
    try {
      console.log(`[Syscall:setuid] PID ${proc.pid} setuid(${uid})`);
      
      if (typeof uid !== 'number' || uid < 0) {
        throw new Error('EINVAL: invalid uid');
      }

      proc.uid = uid;
      console.log(`[Syscall:setuid] UID set to ${uid} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:setuid] Error:', e.message);
      return -1;
    }
  };

  // setgid: set group ID
  kernel.syscalls.setgid = (proc, gid) => {
    try {
      console.log(`[Syscall:setgid] PID ${proc.pid} setgid(${gid})`);

      if (typeof gid !== 'number' || gid < 0) {
        throw new Error('EINVAL: invalid gid');
      }

      proc.gid = gid;
      console.log(`[Syscall:setgid] GID set to ${gid} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:setgid] Error:', e.message);
      return -1;
    }
  };

  // wait: wait for child process to terminate
  kernel.syscalls.wait = async (proc, options = {}) => {
    try {
      console.log(`[Syscall:wait] PID ${proc.pid} wait()`);

      // Find any child processes
      const children = [];
      for (const [pid, p] of kernel.processTable) {
        if (p.ppid === proc.pid) {
          children.push(p);
        }
      }

      if (children.length === 0) {
        console.log(`[Syscall:wait] No child processes`);
        return -1;
      }

      // Wait for first child to terminate
      let attempts = 0;
      while (attempts < 100) {
        for (const child of children) {
          if (child.state === 'ZOMBIE') {
            const exitCode = child.exitCode || 0;
            console.log(`[Syscall:wait] Child PID ${child.pid} terminated with code ${exitCode}`);
            return { pid: child.pid, exitCode };
          }
        }
        await new Promise(r => setTimeout(r, 10));
        attempts++;
      }

      console.log(`[Syscall:wait] Timeout waiting for children`);
      return -1;

    } catch (e) {
      console.error('[Syscall:wait] Error:', e.message);
      return -1;
    }
  };

  // waitpid: wait for specific child process
  kernel.syscalls.waitpid = async (proc, pid, options = {}) => {
    try {
      console.log(`[Syscall:waitpid] PID ${proc.pid} waitpid(${pid})`);

      if (typeof pid !== 'number' || pid <= 0) {
        throw new Error('EINVAL: invalid pid');
      }

      // Find the child process
      const child = kernel.processTable.get(pid);
      if (!child) {
        throw new Error('ECHILD: no child with that pid');
      }

      // Wait for it to terminate
      let attempts = 0;
      while (attempts < 100) {
        if (child.state === 'ZOMBIE') {
          const exitCode = child.exitCode || 0;
          console.log(`[Syscall:waitpid] Child PID ${pid} terminated with code ${exitCode}`);
          return { pid, exitCode };
        }
        await new Promise(r => setTimeout(r, 10));
        attempts++;
      }

      console.log(`[Syscall:waitpid] Timeout waiting for PID ${pid}`);
      return { pid, exitCode: -1 };

    } catch (e) {
      console.error('[Syscall:waitpid] Error:', e.message);
      return null;
    }
  };

  console.log('[Syscalls:process_extended] Registered ✓');
}
