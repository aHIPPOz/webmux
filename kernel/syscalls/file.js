// kernel/syscalls/file.js — File I/O Syscalls (COMPLET)

export function registerFileSyscalls(kernel) {
  console.log('[Syscalls:file] Registering file I/O syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // open: open or create a file
  kernel.syscalls.open = async (proc, path, flags = 0, mode = 0o644) => {
    try {
      console.log(`[Syscall:open] PID ${proc.pid} open(${path}, flags=${flags}, mode=${mode.toString(8)})`);
      
      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      // Allocate file descriptor
      if (!proc.nextFd) proc.nextFd = 3;
      const fd = proc.nextFd++;

      if (!proc.fdTable) proc.fdTable = new Map();

      // Store file entry
      proc.fdTable.set(fd, {
        kind: 'file',
        path,
        flags,
        mode,
        offset: 0,
        data: null
      });

      console.log(`[Syscall:open] ${path} opened as FD ${fd} ✓`);
      return fd;

    } catch (e) {
      console.error('[Syscall:open] Error:', e.message);
      return -1;
    }
  };

  // close: close a file descriptor
  kernel.syscalls.close = (proc, fd) => {
    try {
      console.log(`[Syscall:close] PID ${proc.pid} close(${fd})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      proc.fdTable.delete(fd);
      console.log(`[Syscall:close] FD ${fd} closed ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:close] Error:', e.message);
      return -1;
    }
  };

  // read: read from file descriptor
  kernel.syscalls.read = async (proc, fd, count = 1024) => {
    try {
      console.log(`[Syscall:read] PID ${proc.pid} read(${fd}, count=${count})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);

      if (entry.kind === 'file') {
        // Try to read from VFS
        try {
          const data = await kernel.vfs.read(entry.path);
          const chunk = data.subarray(entry.offset, entry.offset + count);
          entry.offset += chunk.length;
          console.log(`[Syscall:read] Read ${chunk.length} bytes from ${entry.path}`);
          return chunk;
        } catch (e) {
          console.warn(`[Syscall:read] Could not read file: ${e.message}`);
          return new Uint8Array(0);
        }
      } else if (entry.kind === 'net') {
        // Read from socket
        const queue = entry.sock._recvQueue || [];
        if (queue.length === 0) return null;
        const pkt = queue.shift();
        return pkt.data.subarray(0, Math.min(pkt.data.length, count));
      } else if (entry.kind === 'pipe') {
        // Read from pipe
        if (!entry.buffer || entry.buffer.length === 0) return null;
        const chunk = entry.buffer.subarray(0, count);
        entry.buffer = entry.buffer.subarray(count);
        return chunk;
      }

      return new Uint8Array(0);

    } catch (e) {
      console.error('[Syscall:read] Error:', e.message);
      return null;
    }
  };

  // write: write to file descriptor
  kernel.syscalls.write = async (proc, fd, data) => {
    try {
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
      console.log(`[Syscall:write] PID ${proc.pid} write(${fd}, ${bytes.length} bytes)`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);

      if (entry.kind === 'file') {
        // Write to VFS
        try {
          await kernel.vfs.write(entry.path, bytes);
          console.log(`[Syscall:write] Wrote ${bytes.length} bytes to ${entry.path}`);
          return bytes.length;
        } catch (e) {
          console.warn(`[Syscall:write] Could not write file: ${e.message}`);
          return 0;
        }
      } else if (entry.kind === 'net') {
        // Write to socket (use sendto semantics)
        if (entry.addr) {
          const sent = await entry.sock.send(entry.addr, bytes);
          return sent;
        }
        return 0;
      } else if (entry.kind === 'pipe') {
        // Write to pipe
        if (!entry.buffer) entry.buffer = new Uint8Array(0);
        const combined = new Uint8Array(entry.buffer.length + bytes.length);
        combined.set(entry.buffer);
        combined.set(bytes, entry.buffer.length);
        entry.buffer = combined;
        return bytes.length;
      } else if (entry.kind === 'console') {
        // Write to console
        const text = new TextDecoder().decode(bytes);
        console.log(`[Syscall:write:console]`, text);
        return bytes.length;
      }

      return 0;

    } catch (e) {
      console.error('[Syscall:write] Error:', e.message);
      return -1;
    }
  };

  // lseek: change file offset
  kernel.syscalls.lseek = (proc, fd, offset = 0, whence = 0) => {
    try {
      console.log(`[Syscall:lseek] PID ${proc.pid} lseek(${fd}, offset=${offset}, whence=${whence})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);

      if (entry.kind !== 'file') {
        throw new Error('ESPIPE: illegal seek');
      }

      // SEEK_SET=0, SEEK_CUR=1, SEEK_END=2
      switch (whence) {
        case 0: // SEEK_SET
          entry.offset = offset;
          break;
        case 1: // SEEK_CUR
          entry.offset += offset;
          break;
        case 2: // SEEK_END
          // Would need file size, approximate
          entry.offset = Math.max(0, entry.offset + offset);
          break;
        default:
          throw new Error('EINVAL: invalid whence');
      }

      console.log(`[Syscall:lseek] New offset: ${entry.offset}`);
      return entry.offset;

    } catch (e) {
      console.error('[Syscall:lseek] Error:', e.message);
      return -1;
    }
  };

  // stat: get file statistics
  kernel.syscalls.stat = async (proc, path) => {
    try {
      console.log(`[Syscall:stat] PID ${proc.pid} stat(${path})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      try {
        const stat = await kernel.vfs.stat(path);
        console.log(`[Syscall:stat] ${path} size=${stat.size}`);
        return stat;
      } catch (e) {
        throw new Error('ENOENT: no such file');
      }

    } catch (e) {
      console.error('[Syscall:stat] Error:', e.message);
      return null;
    }
  };

  // fstat: get file descriptor statistics
  kernel.syscalls.fstat = (proc, fd) => {
    try {
      console.log(`[Syscall:fstat] PID ${proc.pid} fstat(${fd})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      const entry = proc.fdTable.get(fd);

      return {
        size: 0,
        mode: entry.mode || 0o644,
        kind: entry.kind,
        offset: entry.offset
      };

    } catch (e) {
      console.error('[Syscall:fstat] Error:', e.message);
      return null;
    }
  };

  // unlink: remove file
  kernel.syscalls.unlink = async (proc, path) => {
    try {
      console.log(`[Syscall:unlink] PID ${proc.pid} unlink(${path})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      await kernel.vfs.unlink(path);
      console.log(`[Syscall:unlink] ${path} removed ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:unlink] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:file] Registered ✓');
}
