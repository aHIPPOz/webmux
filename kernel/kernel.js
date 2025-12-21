// kernel/kernel.js — Wasmux Kernel core (minimal prototype)
// Responsibilities:
//  - initialize OPFS or memory fs
//  - mount rootfs (if absent, download and extract)
//  - provide vfs helper methods
//  - simple WASM loader helpers: spawnWasmBinary, spawnFromVFS
//  - very small scheduler run() to keep alive processes

import { untar } from './utils/untar.js'; // optional: if you factor utils; fallback included later
import { registerNetDevice } from './devices/netcard.js';
import { registerNetSyscalls } from './syscalls/net.js';

// minimal in-file untar (fallback) — simple implementation
async function tinyUntar(arrayBuffer) {
  // Very small tar reader supporting basic pax/ustar simple files.
  const view = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder();
  const files = {};
  let offset = 0;
  while (offset + 512 <= view.length) {
    const header = view.subarray(offset, offset + 512);
    offset += 512;
    if (header.every(b => b === 0)) break;
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    const sizeOct = decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOct || '0', 8);
    const fileData = view.subarray(offset, offset + size).slice();
    files[name] = fileData;
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

// Simple OPFS/memory wrapper
class TinyVFS {
  constructor() {
    this.mem = { '/': {} };
    this.opfsAvailable = !!(typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory);
    this.dirHandlePromise = null;
  }

  async ensureDirHandle() {
    if (!this.opfsAvailable) return null;
    if (!this.dirHandlePromise) {
      this.dirHandlePromise = navigator.storage.getDirectory();
    }
    return this.dirHandlePromise;
  }

  async write(path, uint8arr) {
    if (this.opfsAvailable) {
      const root = await this.ensureDirHandle();
      return this._opfsWrite(root, path, uint8arr);
    } else {
      this._memWrite(path, uint8arr);
    }
  }

  async read(path) {
    if (this.opfsAvailable) {
      const root = await this.ensureDirHandle();
      return this._opfsRead(root, path);
    } else {
      return this._memRead(path);
    }
  }

  async exists(path) {
    try {
      const v = await this.read(path);
      return !!v;
    } catch (e) {
      return false;
    }
  }

  // memory helpers
  _memWrite(path, data) {
    this.mem[path] = new Uint8Array(data);
  }
  _memRead(path) {
    const v = this.mem[path];
    if (!v) throw new Error('ENOENT');
    return v.slice();
  }

  // very small OPFS helpers
  async _opfsWrite(rootHandle, path, uint8arr) {
    const segs = path.split('/').filter(Boolean);
    let cur = rootHandle;
    for (let i = 0; i < segs.length - 1; i++) cur = await cur.getDirectoryHandle(segs[i], { create: true });
    const name = segs[segs.length - 1] || '';
    const fh = await cur.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(uint8arr);
    await w.close();
  }

  async _opfsRead(rootHandle, path) {
    const segs = path.split('/').filter(Boolean);
    let cur = rootHandle;
    for (let i = 0; i < segs.length - 1; i++) cur = await cur.getDirectoryHandle(segs[i]);
    const name = segs[segs.length - 1] || '';
    const fh = await cur.getFileHandle(name);
    const file = await fh.getFile();
    const ab = await file.arrayBuffer();
    return new Uint8Array(ab);
  }
}

export class Kernel {
  constructor(bootInfo = {}) {
    this.bootInfo = bootInfo;
    this.vfs = new TinyVFS();
    this.processTable = new Map();
    this.nextPid = 1;
    this.schedulerRunning = false;

    // small embedded wasm hello binary (optional) as fallback — left null here
    this.builtinHello = null;
  }

  async initialize() {
    console.log('Kernel.initialize: bootInfo', this.bootInfo);
    // Ensure OPFS/virtual FS and root paths exist
    // If rootfs missing, download and extract
    const rootExists = await this.vfs.exists('/.rootfs_marker');
    if (!rootExists) {
      console.log('No rootfs detected in OPFS — attempting download');
      if (!this.bootInfo.rootfsDownloadUrl) {
        console.warn('No rootfs download URL configured');
        return;
      }
      await this.downloadAndInstallRootfs(this.bootInfo.rootfsDownloadUrl);
    } else {
      console.log('Rootfs present — ok');
    }
    // create + register net device and expose network on kernel
try {
  // preferred: register via registry if available
  if (this.devices && typeof this.devices.register === 'function') {
  const netDev = await registerNetDevice(this.devices);
  this.netDevice = netDev;
  // expose convenient references
  this.loopbackNet = netDev.getNetwork();
  } else {
  // fallback: create and attach
  const netDev = await registerNetDevice(null);
  this.netDevice = netDev;
  this.loopbackNet = netDev.getNetwork();
  }
  // register syscalls that use kernel.loopbackNet
  registerNetSyscalls(this);
  console.log('Net device + syscalls registered');
  } catch (e) {
  console.warn('Failed to init net device:', e);
  }
  }

  async downloadAndInstallRootfs(url) {
    console.log('Downloading rootfs from', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to download rootfs: ' + res.status);
    const ab = await res.arrayBuffer();
    const files = await tinyUntar(ab);
    // write files into OPFS under '/'
    for (const [path, data] of Object.entries(files)) {
      const cleanPath = '/' + path.replace(/^\/+/, '');
      console.log('Installing', cleanPath);
      await this.vfs.write(cleanPath, data);
    }
    // place marker
    await this.vfs.write('/.rootfs_marker', new TextEncoder().encode('wasmux-rootfs'));
    console.log('Rootfs install complete');
  }

  _allocPid() { return this.nextPid++; }

  // spawn a wasm binary given an ArrayBuffer (wasm) — minimal runtime
  async spawnWasmBinary(wasmArrayBuffer, { args = [], env = {} } = {}) {
    const pid = this._allocPid();
    console.log('spawnWasmBinary pid=', pid);
    const memory = new WebAssembly.Memory({ initial: 64 });

    const imports = this._buildMinimalWasiImports(memory, pid);
    const module = await WebAssembly.compile(wasmArrayBuffer);
    const instance = await WebAssembly.instantiate(module, imports);

    const proc = { pid, instance, memory, args, env, alive: true };
    this.processTable.set(pid, proc);

    // run _start if present
    try {
      if (instance.exports && instance.exports._start) instance.exports._start();
      else if (instance.exports && instance.exports.main) instance.exports.main();
    } catch (e) {
      console.error('WASM process runtime error', e);
    }

    proc.alive = false;
    return pid;
  }

  async spawnFromVFS(vfsPath, args = []) {
    console.log('spawnFromVFS', vfsPath);
    const data = await this.vfs.read(vfsPath);
    return this.spawnWasmBinary(data, { args });
  }

  _buildMinimalWasiImports(memory, pid) {
    const kernel = this;
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    function memU8() { return new Uint8Array(memory.buffer); }

    const wasi = {
      fd_write: (fd, iovsPtr, iovsLen, nwrittenPtr) => {
        // extremely small implementation: read iovs and log
        try {
          const mem = memU8();
          const dv = new DataView(memory.buffer);
          let total = 0;
          let off = iovsPtr;
          for (let i = 0; i < iovsLen; i++) {
            const buf = dv.getUint32(off, true); const len = dv.getUint32(off+4, true); off += 8;
            const s = textDecoder.decode(mem.subarray(buf, buf+len));
            console.log(`[pid ${pid}]`, s);
            total += len;
          }
          if (nwrittenPtr) dv.setUint32(nwrittenPtr, total, true);
          return 0;
        } catch (e) { return 1; }
      },
      proc_exit: (r) => { console.log(`proc ${pid} exit ${r}`); return 0; },
      fd_read: () => 1,
      fd_close: () => 0,
      clock_time_get: (clockId, prec, tp) => { if (tp) new DataView(memory.buffer).setBigUint64(tp, BigInt(Math.floor(performance.now()*1e6)), true); return 0; }
    };

    return { wasi_snapshot_preview1: wasi, env: {} };
  }

  // very small run loop: check processes and keep alive
  run() {
    if (this.schedulerRunning) return;
    this.schedulerRunning = true;
    const tick = () => {
      // remove dead processes
      for (const [pid, proc] of Array.from(this.processTable)) {
        if (!proc.alive) this.processTable.delete(pid);
      }
      // schedule again
      if (this.processTable.size === 0) {
        console.log('No processes running — kernel idle');
        this.schedulerRunning = false;
        return;
      }
      setTimeout(tick, 100); // cooperative tick
    };
    tick();
    this.syscalls = {};
    registerFsSyscalls(this);
    registerProcessSyscalls(this);
    registerTimeSyscalls(this);
    registerSignalSyscalls(this);
    registerPollSyscalls(this);
  }
}