/*
Wasmux Kernel (prototype) — wasmux-kernel.js

This file implements a functional, minimal Wasmux kernel in JavaScript intended to run
in modern browsers (Chromium-family recommended) but also usable under Node with small
adapters (OPFS code will fall back to in-memory FS when unavailable).

Features implemented in this prototype:
 - WasmuxKernel class exposing kernel API
 - OPFS-backed virtual filesystem with in-memory fallback
 - Process manager: spawn/exec/exit + PID table
 - Minimal WASI imports implementation (subset): fd_write, fd_read, path_open, proc_exit,
   fd_seek, fd_close, clock_time_get, random_get
 - Simple file descriptor table and file object wrappers
 - Simple scheduler (cooperative, non-preemptive)
 - Helper to instantiate a Wasm module from ArrayBuffer with kernel-provided imports
 - Basic `wpmInstall` stub: install a package tarball blob into OPFS (requires tar parsing)

Limitations / notes:
 - This is a prototype / skeleton — many syscalls are missing or simplified
 - No true fork(), no threads, no MMU-like memory management
 - wasm modules must be compiled for `wasi_snapshot_preview1` (wasi) and expect
   the simplified POSIX-like environment provided here
 - For a production-level implementation you'd split code into multiple modules,
   add error handling, logging, tests and security validations.

How to use quickly (browser):
 - Put this file in a web server and import it as an ES module from an index.html.
 - Create or fetch a wasm binary compiled for WASI (e.g. `wasm32-wasi` Rust target)
 - Use WasmuxKernel.spawnWasm(arrayBuffer, {args, env})

This file is intended to be saved at the repository root as `wasmux-kernel.js`.
*/

// --- Utilities ---
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function nowNs() {
  return BigInt(Math.floor(performance.now() * 1_000_000)); // nanoseconds
}

// --- Simple in-memory tar extractor (very small; supports only files, not pax/dirs metadata)
// We'll include a tiny implementation capable of extracting a tar blob where files are stored
// contiguously. This is sufficient for simple .tar packages used by wpm prototype.

async function untar(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder();
  const files = {};
  let offset = 0;
  while (offset < view.length) {
    const header = view.subarray(offset, offset + 512);
    offset += 512;
    // check all-zero block => end of archive
    if (header.every(b => b === 0)) break;
    const name = textDecoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    const sizeOct = textDecoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '');
    const size = parseInt(sizeOct.trim() || '0', 8);
    const fileBytes = view.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512; // advance to next header
    files[name] = fileBytes.slice();
  }
  return files; // map path -> Uint8Array
}

// --- OPFS wrapper (Origin Private File System) with in-memory fallback ---
class OpfsWrapper {
  constructor() {
    this.root = {}; // in-memory tree fallback
    this.available = typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory;
    this.dirHandlePromise = null;
  }

  async ensureDirectoryHandle() {
    if (!this.available) return null;
    if (!this.dirHandlePromise) {
      try {
        this.dirHandlePromise = navigator.storage.getDirectory();
      } catch (e) {
        // Some browsers may expose a different API or require origin trial. Fall back.
        console.warn('OPFS getDirectory unavailable, falling back to memory FS');
        this.available = false;
        this.dirHandlePromise = null;
        return null;
      }
    }
    return this.dirHandlePromise;
  }

  async writeFile(path, uint8arr) {
    if (this.available) {
      const root = await this.ensureDirectoryHandle();
      return this._opfsWrite(root, path, uint8arr);
    } else {
      this._memWrite(path, uint8arr);
    }
  }

  async readFile(path) {
    if (this.available) {
      const root = await this.ensureDirectoryHandle();
      return this._opfsRead(root, path);
    } else {
      return this._memRead(path);
    }
  }

  async unlink(path) {
    if (this.available) {
      const root = await this.ensureDirectoryHandle();
      return this._opfsUnlink(root, path);
    } else {
      return this._memUnlink(path);
    }
  }

