// kernel/syscalls/signal.js


export function registerSignalSyscalls(kernel) {
    kernel.syscalls.kill = (proc, pid, sig) => {
    const target = kernel.processTable.get(pid);
    if (!target) throw new Error('ESRCH');
    target.pendingSignals.push(sig);
    };
    }