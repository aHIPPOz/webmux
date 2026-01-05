// kernel/fs/procfs.js — /proc Filesystem AMÉLIORÉ

export function registerProcFS(kernel) {
  console.log('[procfs] Mounting /proc filesystem...');

  if (!kernel.vfs) {
    console.warn('[procfs] kernel.vfs not available');
    return;
  }

  const vfs = kernel.vfs;

  // /proc/uptime — system uptime
  vfs.registerVirtual('/proc/uptime', {
    read: async () => {
      try {
        const ms = performance.now();
        const uptime = (ms / 1000).toFixed(2);
        const idle = '0.00'; // Fake idle time
        const s = `${uptime} ${idle}\n`;
        return new TextEncoder().encode(s);
      } catch (e) {
        console.error('[procfs] /proc/uptime error:', e.message);
        return new TextEncoder().encode('0.00 0.00\n');
      }
    }
  });

  // /proc/meminfo — memory information
  vfs.registerVirtual('/proc/meminfo', {
    read: async () => {
      try {
        // Calculate memory usage from process table
        let totalMem = 64 * 65536; // Default WebAssembly.Memory: 64 pages × 64KiB
        let freeMem = totalMem;

        if (kernel.processTable && typeof kernel.processTable.values === 'function') {
          for (const proc of kernel.processTable.values()) {
            if (proc.memory && proc.memory.buffer) {
              freeMem -= proc.memory.buffer.byteLength;
            }
          }
        }

        // Clamp to non-negative
        freeMem = Math.max(0, freeMem);

        const lines = [];
        lines.push(`MemTotal:        ${(totalMem >> 10).toFixed(0)} kB`);
        lines.push(`MemFree:         ${(freeMem >> 10).toFixed(0)} kB`);
        lines.push(`MemAvailable:    ${(freeMem >> 10).toFixed(0)} kB`);
        lines.push(`Buffers:         0 kB`);
        lines.push(`Cached:          0 kB`);
        lines.push(`SwapTotal:       0 kB`);
        lines.push(`SwapFree:        0 kB`);
        
        return new TextEncoder().encode(lines.join('\n') + '\n');
      } catch (e) {
        console.error('[procfs] /proc/meminfo error:', e.message);
        return new TextEncoder().encode('MemTotal: 0 kB\n');
      }
    }
  });

  // /proc/version — system version
  vfs.registerVirtual('/proc/version', {
    read: async () => {
      try {
        const s = 'Wasmux v2 - POSIX-like WASM kernel\n';
        return new TextEncoder().encode(s);
      } catch (e) {
        console.error('[procfs] /proc/version error:', e.message);
        return new TextEncoder().encode('Wasmux\n');
      }
    }
  });

  // /proc/devices — list all devices
  vfs.registerVirtual('/proc/devices', {
    read: async () => {
      try {
        const devList = kernel.devices ? kernel.devices.list() : [];
        const lines = ['Character devices:'];
        devList.forEach((path, i) => {
          lines.push(`  ${i} ${path}`);
        });
        return new TextEncoder().encode(lines.join('\n') + '\n');
      } catch (e) {
        console.error('[procfs] /proc/devices error:', e.message);
        return new TextEncoder().encode('');
      }
    }
  });

  // /proc — list PIDs
  vfs.registerVirtual('/proc', {
    read: async () => {
      try {
        const pids = Array.from(kernel.processTable.keys()).sort().map(String).join('\n');
        return new TextEncoder().encode(pids + (pids ? '\n' : ''));
      } catch (e) {
        console.error('[procfs] /proc error:', e.message);
        return new TextEncoder().encode('');
      }
    }
  });

  // Dynamic per-PID entries: /proc/<pid>/status
  const registerPidEntries = () => {
    try {
      for (const [pid, proc] of kernel.processTable.entries()) {
        const statusPath = `/proc/${pid}/status`;
        
        // Skip if already registered
        if (vfs.virtualFiles.has(statusPath)) continue;

        vfs.registerVirtual(statusPath, {
          read: async () => {
            try {
              const lines = [];
              lines.push(`Name:\t\twasm-process`);
              lines.push(`Pid:\t\t${pid}`);
              lines.push(`State:\t\t${proc.alive ? 'R (running)' : 'Z (zombie)'}`);
              lines.push(`FDSize:\t\t${(proc.fdTable ? proc.fdTable.size : 0)}`);
              lines.push(`Args:\t\t${(proc.args || []).join(' ')}`);
              
              if (proc.memory && proc.memory.buffer) {
                const memKiB = (proc.memory.buffer.byteLength >> 10);
                lines.push(`MemUsage:\t${memKiB} kB`);
              }

              return new TextEncoder().encode(lines.join('\n') + '\n');
            } catch (e) {
              console.error(`[procfs] /proc/${pid}/status error:`, e.message);
              return new TextEncoder().encode('');
            }
          }
        });
      }
    } catch (e) {
      console.error('[procfs] registerPidEntries error:', e.message);
    }
  };

  // Register initial PID entries
  registerPidEntries();

  console.log('[procfs] /proc filesystem mounted ✓');
}