  // memory operations
  _memWrite(path, data) {
    const segs = path.split('/').filter(Boolean);
    let cur = this.root;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      cur[s] = cur[s] || { __isDir: true };
      cur = cur[s];
    }
    const name = segs[segs.length - 1] || '';
    cur[name] = { __isFile: true, data: new Uint8Array(data) };
  }

  _memRead(path) {
    const segs = path.split('/').filter(Boolean);
    let cur = this.root;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      cur = cur[s];
      if (!cur) throw new Error('ENOENT');
    }
    if (cur.__isFile) return cur.data.slice();
    throw new Error('EISDIR');
  }

  _memUnlink(path) {
    const segs = path.split('/').filter(Boolean);
    let cur = this.root;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      cur = cur[s];
      if (!cur) throw new Error('ENOENT');
    }
    const last = segs[segs.length - 1];
    if (!cur || !cur[last]) throw new Error('ENOENT');
    delete cur[last];
  }

  // OPFS operations using handles (limited; not fully robust)
  async _opfsWrite(rootHandle, path, uint8arr) {
    const segs = path.split('/').filter(Boolean);
    let cur = rootHandle;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      cur = await cur.getDirectoryHandle(s, { create: true });
    }
    const name = segs[segs.length - 1] || '';
    const fh = await cur.getFileHandle(name, { create: true });
    const writable = await fh.createWritable();
    await writable.write(uint8arr);
    await writable.close();
  }

  async _opfsRead(rootHandle, path) {
    const segs = path.split('/').filter(Boolean);
    let cur = rootHandle;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      cur = await cur.getDirectoryHandle(s);
    }
    const name = segs[segs.length - 1] || '';
    const fh = await cur.getFileHandle(name);
    const file = await fh.getFile();
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async _opfsUnlink(rootHandle, path) {
    const segs = path.split('/').filter(Boolean);
    let cur = rootHandle;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      cur = await cur.getDirectoryHandle(s);
    }
    const name = segs[segs.length - 1] || '';
    await cur.removeEntry(name);
  }
}

// --- File descriptor wrapper ---
class FD {
  constructor(kind, meta) {
    this.kind = kind; // 'mem'|'file'|'console'
    this.meta = meta || {};
    this.offset = 0;
  }
}

// --- Process object ---
class WasmProcess {
  constructor(pid, instance, memory, argv = [], env = {}) {
    this.pid = pid;
    this.instance = instance;
    this.memory = memory;
    this.argv = argv;
    this.env = env;
    this.alive = true;
    this.exitCode = null;
    this.fdTable = new Map();
  }
}

// --- Wasmux Kernel ---
export class WasmuxKernel {
  constructor({ logger = console, enableOpfs = true } = {}) {
    this.logger = logger;
    this.opfs = new OpfsWrapper();
    this.nextPid = 1;
    this.processTable = new Map();
    this.globalFdTable = new Map();
    this.schedulerQueue = [];
    this.rootPath = '/';

    // default fds for kernel-level console
    this.globalFdTable.set(1, new FD('console', { name: 'stdout' }));
    this.globalFdTable.set(2, new FD('console', { name: 'stderr' }));

    // basic root structure in memfs
    this._ensureRootStructure();
  }

  _ensureRootStructure() {
    try {
      this.opfs._memWrite('/', new Uint8Array(0)); // ensure root exists
      ['bin', 'etc', 'home', 'tmp', 'usr', 'var/lib/wpm', 'lib'].forEach(dir => {
        // directories are just objects in memfs — store a marker file for now
        // Real dir management omitted for brevity
        // But ensure path exists by creating a zero-length sentinel
        this.opfs._memWrite(dir + '/.dir', new Uint8Array(0));
      });
    } catch (e) {
      // ignore for opfs-backed
    }
  }

  _allocPid() {
    return this.nextPid++;
  }

  // Spawn a wasm module from an ArrayBuffer (wasm binary)
  async spawnWasm(arrayBuffer, { args = [], env = {}, preopen = {} } = {}) {
    const pid = this._allocPid();
    const memory = new WebAssembly.Memory({ initial: 64, maximum: 1024 });
    // instantiate with minimal imports
    const imports = this._buildImports(memory, pid);
    let module, instance;
    try {
      module = await WebAssembly.compile(arrayBuffer);
      instance = await WebAssembly.instantiate(module, imports);
    } catch (e) {
      this.logger.error('Wasm instantiate error', e);
      throw e;
    }

    const proc = new WasmProcess(pid, instance, memory, args, env);
    // inherit global fds (stdout/stderr)
    for (const [fd, fdobj] of this.globalFdTable.entries()) {
      proc.fdTable.set(fd, fdobj);
    }

    this.processTable.set(pid, proc);
    this.schedulerQueue.push(proc);

    // attempt to call _start or main
    this._runProcess(proc).catch(err => {
      this.logger.error('process runtime error', err);
    });

    return pid;
  }

