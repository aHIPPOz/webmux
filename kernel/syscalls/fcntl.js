// kernel/syscalls/fcntl.js — File Control Syscalls (COMPLET)

export function registerFcntlSyscalls(kernel) {
  console.log('[Syscalls:fcntl] Registering file control syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // fcntl: manipulate file descriptor
  kernel.syscalls.fcntl = (proc, fd, cmd, arg = 0) => {
    try {
      console.log(`[Syscall:fcntl] PID ${proc.pid} fcntl(${fd}, cmd=${cmd}, arg=${arg})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);

      // F_GETFD=1, F_SETFD=2, F_GETFL=3, F_SETFL=4, F_GETLK=5, F_SETLK=6
      switch (cmd) {
        case 1: // F_GETFD - get close-on-exec flag
          return entry.cloexec ? 1 : 0;
        case 2: // F_SETFD - set close-on-exec flag
          entry.cloexec = arg !== 0;
          console.log(`[Syscall:fcntl] F_SETFD set to ${entry.cloexec}`);
          return 0;
        case 3: // F_GETFL - get file status flags
          return entry.flags || 0;
        case 4: // F_SETFL - set file status flags
          entry.flags = arg;
          console.log(`[Syscall:fcntl] F_SETFL set to ${arg}`);
          return 0;
        case 9: // F_DUPFD - duplicate fd
          const newFd = proc.nextFd++;
          proc.fdTable.set(newFd, { ...entry });
          console.log(`[Syscall:fcntl] F_DUPFD created FD ${newFd}`);
          return newFd;
        default:
          throw new Error('EINVAL: unsupported fcntl command');
      }

    } catch (e) {
      console.error('[Syscall:fcntl] Error:', e.message);
      return -1;
    }
  };

  // dup: duplicate file descriptor
  kernel.syscalls.dup = (proc, fd) => {
    try {
      console.log(`[Syscall:dup] PID ${proc.pid} dup(${fd})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const newFd = proc.nextFd++;
      proc.fdTable.set(newFd, { ...proc.fdTable.get(fd) });
      console.log(`[Syscall:dup] FD ${fd} duplicated as ${newFd} ✓`);
      return newFd;

    } catch (e) {
      console.error('[Syscall:dup] Error:', e.message);
      return -1;
    }
  };

  // dup2: duplicate file descriptor to specific fd
  kernel.syscalls.dup2 = (proc, oldfd, newfd) => {
    try {
      console.log(`[Syscall:dup2] PID ${proc.pid} dup2(${oldfd}, ${newfd})`);

      if (!proc.fdTable || !proc.fdTable.has(oldfd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      if (oldfd === newfd) return newfd;

      // Close newfd if it exists
      if (proc.fdTable.has(newfd)) {
        proc.fdTable.delete(newfd);
      }

      proc.fdTable.set(newfd, { ...proc.fdTable.get(oldfd) });
      console.log(`[Syscall:dup2] FD ${oldfd} duplicated to ${newfd} ✓`);
      return newfd;

    } catch (e) {
      console.error('[Syscall:dup2] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:fcntl] Registered ✓');
}
