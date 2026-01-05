// kernel/syscalls/epoll.js — Advanced I/O Multiplexing (COMPLET)

export function registerEpollSyscalls(kernel) {
  console.log('[Syscalls:epoll] Registering epoll syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // epoll_create: create epoll instance
  kernel.syscalls.epoll_create = (proc, size = 256) => {
    try {
      console.log(`[Syscall:epoll_create] PID ${proc.pid} epoll_create(${size})`);

      if (typeof size !== 'number' || size <= 0) {
        throw new Error('EINVAL: invalid size');
      }

      if (!proc.nextFd) proc.nextFd = 3;
      if (!proc.fdTable) proc.fdTable = new Map();

      const epfd = proc.nextFd++;

      proc.fdTable.set(epfd, {
        kind: 'epoll',
        events: new Map(),
        readyQueue: [],
        size
      });

      console.log(`[Syscall:epoll_create] Epoll FD ${epfd} created ✓`);
      return epfd;

    } catch (e) {
      console.error('[Syscall:epoll_create] Error:', e.message);
      return -1;
    }
  };

  // epoll_ctl: control epoll set
  kernel.syscalls.epoll_ctl = (proc, epfd, op, fd, events) => {
    try {
      console.log(`[Syscall:epoll_ctl] PID ${proc.pid} epoll_ctl(${epfd}, op=${op}, fd=${fd})`);

      if (!proc.fdTable || !proc.fdTable.has(epfd)) {
        throw new Error('EBADF: bad epoll descriptor');
      }

      const ep = proc.fdTable.get(epfd);
      if (ep.kind !== 'epoll') {
        throw new Error('EINVAL: not an epoll descriptor');
      }

      // EPOLL_CTL_ADD=1, EPOLL_CTL_MOD=2, EPOLL_CTL_DEL=3
      switch (op) {
        case 1: // EPOLL_CTL_ADD
          ep.events.set(fd, { fd, events, data: null });
          console.log(`[Syscall:epoll_ctl] FD ${fd} added to epoll`);
          break;
        case 2: // EPOLL_CTL_MOD
          if (!ep.events.has(fd)) throw new Error('ENOENT');
          ep.events.get(fd).events = events;
          console.log(`[Syscall:epoll_ctl] FD ${fd} modified in epoll`);
          break;
        case 3: // EPOLL_CTL_DEL
          ep.events.delete(fd);
          console.log(`[Syscall:epoll_ctl] FD ${fd} removed from epoll`);
          break;
        default:
          throw new Error('EINVAL: invalid op');
      }

      return 0;

    } catch (e) {
      console.error('[Syscall:epoll_ctl] Error:', e.message);
      return -1;
    }
  };

  // epoll_wait: wait for events
  kernel.syscalls.epoll_wait = async (proc, epfd, timeout = -1) => {
    try {
      console.log(`[Syscall:epoll_wait] PID ${proc.pid} epoll_wait(${epfd}, timeout=${timeout})`);

      if (!proc.fdTable || !proc.fdTable.has(epfd)) {
        throw new Error('EBADF: bad epoll descriptor');
      }

      const ep = proc.fdTable.get(epfd);
      if (ep.kind !== 'epoll') {
        throw new Error('EINVAL: not an epoll descriptor');
      }

      // Wait for events
      const deadline = timeout >= 0 ? Date.now() + timeout : Infinity;
      let attempts = 0;

      while (Date.now() < deadline && attempts < 1000) {
        // Check for ready FDs
        const ready = [];
        for (const [fd, info] of ep.events) {
          if (proc.fdTable && proc.fdTable.has(fd)) {
            const entry = proc.fdTable.get(fd);
            if (entry.kind === 'net' && entry.sock && entry.sock._recvQueue) {
              if (entry.sock._recvQueue.length > 0) {
                ready.push({ fd, events: 0x1, data: null }); // EPOLLIN
              }
            }
          }
        }

        if (ready.length > 0) {
          console.log(`[Syscall:epoll_wait] ${ready.length} events ready`);
          return ready;
        }

        await new Promise(r => setTimeout(r, 10));
        attempts++;
      }

      console.log(`[Syscall:epoll_wait] Timeout, no events`);
      return [];

    } catch (e) {
      console.error('[Syscall:epoll_wait] Error:', e.message);
      return null;
    }
  };

  console.log('[Syscalls:epoll] Registered ✓');
}
