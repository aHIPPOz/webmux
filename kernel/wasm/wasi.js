// kernel/wasm/wasi.js
// Minimal WASI imports provider that maps to kernel.syscalls / kernel devices.
// NOTE: WebAssembly imports are synchronous; many kernel backends (OPFS) are async.
// For a resilient runtime you should compile/run programs that only rely on sync operations
// we expose here (primarily fd_write). Path ops are best-effort and may return errors when
// underlying backend is async.

import { readString, getUint8Memory } from './memory.js';

export function createWASIImports(kernel, proc) {
    const memory = proc.memory || (proc.instance && proc.instance.exports && proc.instance.exports.memory) || new WebAssembly.Memory({ initial: 64 });
    const memU8 = () => new Uint8Array(memory.buffer);
    const dv = () => new DataView(memory.buffer);

    function readIovs(iovsPtr, iovsLen) {
        const u8 = memU8();
        const view = dv();
        const parts = [];
        let off = iovsPtr;
        for (let i = 0; i < iovsLen; i++) {
            const buf = view.getUint32(off, true);
            const len = view.getUint32(off + 4, true);
            off += 8;
            parts.push(u8.subarray(buf, buf + len));
        }
        return parts;
    }

    function writeNwritten(nwPtr, n) {
        if (!nwPtr) return;
        dv().setUint32(nwPtr, n, true);
    }

    // fd_write: write one or more iovecs to fd
    function fd_write(fd, iovsPtr, iovsLen, nwrittenPtr) {
        try {
            const parts = readIovs(iovsPtr, iovsLen);
            let total = 0;
            for (const chunk of parts) {
                // if stdout/stderr, route to console device
                if (fd === 1 || fd === 2) {
                    const str = new TextDecoder().decode(chunk);
                    const consoleDev = kernel.devices?.get('/dev/console');
                    if (consoleDev && consoleDev.write) consoleDev.write(str);
                    else console.log(`[pid ${proc.pid}] ${str}`);
                    total += chunk.length;
                } else {
                    // for other fds attempt to use kernel.syscalls.write (may be async in backend)
                    const fdObj = proc.fdTable.get(fd);
                    if (!fdObj) {
                        // try kernel-level fd write (global fds)
                        kernel.logger?.warn && kernel.logger.warn('fd_write unknown fd', fd);
                        continue;
                    }
                    if (fdObj.kind === 'file') {
                        // write into fdObj.meta.data (in-memory)
                        const meta = fdObj.meta || {};
                        const old = meta.data || new Uint8Array(0);
                        const before = old.subarray(0, fdObj.offset);
                        const after = old.subarray(fdObj.offset + chunk.length);
                        const out = new Uint8Array(before.length + chunk.length + after.length);
                        out.set(before, 0);
                        out.set(chunk, before.length);
                        out.set(after, before.length + chunk.length);
                        meta.data = out;
                        fdObj.meta = meta;
                        fdObj.offset += chunk.length;
                        total += chunk.length;
                    } else {
                        // unknown fd kinds: log
                        kernel.logger?.warn && kernel.logger.warn('fd_write unknown kind', fdObj.kind);
                    }
                }
            }
            writeNwritten(nwrittenPtr, total);
            return 0; // __WASI_ESUCCESS
        } catch (e) {
            console.error('wasi fd_write error', e);
            return 1; // generic errno
        }
    }


    function proc_exit(r) {
        try {
            kernel.syscalls && kernel.syscalls.exit && kernel.syscalls.exit(proc, r);
        } catch (e) { /* ignore */ }
    }

    function fd_close(fd) {
        try {
            kernel.syscalls && kernel.syscalls.close && kernel.syscalls.close(proc, fd);
        } catch (e) { /* ignore */ }
    return 0;
    }

    function fd_read(fd, iovsPtr, iovsLen, nreadPtr) {
        try {
            // very small implementation: only supports reads from file-like fd where meta.data exists
            const fdObj = proc.fdTable.get(fd);
            if (!fdObj || fdObj.kind !== 'file') { writeNwritten(nreadPtr, 0); return 1; }
            const u8 = memU8();
            const parts = [];
            let off = iovsPtr;
            let total = 0;
            for (let i = 0; i < iovsLen; i++) {
                const buf = dv().getUint32(off, true);
                const len = dv().getUint32(off + 4, true);
                off += 8;
                const data = fdObj.meta.data || new Uint8Array(0);
                const slice = data.subarray(fdObj.offset, fdObj.offset + len);
                u8.set(slice, buf);
                fdObj.offset += slice.length;
                total += slice.length;
                if (slice.length < len) break;
            }
            writeNwritten(nreadPtr, total);
            return 0;
        } catch (e) {
            console.error('wasi fd_read error', e);
            return 1;
        }
    }

    function clock_time_get(clockId, precision, timePtr) {
        try {
            const ns = BigInt(Math.floor(performance.now() * 1_000_000));
            // wasi expects 64-bit
            dv().setBigUint64(timePtr, ns, true);
            return 0;
        } catch (e) {
            return 1;
        }
    }
        
        
    function random_get(bufPtr, bufLen) {
        try {
            const u8 = memU8();
            const slice = u8.subarray(bufPtr, bufPtr + bufLen);
            crypto.getRandomValues(slice);
            return 0;
        } catch (e) {
            return 1;
        }
    }

    function environ_sizes_get(environCountPtr, environBufSizePtr) {
        try {
            dv().setUint32(environCountPtr, 0, true);
            dv().setUint32(environBufSizePtr, 0, true);
            return 0;
        } catch (e) { return 1; }
    }

    // path_open: best-effort. If backend is async (OPFS) this will likely fail.
    function path_open(dirfd, pathPtr, pathLen, oflags, fsRightsBase, fsRightsInheriting, fdFlags, openedFdPtr) {
        try {
            const path = readString(memory, pathPtr, pathLen);
            // only support absolute paths in this prototype
            const abs = path.startsWith('/') ? path : '/' + path;
            // attempt synchronous read from vfs: only works if backend is in-memory
            const vfs = kernel.vfs;
            if (!vfs) return 1;
            // if backend is async, bail with ENOSYS
            if (vfs.backend && vfs.backend.opfsSupported) {
                // OPFS is async; we can't block here — return ENOSYS for now
                return 52; // ENOSYS
            }
            const data = vfs.readFile(abs); // mem backend returns Uint8Array synchronously (in our TinyVFS it's sync)
            const fd = proc.nextFd++;
            proc.fdTable.set(fd, { kind: 'file', meta: { data }, offset: 0, path: abs });
            if (openedFdPtr) dv().setUint32(openedFdPtr, fd, true);
            return 0;
        } catch (e) {
            console.error('wasi path_open error', e);
            return 1;
        }
    }

    const wasi_imports = {
        fd_write,
        fd_read,
        fd_close,
        proc_exit,
        clock_time_get,
        random_get,
        environ_sizes_get,
        path_open
    };

    return { wasi_snapshot_preview1: wasi_imports };
}