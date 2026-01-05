// kernel/fs/procfs.js — /proc Filesystem

export function registerProcFS(kernel) {
  console.log('[procfs] Mounting /proc filesystem...');

  if (!kernel.vfs) {
    console.warn('[procfs] kernel.vfs not available');
    return;
  }

  const vfs = kernel.vfs;
  const enc = new TextEncoder();

  /* =======================
   * /proc/uptime
   * ======================= */
  vfs.registerVirtual('/proc/uptime', {
    read: async () => {
      const uptime = (performance.now() / 1000).toFixed(2);
      return enc.encode(`${uptime} 0.00\n`);
    }
  });

  /* =======================
   * /proc/meminfo
   * ======================= */
  vfs.registerVirtual('/proc/meminfo', {
    read: async () => {
      let total = 0;
      let used = 0;

      if (kernel.processTable) {
        for (const proc of kernel.processTable.values()) {
          if (proc.memory?.buffer) {
            const size = proc.memory.buffer.byteLength;
            total += size;
            used += size;
          }
        }
      }

      // fallback minimal (64 pages WASM)
      if (total === 0) total = 64 * 65536;

      const free = Math.max(0, total - used);
      const toKB = v => (v >> 10);

      const lines = [
        `MemTotal:        ${toKB(total)} kB`,
        `MemFree:         ${toKB(free)} kB`,
        `MemAvailable:    ${toKB(free)} kB`,
        `Buffers:         0 kB`,
        `Cached:          0 kB`,
        `SwapTotal:       0 kB`,
        `SwapFree:        0 kB`
      ];

      return enc.encode(lines.join('\n') + '\n');
    }
  });

  /* =======================
   * /proc/version
   * ======================= */
  vfs.registerVirtual('/proc/version', {
    read: async () =>
      enc.encode('Wasmux kernel v2 (POSIX-like, WASM/WASI)\n')
  });

  /* =======================
   * /proc/devices
   * ======================= */
  vfs.registerVirtual('/proc/devices', {
    read: async () => {
      const devs = kernel.devices?.list?.() ?? [];
      const lines = ['Character devices:'];
      devs.forEach((d, i) => lines.push(` ${i} ${d}`));
      return enc.encode(lines.join('\n') + '\n');
    }
  });

  /* =======================
   * /proc (PID list)
   * ======================= */
  vfs.registerVirtual('/proc', {
    read: async () => {
      const pids = kernel.processTable
        ? Array.from(kernel.processTable.keys()).sort()
        : [];
      return enc.encode(pids.join('\n') + (pids.length ? '\n' : ''));
    }
  });

  /* =======================
   * /proc/<pid>/status
   * ======================= */
  function registerPidEntries() {
    if (!kernel.processTable) return;

    for (const [pid, proc] of kernel.processTable.entries()) {
      const path = `/proc/${pid}/status`;
      if (vfs.virtualFiles.has(path)) continue;

      vfs.registerVirtual(path, {
        read: async () => {
          const lines = [
            `Name:\t\twasm-process`,
            `Pid:\t\t${pid}`,
            `State:\t\t${proc.alive ? 'R (running)' : 'Z (zombie)'}`,
            `FDSize:\t\t${proc.fdTable?.size ?? 0}`,
            `Args:\t\t${(proc.args || []).join(' ')}`
          ];

          if (proc.memory?.buffer) {
            lines.push(
              `VmSize:\t\t${proc.memory.buffer.byteLength >> 10} kB`
            );
          }

          return enc.encode(lines.join('\n') + '\n');
        }
      });
    }
  }

  registerPidEntries();

  console.log('[procfs] /proc filesystem mounted ✓');
}
