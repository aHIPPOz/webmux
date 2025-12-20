// kernel/fs/procfs.js
// A small /proc implementation that registers virtual files into the VFS.
// Usage: mountProcFS(vfs, { kernel }) — kernel must expose .processTable and .devices registry


export function mountProcFS(vfs, { kernel }) {
    // /proc uptime
    vfs.registerVirtual('/proc/uptime', {
    read: async () => {
    const ms = performance.now();
    // return two fields like Linux: uptime and idle (we fake idle)
    const s = `${(ms/1000).toFixed(2)} 0.00\n`;
    return new TextEncoder().encode(s);
    }
    });
    
    
    // /proc/version
    vfs.registerVirtual('/proc/version', {
    read: async () => {
    const s = `Wasmux v0 - custom wasi\n`;
    return new TextEncoder().encode(s);
    }
    });
    
    
    // /proc/devices -> list devices from kernel.devices (DeviceRegistry)
    vfs.registerVirtual('/proc/devices', {
    read: async () => {
    try {
    const devs = kernel.devices ? kernel.devices.list() : [];
    const s = devs.join('\n') + '\n';
    return new TextEncoder().encode(s);
    } catch (e) {
    return new TextEncoder().encode('\n');
    }
    }
    });
    
    
    // /proc/<pid>/status (for each process)
    vfs.registerVirtual('/proc', {
    read: async () => {
    // list PIDs
    const pids = Array.from(kernel.processTable.keys()).map(String).join('\n') + '\n';
    return new TextEncoder().encode(pids);
    }
    });
    
    
    // dynamic per-pid files via a simple handler: when code tries to read /proc/<pid>/status,
    // VFS will match exact virtual path; register per-pid on mount and update on changes.
    // We register an updater that polls kernel.processTable and creates per-pid entries.
    
    
    function registerPidEntries() {
    for (const [pid, proc] of kernel.processTable.entries()) {
    const base = `/proc/${pid}`;
    if (!vfs.virtualFiles.has(base + '/status')) {
    vfs.registerVirtual(base + '/status', {
    read: async () => {
    const lines = [];
    lines.push(`Name:\twasm-process`);
    lines.push(`Pid:\t${pid}`);
    lines.push(`State:\t${proc.alive ? 'R (running)' : 'Z (dead)'}`);
    lines.push(`Args:\t${(proc.args||[]).join(' ')}`);
    return new TextEncoder().encode(lines.join('\n') + '\n');
    }
    });
    }
    }
    }
    
    
    // initial registration
    registerPidEntries();
    // simple poller to keep proc entries up to date
    setInterval(registerPidEntries, 1000);
    }