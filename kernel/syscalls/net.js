// kernel/syscalls/net.js
// Minimal socket-like syscalls mapped to the Loopback sockets created by NetDevice


export function registerNetSyscalls(kernel) {
    // ensure kernel.syscalls exists
    kernel.syscalls = kernel.syscalls || {};
    
    
    // Create a socket and return fd
    kernel.syscalls.socket = (proc, domain = 0, type = 1, protocol = 0) => {
    const fd = proc.nextFd++;
    // create underlying loopback socket
    const sock = (kernel.loopbackNet || kernel.loopback?.network)?.createSocket();
    if (!sock) throw new Error('ENETUNREACH: no network device');
    // attach a recv queue so recvfrom can be non-blocking
    sock._recvQueue = [];
    sock.onmessage = (from, uint8arr) => sock._recvQueue.push({ from, data: uint8arr });
    
    
    proc.fdTable.set(fd, { kind: 'net', sock });
    return fd;
    };
    
    
    // bind a socket to an address string (e.g. ':4000' or 'localhost:4000')
    kernel.syscalls.bind = async (proc, fd, addr) => {
    const entry = proc.fdTable.get(fd);
    if (!entry || entry.kind !== 'net') throw new Error('EBADF');
    await entry.sock.bind(addr);
    return 0;
    };
    
    
    // sendto: send a datagram to addr, buffer is Uint8Array or ArrayBuffer
    kernel.syscalls.sendto = async (proc, fd, addr, buffer) => {
    const entry = proc.fdTable.get(fd);
    if (!entry || entry.kind !== 'net') throw new Error('EBADF');
    // ensure buffer is Uint8Array
    const data = (buffer instanceof Uint8Array) ? buffer : new Uint8Array(buffer);
    const sent = await entry.sock.send(addr, data);
    return sent; // number of recipients
    };
    
    
    // recvfrom: non-blocking read, returns null if no packet available; returns {from, data}
    kernel.syscalls.recvfrom = async (proc, fd, maxlen = 65536) => {
    const entry = proc.fdTable.get(fd);
    if (!entry || entry.kind !== 'net') throw new Error('EBADF');
    const q = entry.sock._recvQueue || [];
    if (q.length === 0) return null;
    const pkt = q.shift();
    // trim to maxlen
    const data = pkt.data.subarray(0, Math.min(pkt.data.length, maxlen));
    return { from: pkt.from, data };
    };
    
    
    kernel.syscalls.closeSocket = async (proc, fd) => {
    const entry = proc.fdTable.get(fd);
    if (!entry) return 0;
    if (entry.kind === 'net') await entry.sock.close();
    proc.fdTable.delete(fd);
    return 0;
    };
    }