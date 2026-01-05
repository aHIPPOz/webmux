// kernel/fs/vfs.js — Virtual File System AMÉLIORÉ

export class VFS {
  constructor({ backend = null, logger = console } = {}) {
    console.log('[VFS] Initializing...');
    this.backend = backend;
    this.logger = logger;
    // virtual files: path -> { read: async, write?: async, stat?: async }
    this.virtualFiles = new Map();
    // mounts: path -> backend
    this.mounts = new Map();
  }

  // Normalize POSIX path
  _norm(path) {
    if (!path) return '/';
    if (!path.startsWith('/')) path = '/' + path;
    const parts = [];
    for (const p of path.split('/')) {
      if (!p || p === '.') continue;
      if (p === '..') {
        parts.pop();
        continue;
      }
      parts.push(p);
    }
    return '/' + parts.join('/');
  }

  // Register virtual file (read-only or read/write)
  registerVirtual(path, handlers) {
    try {
      path = this._norm(path);
      if (!handlers || !handlers.read) {
        throw new Error('handlers must have read() function');
      }
      this.virtualFiles.set(path, handlers);
      console.log(`[VFS] Registered virtual file: ${path}`);
      return true;
    } catch (e) {
      console.error(`[VFS] registerVirtual error:`, e.message);
      return false;
    }
  }

  unregisterVirtual(path) {
    try {
      path = this._norm(path);
      if (this.virtualFiles.has(path)) {
        this.virtualFiles.delete(path);
        console.log(`[VFS] Unregistered virtual file: ${path}`);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`[VFS] unregisterVirtual error:`, e.message);
      return false;
    }
  }

  // Check if file exists (virtual or backend)
  async exists(path) {
    try {
      path = this._norm(path);
      if (this.virtualFiles.has(path)) {
        return true;
      }
      if (this.backend) {
        return await this.backend.exists(path);
      }
      return false;
    } catch (e) {
      console.warn(`[VFS] exists(${path}) error:`, e.message);
      return false;
    }
  }

  // Read file: prefer virtual
  async read(path) {
    try {
      path = this._norm(path);
      console.log(`[VFS] Reading ${path}...`);

      if (this.virtualFiles.has(path)) {
        const h = this.virtualFiles.get(path);
        if (!h.read) {
          throw new Error('EACCES: virtual file not readable');
        }
        const data = await h.read({ path, vfs: this });
        if (data instanceof Uint8Array) {
          console.log(`[VFS] Read virtual ${path}: ${data.length} bytes`);
          return data;
        }
        if (typeof data === 'string') {
          const buf = new TextEncoder().encode(data);
          console.log(`[VFS] Read virtual ${path}: ${buf.length} bytes`);
          return buf;
        }
        throw new Error('virtual file must return Uint8Array|string');
      }

      if (!this.backend) {
        throw new Error('ENOENT: no backend');
      }

      const data = await this.backend.readFile(path);
      console.log(`[VFS] Read backend ${path}: ${data.length} bytes`);
      return data;

    } catch (e) {
      console.error(`[VFS] read(${path}) error:`, e.message);
      throw e;
    }
  }

  async readFile(path) {
    return this.read(path);
  }

  // Write file: prefer virtual
  async write(path, uint8arr) {
    try {
      path = this._norm(path);
      console.log(`[VFS] Writing ${path} (${uint8arr.length} bytes)...`);

      if (this.virtualFiles.has(path)) {
        const h = this.virtualFiles.get(path);
        if (!h.write) {
          throw new Error('EACCES: virtual file read-only');
        }
        await h.write(uint8arr, { path, vfs: this });
        console.log(`[VFS] Wrote virtual ${path} ✓`);
        return uint8arr.length;
      }

      if (!this.backend) {
        throw new Error('ENOENT: no backend');
      }

      await this.backend.writeFile(path, uint8arr);
      console.log(`[VFS] Wrote backend ${path} ✓`);
      return uint8arr.length;

    } catch (e) {
      console.error(`[VFS] write(${path}) error:`, e.message);
      throw e;
    }
  }

  async writeFile(path, uint8arr) {
    return this.write(path, uint8arr);
  }

  // Delete file
  async unlink(path) {
    try {
      path = this._norm(path);
      console.log(`[VFS] Unlinking ${path}...`);

      if (this.virtualFiles.has(path)) {
        throw new Error('EACCES: cannot unlink virtual file');
      }

      if (!this.backend) {
        throw new Error('ENOENT: no backend');
      }

      await this.backend.removeFile(path);
      console.log(`[VFS] Unlinked ${path} ✓`);
      return 0;

    } catch (e) {
      console.error(`[VFS] unlink(${path}) error:`, e.message);
      throw e;
    }
  }

  // List directory
  async readdir(path) {
    try {
      path = this._norm(path);
      console.log(`[VFS] Listing ${path}...`);

      const entries = new Set();

      // Include virtual children
      for (const key of this.virtualFiles.keys()) {
        const prefix = path === '/' ? '/' : path + '/';
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        if (!rest.includes('/')) {
          entries.add(rest);
        }
      }

      // Include backend children
      if (this.backend && this.backend.readdir) {
        try {
          const backendEntries = await this.backend.readdir(path);
          if (Array.isArray(backendEntries)) {
            backendEntries.forEach(e => entries.add(e));
          }
        } catch (e) {
          console.warn(`[VFS] readdir backend error:`, e.message);
        }
      }

      const result = Array.from(entries);
      console.log(`[VFS] Listed ${path}: ${result.length} entries`);
      return result;

    } catch (e) {
      console.error(`[VFS] readdir(${path}) error:`, e.message);
      return [];
    }
  }

  // Get file stats
  async stat(path) {
    try {
      path = this._norm(path);
      
      if (this.virtualFiles.has(path)) {
        const h = this.virtualFiles.get(path);
        if (h.stat) {
          return await h.stat({ path, vfs: this });
        }
        // Default stat for virtual file
        return { size: 0, isVirtual: true, mode: 0o444 };
      }

      if (this.backend && this.backend.stat) {
        return await this.backend.stat(path);
      }

      throw new Error('ENOENT');

    } catch (e) {
      console.error(`[VFS] stat(${path}) error:`, e.message);
      throw e;
    }
  }

  // Mount backend at path
  mount(path, backend) {
    try {
      path = this._norm(path);
      this.mounts.set(path, backend);
      console.log(`[VFS] Mounted ${backend.constructor.name} at ${path}`);
      return true;
    } catch (e) {
      console.error(`[VFS] mount error:`, e.message);
      return false;
    }
  }
}

// Register syscalls for VFS operations
export function registerFsSyscalls(kernel) {
  console.log('[Syscalls:fs] Registering filesystem syscalls...');
  kernel.syscalls = kernel.syscalls || {};
  
  kernel.syscalls.read = async (proc, fd, buf, count) => {
    try {
      console.log(`[Syscall:read] PID ${proc.pid} FD ${fd} count ${count}`);
      // Not fully implemented
      return 0;
    } catch (e) {
      console.error('[Syscall:read] Error:', e.message);
      return -1;
    }
  };

  kernel.syscalls.write = async (proc, fd, buf, count) => {
    try {
      console.log(`[Syscall:write] PID ${proc.pid} FD ${fd} count ${count}`);
      // Not fully implemented
      return count;
    } catch (e) {
      console.error('[Syscall:write] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:fs] Registered ✓');
}
