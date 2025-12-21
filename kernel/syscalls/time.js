// kernel/syscalls/time.js


export function registerTimeSyscalls(kernel) {
    kernel.syscalls.clock_gettime = () => {
    return BigInt(Math.floor(performance.now() * 1e6));
    };
    
    
    kernel.syscalls.sleep = async (ms) => {
    return new Promise(r => setTimeout(r, ms));
    };
    }