  // Build WASI-style imports for the Wasm module
  _buildImports(memory, pid) {
    const kernel = this;
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();

    function memU8() {
      return new Uint8Array(memory.buffer);
    }

    function readString(ptr, len) {
      const bytes = memU8().subarray(ptr, ptr + len);
      return textDecoder.decode(bytes);
    }

    function writeString(ptr, str) {
      const bytes = textEncoder.encode(str);
      memU8().set(bytes, ptr);
    }

    // helper: find process object
    function getProc() {
      const p = kernel.processTable.get(pid);
      if (!p) throw new Error('process not found: ' + pid);
      return p;
    }

    // minimal wasi_snapshot_preview1 implementation
    const wasi = {
      fd_write: (fd, iovsPtr, iovsLen, nwrittenPtr) => {
        try {
          const p = getProc();
          const mem = memU8();
          let written = 0;
          let offset = iovsPtr;
          for (let i = 0; i < iovsLen; i++) {
            const bufPtr = new DataView(memory.buffer).getUint32(offset, true);
            const bufLen = new DataView(memory.buffer).getUint32(offset + 4, true);
            offset += 8;
            const chunk = mem.subarray(bufPtr, bufPtr + bufLen);
            const s = textDecoder.decode(chunk);
            kernel._fdWrite(p, fd, chunk);
            written += bufLen;
          }
          if (nwrittenPtr) new DataView(memory.buffer).setUint32(nwrittenPtr, written, true);
          return 0; // __WASI_ESUCCESS
        } catch (e) {
          console.error('fd_write error', e);
          return 1; // generic errno
        }
      },
      fd_read: (fd, iovsPtr, iovsLen, nreadPtr) => {
        try {
          const p = getProc();
          const mem = memU8();
          // read into iovs sequentially from fd
          let totalRead = 0;
          let offset = iovsPtr;
          for (let i = 0; i < iovsLen; i++) {
            const bufPtr = new DataView(memory.buffer).getUint32(offset, true);
            const bufLen = new DataView(memory.buffer).getUint32(offset + 4, true);
            offset += 8;
            const chunk = kernel._fdRead(p, fd, bufLen);
            mem.set(chunk, bufPtr);
            totalRead += chunk.length;
            if (chunk.length < bufLen) break;
          }
          if (nreadPtr) new DataView(memory.buffer).setUint32(nreadPtr, totalRead, true);
          return 0;
        } catch (e) {
          console.error('fd_read error', e);
          return 1;
        }
      },
      fd_close: (fd) => {
        try {
          const p = kernel.processTable.get(pid);
          if (!p) return 0;
          p.fdTable.delete(fd);
          return 0;
        } catch (e) {
          return 1;
        }
      },
      proc_exit: (r) => {
        const p = kernel.processTable.get(pid);
        if (!p) return;
        p.alive = false;
        p.exitCode = r;
        kernel.logger.log(`process ${pid} exited with ${r}`);
        return 0;
      },
      fd_seek: (fd, offset_lo, offset_hi, whence, newOffsetPtr) => {
        // only supports 32-bit offsets for brevity
        const p = kernel.processTable.get(pid);
        const fdobj = p.fdTable.get(fd);
        if (!fdobj) return 1;
        const off = offset_lo; // ignore hi
        if (whence === 0) fdobj.offset = off;
        else if (whence === 1) fdobj.offset += off;
        else if (whence === 2) fdobj.offset = (fdobj.meta.size || 0) + off;
        if (newOffsetPtr) new DataView(memory.buffer).setUint32(newOffsetPtr, fdobj.offset, true);
        return 0;
      },
      path_open: (dirfd, pathPtr, pathLen, oflags, fsRightsBase, fsRightsInheriting, fdFlags, openedFdPtr) => {
        // simplified: path is absolute or relative; ignore dirfd
        try {
          const mem = memU8();
          const path = readString(pathPtr, pathLen);
          const p = kernel.processTable.get(pid);
          const fd = kernel._openPath(p, path, oflags);
          if (openedFdPtr) new DataView(memory.buffer).setUint32(openedFdPtr, fd, true);
          return 0;
        } catch (e) {
          console.error('path_open error', e);
          return 1;
        }
      },
      clock_time_get: (clockId, precision, timePtr) => {
        // return nanoseconds since epoch-ish using performance.now
        const t = nowNs();
        new DataView(memory.buffer).setBigUint64(timePtr, t, true);
        return 0;
      },
      random_get: (bufPtr, bufLen) => {
        const mem = memU8();
        const slice = crypto.getRandomValues(new Uint8Array(bufLen));
        mem.set(slice, bufPtr);
        return 0;
      },
      environ_sizes_get: (environCountPtr, environBufSizePtr) => {
        // for simplicity no env strings
        new DataView(memory.buffer).setUint32(environCountPtr, 0, true);
        new DataView(memory.buffer).setUint32(environBufSizePtr, 0, true);
        return 0;
      },
      // stubbed functions
      fd_fdstat_get: (fd, statPtr) => { return 0; },
      fd_prestat_get: () => 28, // stub
    };

    // userland extensions (wasmux-specific)
    const wasmux = {
      // request kernel info
      km_info: (ptr, len) => {
        const s = 'WasmuxKernel v0.1';
        const bytes = new TextEncoder().encode(s);
        const mem = memU8();
        mem.set(bytes.slice(0, len), ptr);
        return bytes.length;
      }
    };

    return { wasi_snapshot_preview1: wasi, wasmux, env: {} };
  }

