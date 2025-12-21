// kernel/syscalls/process.js


export function registerProcessSyscalls(kernel) {
    kernel.syscalls.exit = (proc, code) => {
    proc.state = 'ZOMBIE';
    proc.exitCode = code;
    kernel.processTable.delete(proc.pid);
    };
    
    
    kernel.syscalls.exec = async (proc, path, argv) => {
    const data = await kernel.vfs.readFile(path);
    kernel.spawnWasmBinary(data, { args: argv });
    kernel.syscalls.exit(proc, 0);
    };
    
    
    kernel.syscalls.fork = (proc) => {
    throw new Error('fork not supported — use exec');
    };
    }