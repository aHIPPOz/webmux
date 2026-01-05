// kernel/kernel.js — Wasmux Kernel CORE AMÉLIORÉ
// Responsabilités:
//  - initialize OPFS or memory fs
//  - mount rootfs (si absent, télécharger et extraire)
//  - provide vfs helper methods
//  - WASM loader helpers: spawnWasmBinary, spawnFromVFS
//  - scheduler run() pour garder les processus vivants

import { registerNetDevice } from './devices/netcard.js';
import { registerNetSyscalls } from './syscalls/net.js';
import { initializeRootfs } from './rootfs/index.js';

// Minimal in-file untar (fallback implementation)
async function tinyUntar(arrayBuffer) {
  console.log('[tinyUntar] Extracting tar archive...');
  const view = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder();
  const files = {};
  let offset = 0;
  let fileCount = 0;
  
  while (offset + 512 <= view.length) {
    const header = view.subarray(offset, offset + 512);
    offset += 512;
    if (header.every(b => b === 0)) break;
    
    try {
      const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
      const sizeOct = decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim();
      const size = parseInt(sizeOct || '0', 8);
      const fileData = view.subarray(offset, offset + size).slice();
      files[name] = fileData;
      fileCount++;
      offset += Math.ceil(size / 512) * 512;
    } catch (e) {
      console.warn('[tinyUntar] Error reading tar entry:', e.message);
    }
  }
  
  console.log(`[tinyUntar] Extracted ${fileCount} files`);
  return files;
}

// Simple OPFS/memory VFS wrapper
class TinyVFS {
  constructor() {
    console.log('[TinyVFS] Initializing...');
    this.mem = { '/': {} };
    this.opfsAvailable = !!(typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory);
    this.dirHandlePromise = null;
    console.log(`[TinyVFS] OPFS available: ${this.opfsAvailable}`);
  }

  async ensureDirHandle() {
    if (!this.opfsAvailable) return null;
    if (!this.dirHandlePromise) {
      try {
        this.dirHandlePromise = navigator.storage.getDirectory();
      } catch (e) {
        console.warn('[TinyVFS] Failed to get OPFS root:', e.message);
        return null;
      }
    }
    return this.dirHandlePromise;
  }

  async write(path, uint8arr) {
    try {
      if (this.opfsAvailable) {
        const root = await this.ensureDirHandle();
        if (root) {
          return await this._opfsWrite(root, path, uint8arr);
        }
      }
      // Fallback to memory
      this._memWrite(path, uint8arr);
    } catch (e) {
      console.warn(`[TinyVFS] Write failed for ${path}:`, e.message);
      this._memWrite(path, uint8arr);
    }
  }

