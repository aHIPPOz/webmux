// kernel/syscalls/poll.js


export function registerPollSyscalls(kernel) {
    kernel.syscalls.poll = async (proc, timeout) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
    };
    }