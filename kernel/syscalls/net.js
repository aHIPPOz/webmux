// kernel/syscalls/net.js — Network Syscalls AMÉLIORÉ
// Socket syscalls mapped to Loopback network

export function registerNetSyscalls(kernel) {
  console.log('[Syscalls:net] Registering network syscalls...');
  
  // Ensure kernel.syscalls exists
  kernel.syscalls = kernel.syscalls || {};

  // socket: create new socket
  kernel.syscalls.socket = (proc, domain = 0, type = 1, protocol = 0) => {
    try {
      console.log(`[Syscall:socket] PID ${proc.pid} socket(domain=${domain}, type=${type}, proto=${protocol})`);

      // Get network
      const network = kernel.loopbackNet || (kernel.netDevice && kernel.netDevice.getNetwork());
      if (!network) {
        throw new Error('ENETUNREACH: no network device available');
      }

      // Create socket
      const sock = network.createSocket();
      if (!sock) {
        throw new Error('ENFILE: cannot allocate socket');
      }

      // Initialize receive queue
      sock._recvQueue = [];
      sock.onmessage = (from, uint8arr) => {
        sock._recvQueue.push({ from, data: uint8arr });
        console.log(`[Socket] Message received from ${from}, queued`);
      };

      // Allocate file descriptor
      if (!proc.nextFd) proc.nextFd = 3; // Standard FDs: 0=stdin, 1=stdout, 2=stderr
      const fd = proc.nextFd++;

      if (!proc.fdTable) proc.fdTable = new Map();
      proc.fdTable.set(fd, { kind: 'net', sock });

      console.log(`[Syscall:socket] Socket created FD ${fd} ✓`);
      return fd;

    } catch (e) {
      console.error('[Syscall:socket] Error:', e.message);
      throw e;
    }
  };

  // bind: bind socket to address
  kernel.syscalls.bind = async (proc, fd, addr) => {
    try {
      console.log(`[Syscall:bind] PID ${proc.pid} bind FD ${fd} to ${addr}`);

      if (!proc.fdTable) throw new Error('EBADF: no file descriptor table');
      const entry = proc.fdTable.get(fd);
      
      if (!entry || entry.kind !== 'net') {
        throw new Error('EBADF: not a socket file descriptor');
      }

      if (!addr || typeof addr !== 'string') {
        throw new Error('EINVAL: invalid address');
      }

      await entry.sock.bind(addr);
      console.log(`[Syscall:bind] Socket FD ${fd} bound to ${addr} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:bind] Error:', e.message);
      throw e;
    }
  };

  // sendto: send datagram to address
  kernel.syscalls.sendto = async (proc, fd, addr, buffer) => {
    try {
      console.log(`[Syscall:sendto] PID ${proc.pid} sendto FD ${fd} to ${addr}`);

      if (!proc.fdTable) throw new Error('EBADF: no file descriptor table');
      const entry = proc.fdTable.get(fd);

      if (!entry || entry.kind !== 'net') {
        throw new Error('EBADF: not a socket file descriptor');
      }

      // Convert buffer to Uint8Array if needed
      const data = (buffer instanceof Uint8Array) 
        ? buffer 
        : (buffer instanceof ArrayBuffer) 
          ? new Uint8Array(buffer)
          : new TextEncoder().encode(String(buffer));

      if (!addr || typeof addr !== 'string') {
        throw new Error('EINVAL: invalid address');
      }

      const sent = await entry.sock.send(addr, data);
      console.log(`[Syscall:sendto] Sent ${sent} bytes to ${addr} ✓`);
      return sent;

    } catch (e) {
      console.error('[Syscall:sendto] Error:', e.message);
      throw e;
    }
  };

  // recvfrom: receive datagram (non-blocking)
  kernel.syscalls.recvfrom = (proc, fd, maxlen = 65536) => {
    try {
      console.log(`[Syscall:recvfrom] PID ${proc.pid} recvfrom FD ${fd}`);

      if (!proc.fdTable) throw new Error('EBADF: no file descriptor table');
      const entry = proc.fdTable.get(fd);

      if (!entry || entry.kind !== 'net') {
        throw new Error('EBADF: not a socket file descriptor');
      }

      // Check receive queue
      const queue = entry.sock._recvQueue || [];
      if (queue.length === 0) {
        console.log(`[Syscall:recvfrom] FD ${fd} no data available (EAGAIN)`);
        return null;
      }

      // Dequeue packet
      const pkt = queue.shift();
      const data = pkt.data.subarray(0, Math.min(pkt.data.length, maxlen));
      
      console.log(`[Syscall:recvfrom] Received ${data.length} bytes from ${pkt.from} ✓`);
      return { from: pkt.from, data };

    } catch (e) {
      console.error('[Syscall:recvfrom] Error:', e.message);
      throw e;
    }
  };

  // closeSocket: close socket
  kernel.syscalls.closeSocket = async (proc, fd) => {
    try {
      console.log(`[Syscall:closeSocket] PID ${proc.pid} close FD ${fd}`);

      if (!proc.fdTable) return 0;
      const entry = proc.fdTable.get(fd);

      if (!entry) {
        console.warn(`[Syscall:closeSocket] FD ${fd} not found`);
        return 0;
      }

      if (entry.kind === 'net' && entry.sock && typeof entry.sock.close === 'function') {
        await entry.sock.close();
        console.log(`[Syscall:closeSocket] Socket closed`);
      }

      proc.fdTable.delete(fd);
      console.log(`[Syscall:closeSocket] FD ${fd} removed from table ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:closeSocket] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:net] Registered ✓');
}