  async read(path) {
    try {
      if (this.opfsAvailable) {
        const root = await this.ensureDirHandle();
        if (root) {
          return await this._opfsRead(root, path);
        }
      }
      return this._memRead(path);
    } catch (e) {
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

  async readdir(path) {
    console.log(`[TinyVFS] readdir ${path}`);
    try {
      if (this.opfsAvailable) {
        const root = await this.ensureDirHandle();
        if (root) {
          return await this._opfsReaddir(root, path);
        }
      }
      return this._memReaddir(path);
    } catch (e) {
      console.warn(`[TinyVFS] readdir failed:`, e.message);
      return [];
    }
  }

  // Memory filesystem helpers
  _memWrite(path, data) {
    this.mem[path] = new Uint8Array(data);
    console.log(`[TinyVFS:mem] Wrote ${path} (${data.length} bytes)`);
  }

  _memRead(path) {
    const v = this.mem[path];
    if (!v) throw new Error('ENOENT');
    return v.slice();
  }

  _memReaddir(path) {
    const entries = Object.keys(this.mem).filter(k => k.startsWith(path) && k.length > path.length);
    return [...new Set(entries.map(k => k.substring(path.length).split('/')[1]))].filter(Boolean);
  }

  // OPFS helpers
  async _opfsWrite(rootHandle, path, uint8arr) {
    try {
      const segs = path.split('/').filter(Boolean);
      let cur = rootHandle;
      for (let i = 0; i < segs.length - 1; i++) {
        try {
          cur = await cur.getDirectoryHandle(segs[i], { create: true });
        } catch (e) {
          console.warn(`[TinyVFS:opfs] Failed to create dir ${segs[i]}:`, e.message);
          throw e;
        }
      }
      const name = segs[segs.length - 1] || '';
      const fh = await cur.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(uint8arr);
      await w.close();
      console.log(`[TinyVFS:opfs] Wrote ${path} (${uint8arr.length} bytes)`);
    } catch (e) {
      console.error(`[TinyVFS:opfs] Write failed for ${path}:`, e.message);
      throw e;
    }
  }

  async _opfsRead(rootHandle, path) {
    try {
      const segs = path.split('/').filter(Boolean);
      let cur = rootHandle;
      for (let i = 0; i < segs.length - 1; i++) {
        cur = await cur.getDirectoryHandle(segs[i]);
      }
      const name = segs[segs.length - 1] || '';
      const fh = await cur.getFileHandle(name);
      const file = await fh.getFile();
      const ab = await file.arrayBuffer();
      console.log(`[TinyVFS:opfs] Read ${path} (${ab.byteLength} bytes)`);
      return new Uint8Array(ab);
    } catch (e) {
      console.warn(`[TinyVFS:opfs] Read failed for ${path}:`, e.message);
      throw e;
    }
  }

  async _opfsReaddir(rootHandle, path) {
    try {
      const segs = path.split('/').filter(Boolean);
      let cur = rootHandle;
      for (let i = 0; i < segs.length; i++) {
        cur = await cur.getDirectoryHandle(segs[i]);
      }
      const entries = [];
      for await (const entry of cur.values()) {
        entries.push(entry.name);
      }
      return entries;
    } catch (e) {
      console.warn(`[TinyVFS:opfs] readdir failed for ${path}:`, e.message);
      return [];
    }
  }
}

export class Kernel {
  constructor(bootInfo = {}) {
    console.log('[Kernel] Constructor called');
    this.bootInfo = bootInfo;
    this.vfs = new TinyVFS();
    this.processTable = new Map();
    this.nextPid = 1;
    this.schedulerRunning = false;
    this.syscalls = {};
    this.devices = null;
    this.netDevice = null;
    this.loopbackNet = null;
    this.logs = [];
  }

  async initialize() {
    console.log('[Kernel] Initialisation START');
    const startTime = performance.now();

    try {
      // Phase 1: Initialize RootFS Manager
      console.log('[Kernel] Phase 1: Initializing RootFS Manager...');
      try {
        const rootfsResult = await initializeRootfs(this);
        const bootCommand = rootfsResult.bootCommand;
        console.log(`[Kernel] RootFS initialized ✓ (boot command: ${bootCommand})`);
        this.bootCommand = bootCommand;
      } catch (e) {
        console.warn('[Kernel] RootFS initialization warning:', e.message);
        // Continue with fallback if RootFS init fails
      }

      // Phase 2: RootFS already initialized by RootfsManager
      console.log('[Kernel] Phase 2: RootFS loaded via RootfsManager ✓');

      // Phase 3: Initialize devices
      console.log('[Kernel] Phase 3: Initializing devices...');
      try {
        const { initDevices } = await import('./devices/main.js');
        this.devices = await initDevices(this);
        const deviceList = this.devices.list();
        console.log(`[Kernel] Devices initialized: ${deviceList.length} devices`);
        console.log(`[Kernel] Devices: ${deviceList.join(', ')}`);
      } catch (e) {
        console.error('[Kernel] Device initialization failed:', e.message);
        throw new Error(`Device init failed: ${e.message}`);
      }

      // Phase 4: Initialize network
      console.log('[Kernel] Phase 4: Initializing network...');
      try {
        const netDev = await registerNetDevice(this.devices);
        this.netDevice = netDev;
        this.loopbackNet = netDev.getNetwork();
        registerNetSyscalls(this);
        console.log('[Kernel] Network initialized ✓');
      } catch (e) {
        console.warn('[Kernel] Network init non-fatal error:', e.message);
      }

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`[Kernel] Initialisation COMPLETE (${duration}ms) ✓`);

    } catch (e) {
      console.error('[Kernel] INITIALIZATION FAILED:', e.message);
      console.error('[Kernel] Stack:', e.stack);
      throw e;
    }
  }

  async mountProcFS() {
    console.log('[Kernel] Mounting /proc filesystem...');
    try {
      const { registerProcFS } = await import('./fs/procfs.js');
      registerProcFS(this);
      console.log('[Kernel] /proc mounted ✓');
    } catch (e) {
      console.warn('[Kernel] /proc mount failed:', e.message);
    }
  }

  async downloadAndInstallRootfs(url) {
    console.log(`[Kernel] Downloading rootfs from: ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const ab = await res.arrayBuffer();
      console.log(`[Kernel] Downloaded ${ab.byteLength} bytes, extracting...`);
      
      const files = await tinyUntar(ab);
      
      console.log(`[Kernel] Installing ${Object.keys(files).length} files...`);
      let installed = 0;
      for (const [path, data] of Object.entries(files)) {
        const cleanPath = '/' + path.replace(/^\/+/, '');
        try {
          await this.vfs.write(cleanPath, data);
          installed++;
        } catch (e) {
          console.warn(`[Kernel] Failed to install ${cleanPath}:`, e.message);
        }
      }
      
      // Place marker
      await this.vfs.write('/.rootfs_marker', new TextEncoder().encode('wasmux-rootfs'));
      console.log(`[Kernel] Rootfs installation complete: ${installed}/${Object.keys(files).length} files ✓`);
      
    } catch (e) {
      console.error('[Kernel] Rootfs download failed:', e.message);
      throw new Error(`Rootfs install failed: ${e.message}`);
    }
  }

  _allocPid() {
    return this.nextPid++;
  }

  // Spawn WASM binary from ArrayBuffer
  async spawnWasmBinary(wasmArrayBuffer, { args = [], env = {} } = {}) {
    const pid = this._allocPid();
    console.log(`[Kernel] Spawning WASM binary: PID ${pid}`);
    
    try {
      const memory = new WebAssembly.Memory({ initial: 64, maximum: 256 });
      const imports = this._buildWasiImports(memory, pid);
      
      console.log(`[Kernel] Compiling WASM module (${wasmArrayBuffer.byteLength} bytes)...`);
      const module = await WebAssembly.compile(wasmArrayBuffer);
      
      console.log(`[Kernel] Instantiating WASM module...`);
      const instance = await WebAssembly.instantiate(module, imports);

      const proc = { 
        pid, 
        instance, 
        memory, 
        args, 
        env, 
        alive: true,
        state: 'RUNNING'
      };
      this.processTable.set(pid, proc);
      console.log(`[Kernel] Process ${pid} added to process table ✓`);

      // Run _start or main
      try {
        if (instance.exports && instance.exports._start) {
          console.log(`[Kernel] Calling _start for PID ${pid}...`);
          instance.exports._start();
        } else if (instance.exports && instance.exports.main) {
          console.log(`[Kernel] Calling main for PID ${pid}...`);
          instance.exports.main();
        } else {
          console.warn(`[Kernel] No _start or main export found for PID ${pid}`);
        }
      } catch (e) {
        console.error(`[Kernel] WASM runtime error for PID ${pid}:`, e.message);
      }

      proc.alive = false;
      proc.state = 'ZOMBIE';
      console.log(`[Kernel] Process ${pid} execution complete`);
      return pid;
      
    } catch (e) {
      console.error(`[Kernel] Failed to spawn WASM binary (PID ${pid}):`, e.message);
      throw e;
    }
  }

  async spawnFromVFS(vfsPath, args = []) {
    console.log(`[Kernel] Spawning from VFS: ${vfsPath}`);
    try {
      const data = await this.vfs.read(vfsPath);
      console.log(`[Kernel] Loaded ${data.byteLength} bytes from ${vfsPath}`);
      return await this.spawnWasmBinary(data, { args });
    } catch (e) {
      console.error(`[Kernel] Failed to spawn from VFS (${vfsPath}):`, e.message);
      throw e;
    }
  }

  _buildWasiImports(memory, pid) {
    const kernel = this;
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    
    function memU8() { 
      return new Uint8Array(memory.buffer); 
    }

    const wasi = {
      fd_write: (fd, iovsPtr, iovsLen, nwrittenPtr) => {
        try {
          const mem = memU8();
          const dv = new DataView(memory.buffer);
          let total = 0;
          let off = iovsPtr;
          
          for (let i = 0; i < iovsLen; i++) {
            const buf = dv.getUint32(off, true);
            const len = dv.getUint32(off + 4, true);
            off += 8;
            
            const s = textDecoder.decode(mem.subarray(buf, buf + len));
            console.log(`[wasm:${pid}]`, s);
            total += len;
          }
          
          if (nwrittenPtr) dv.setUint32(nwrittenPtr, total, true);
          return 0;
        } catch (e) {
          console.error(`[WASI] fd_write error (PID ${pid}):`, e.message);
          return 1;
        }
      },
      
      proc_exit: (r) => {
        console.log(`[WASI] proc_exit called for PID ${pid} with code ${r}`);
        return 0;
      },
      
      fd_read: () => {
        console.warn(`[WASI] fd_read not implemented`);
        return 1;
      },
      
      fd_close: () => {
        return 0;
      },
      
      clock_time_get: (clockId, prec, tp) => {
        try {
          if (tp) {
            const ns = BigInt(Math.floor(performance.now() * 1e6));
            new DataView(memory.buffer).setBigUint64(tp, ns, true);
          }
          return 0;
        } catch (e) {
          console.error(`[WASI] clock_time_get error:`, e.message);
          return 1;
        }
      }
    };

    return { wasi_snapshot_preview1: wasi, env: {} };
  }

  run() {
    if (this.schedulerRunning) {
      console.warn('[Kernel] Scheduler already running');
      return;
    }
    
    console.log('[Kernel] Starting scheduler...');
    this.schedulerRunning = true;
    
    const tick = () => {
      try {
        // Cleanup zombie processes
        const zombies = [];
        for (const [pid, proc] of Array.from(this.processTable)) {
          if (!proc.alive || proc.state === 'ZOMBIE') {
            zombies.push(pid);
            this.processTable.delete(pid);
            console.log(`[Kernel:scheduler] Cleaned up PID ${pid}`);
          }
        }

        // Check if any processes left
        if (this.processTable.size === 0) {
          console.log('[Kernel:scheduler] No active processes — kernel idle');
          this.schedulerRunning = false;
          return;
        }

        // Re-schedule
        setTimeout(tick, 100);
      } catch (e) {
        console.error('[Kernel:scheduler] Scheduler error:', e.message);
        this.schedulerRunning = false;
      }
    };
    
    tick();
    
    // Register syscalls
    console.log('[Kernel] Registering syscalls...');
    this._registerSyscalls();
  }

  _registerSyscalls() {
    try {
      const imports = [
        './fs/vfs.js',
        './syscalls/process.js',
        './syscalls/time.js',
        './syscalls/signal.js',
        './syscalls/poll.js',
        './syscalls/file.js',
        './syscalls/directory.js',
        './syscalls/process_extended.js',
        './syscalls/memory.js',
        './syscalls/signal_extended.js',
        './syscalls/ipc.js',
        './syscalls/fcntl.js',
        './syscalls/permission.js',
        './syscalls/resource.js',
        './syscalls/epoll.js'
      ];

      for (const mod of imports) {
        import(mod).then(m => {
          const registerFunc = Object.values(m)[0];
          if (typeof registerFunc === 'function') {
            registerFunc(this);
            console.log(`[Kernel] Registered syscalls from ${mod}`);
          }
        }).catch(e => {
          console.warn(`[Kernel] Failed to load syscalls from ${mod}:`, e.message);
        });
      }
    } catch (e) {
      console.warn('[Kernel] Syscall registration error:', e.message);
    }
  }
}
