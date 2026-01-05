// kernel/syscalls/memory.js — Memory Management Syscalls (COMPLET)

export function registerMemorySyscalls(kernel) {
  console.log('[Syscalls:memory] Registering memory syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // brk: change heap end
  kernel.syscalls.brk = (proc, addr = null) => {
    try {
      console.log(`[Syscall:brk] PID ${proc.pid} brk(${addr})`);

      if (!proc.heap) {
        proc.heap = {
          start: 0x10000,
          current: 0x10000,
          limit: 0x100000
        };
      }

      if (addr === null || addr === undefined) {
        // Just return current
        return proc.heap.current;
      }

      if (typeof addr !== 'number' || addr < 0) {
        throw new Error('EINVAL: invalid address');
      }

      if (addr > proc.heap.limit) {
        console.warn(`[Syscall:brk] Address exceeds limit`);
        return proc.heap.current; // Fail
      }

      proc.heap.current = addr;
      console.log(`[Syscall:brk] Heap now at 0x${addr.toString(16)} ✓`);
      return addr;

    } catch (e) {
      console.error('[Syscall:brk] Error:', e.message);
      return -1;
    }
  };

  // sbrk: change heap end relative to current
  kernel.syscalls.sbrk = (proc, increment = 0) => {
    try {
      console.log(`[Syscall:sbrk] PID ${proc.pid} sbrk(${increment})`);

      if (!proc.heap) {
        proc.heap = {
          start: 0x10000,
          current: 0x10000,
          limit: 0x100000
        };
      }

      if (typeof increment !== 'number') {
        throw new Error('EINVAL: invalid increment');
      }

      const old = proc.heap.current;
      const newAddr = old + increment;

      if (newAddr < proc.heap.start || newAddr > proc.heap.limit) {
        console.warn(`[Syscall:sbrk] Address out of bounds`);
        return -1;
      }

      proc.heap.current = newAddr;
      console.log(`[Syscall:sbrk] Heap extended from 0x${old.toString(16)} to 0x${newAddr.toString(16)} ✓`);
      return old;

    } catch (e) {
      console.error('[Syscall:sbrk] Error:', e.message);
      return -1;
    }
  };

  // mmap: map memory
  kernel.syscalls.mmap = (proc, addr = 0, length = 0x1000, prot = 3, flags = 0, fd = -1, offset = 0) => {
    try {
      console.log(`[Syscall:mmap] PID ${proc.pid} mmap(addr=0x${addr.toString(16)}, len=0x${length.toString(16)})`);

      if (typeof length !== 'number' || length <= 0) {
        throw new Error('EINVAL: invalid length');
      }

      // Allocate buffer
      try {
        const buffer = new ArrayBuffer(length);
        if (!proc.mmap) proc.mmap = new Map();

        const mapAddr = addr || 0x200000 + (proc.mmap.size * 0x1000);
        proc.mmap.set(mapAddr, { buffer, length, prot, flags });

        console.log(`[Syscall:mmap] Mapped at 0x${mapAddr.toString(16)} ✓`);
        return mapAddr;
      } catch (e) {
        throw new Error('ENOMEM: cannot allocate memory');
      }

    } catch (e) {
      console.error('[Syscall:mmap] Error:', e.message);
      return -1;
    }
  };

  // munmap: unmap memory
  kernel.syscalls.munmap = (proc, addr, length) => {
    try {
      console.log(`[Syscall:munmap] PID ${proc.pid} munmap(addr=0x${addr.toString(16)})`);

      if (!proc.mmap || !proc.mmap.has(addr)) {
        throw new Error('EINVAL: address not mapped');
      }

      proc.mmap.delete(addr);
      console.log(`[Syscall:munmap] Unmapped 0x${addr.toString(16)} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:munmap] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:memory] Registered ✓');
}