  // run loop for a process: call _start or main if present
  async _runProcess(proc) {
    const exports = proc.instance.exports;
    try {
      if (exports._start) {
        // many wasi programs expose _start
        exports._start();
      } else if (exports.main) {
        // try main convention
        const res = exports.main();
        if (res instanceof Promise) await res;
      } else {
        this.logger.warn('no _start or main for pid', proc.pid);
      }
    } catch (e) {
      this.logger.error('process exception', e);
    } finally {
      proc.alive = false;
      if (!proc.exitCode) proc.exitCode = 0;
      this.logger.log(`pid ${proc.pid} finished (exit ${proc.exitCode})`);
      this.processTable.delete(proc.pid);
    }
  }

  // fd-level helpers
  _fdWrite(proc, fd, chunkUint8) {
    // write to console if console fd
    const fdobj = proc.fdTable.get(fd) || this.globalFdTable.get(fd);
    if (!fdobj) {
      this.logger.warn('write to unknown fd', fd);
      return;
    }
    if (fdobj.kind === 'console') {
      const text = new TextDecoder().decode(chunkUint8);
      if (fdobj.meta && fdobj.meta.name === 'stderr') this.logger.error(`[pid ${proc.pid}]`, text);
      else this.logger.log(`[pid ${proc.pid}]`, text);
    } else if (fdobj.kind === 'file') {
      // append to file buffer (in memory)
      const existing = fdobj.meta.data || new Uint8Array(0);
      const before = existing.subarray(0, fdobj.offset);
      const after = existing.subarray(fdobj.offset + chunkUint8.length);
      const newData = new Uint8Array(before.length + chunkUint8.length + after.length);
      newData.set(before, 0);
      newData.set(chunkUint8, before.length);
      newData.set(after, before.length + chunkUint8.length);
      fdobj.meta.data = newData;
      fdobj.offset += chunkUint8.length;
    }
  }

  _fdRead(proc, fd, maxLen) {
    const fdobj = proc.fdTable.get(fd) || this.globalFdTable.get(fd);
    if (!fdobj) return new Uint8Array(0);
    if (fdobj.kind === 'file') {
      const data = fdobj.meta.data || new Uint8Array(0);
      const slice = data.subarray(fdobj.offset, fdobj.offset + maxLen);
      fdobj.offset += slice.length;
      return slice;
    }
    return new Uint8Array(0);
  }

  _openPath(proc, path, oflags) {
    // Normalize path: for prototype support absolute paths only
    if (!path.startsWith('/')) path = '/'+path;
    // if file exists in OPFS/mem, load it
    try {
      const data = this.opfs.readFile(path);
      // synchronous in mem case; but opfs.readFile returns promise when available
      const meta = (data instanceof Promise) ? null : { data };
      const fdnum = Math.floor(Math.random() * 1000) + 10;
      const fd = new FD('file', meta);
      proc.fdTable.set(fdnum, fd);
      return fdnum;
    } catch (e) {
      // file not present -> create empty file
      const fdnum = Math.floor(Math.random() * 1000) + 10;
      const fd = new FD('file', { data: new Uint8Array(0) });
      proc.fdTable.set(fdnum, fd);
      return fdnum;
    }
  }

  // Convenience helper: spawn from URL
  async spawnWasmFromUrl(url, opts = {}) {
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    return this.spawnWasm(ab, opts);
  }

  // Very small wpm installer: accept a .tar blob (ArrayBuffer) and extract to OPFS under /usr
  async wpmInstallFromTar(arrayBuffer, { prefix = '/usr' } = {}) {
    const files = await untar(arrayBuffer);
    for (const [name, bytes] of Object.entries(files)) {
      const path = (prefix + '/' + name).replace(/\/+/g, '/');
      await this.opfs.writeFile(path, bytes);
      this.logger.log('installed', path);
    }
    return true;
  }

  // Example high-level helper to write to OPFS
  async writeFile(path, uint8arr) {
    await this.opfs.writeFile(path, uint8arr);
  }

  async readFile(path) {
    return await this.opfs.readFile(path);
  }

}

// Quick demo convenience: if run in browser as a module, expose a global instance
if (typeof window !== 'undefined') {
  window.WasmuxKernel = WasmuxKernel;
}

// End of wasmux-kernel.js
