// kernel/syscalls/ipc.js — IPC Syscalls (COMPLET)

export function registerIPCSyscalls(kernel) {
  console.log('[Syscalls:ipc] Registering IPC syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // pipe: create pipe
  kernel.syscalls.pipe = (proc) => {
    try {
      console.log(`[Syscall:pipe] PID ${proc.pid} pipe()`);

      if (!proc.nextFd) proc.nextFd = 3;
      if (!proc.fdTable) proc.fdTable = new Map();

      // Create pipe pair
      const pipeId = Date.now() + Math.random();
      const pipe = {
        id: pipeId,
        buffer: new Uint8Array(0),
        closed: false
      };

      // Read end
      const readFd = proc.nextFd++;
      proc.fdTable.set(readFd, { kind: 'pipe', mode: 'read', ...pipe });

      // Write end
      const writeFd = proc.nextFd++;
      proc.fdTable.set(writeFd, { kind: 'pipe', mode: 'write', ...pipe });

      console.log(`[Syscall:pipe] Created pipe: read FD ${readFd}, write FD ${writeFd} ✓`);
      return [readFd, writeFd];

    } catch (e) {
      console.error('[Syscall:pipe] Error:', e.message);
      return [-1, -1];
    }
  };

  // listen: listen on socket
  kernel.syscalls.listen = async (proc, fd, backlog = 5) => {
    try {
      console.log(`[Syscall:listen] PID ${proc.pid} listen(${fd}, backlog=${backlog})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);
      if (entry.kind !== 'net') {
        throw new Error('ENOTSOCK: not a socket');
      }

      entry.listening = true;
      entry.backlog = backlog;
      entry.acceptQueue = [];

      console.log(`[Syscall:listen] Socket listening with backlog ${backlog} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:listen] Error:', e.message);
      return -1;
    }
  };

  // accept: accept connection on socket
  kernel.syscalls.accept = async (proc, fd) => {
    try {
      console.log(`[Syscall:accept] PID ${proc.pid} accept(${fd})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);
      if (entry.kind !== 'net' || !entry.listening) {
        throw new Error('EINVAL: not listening');
      }

      // Wait for connection
      let attempts = 0;
      while (attempts < 100) {
        if (entry.acceptQueue && entry.acceptQueue.length > 0) {
          const conn = entry.acceptQueue.shift();
          
          // Create new socket FD for accepted connection
          if (!proc.nextFd) proc.nextFd = 3;
          const newFd = proc.nextFd++;
          
          proc.fdTable.set(newFd, {
            kind: 'net',
            sock: conn.sock,
            addr: conn.addr,
            listening: false
          });

          console.log(`[Syscall:accept] Accepted connection on new FD ${newFd} ✓`);
          return newFd;
        }
        await new Promise(r => setTimeout(r, 10));
        attempts++;
      }

      console.log(`[Syscall:accept] Timeout waiting for connection`);
      return -1;

    } catch (e) {
      console.error('[Syscall:accept] Error:', e.message);
      return -1;
    }
  };

  // connect: connect socket to address
  kernel.syscalls.connect = async (proc, fd, addr) => {
    try {
      console.log(`[Syscall:connect] PID ${proc.pid} connect(${fd}, ${addr})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      if (!addr || typeof addr !== 'string') {
        throw new Error('EINVAL: invalid address');
      }

      const entry = proc.fdTable.get(fd);
      if (entry.kind !== 'net') {
        throw new Error('ENOTSOCK: not a socket');
      }

      // Store connection address
      entry.addr = addr;
      entry.connected = true;

      console.log(`[Syscall:connect] Connected to ${addr} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:connect] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:ipc] Registered ✓');
}
