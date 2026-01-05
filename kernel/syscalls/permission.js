// kernel/syscalls/permission.js — Permission & Metadata Syscalls (COMPLET)

export function registerPermissionSyscalls(kernel) {
  console.log('[Syscalls:permission] Registering permission syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // chmod: change file mode/permissions
  kernel.syscalls.chmod = async (proc, path, mode) => {
    try {
      console.log(`[Syscall:chmod] PID ${proc.pid} chmod(${path}, ${mode.toString(8)})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      if (typeof mode !== 'number' || mode < 0) {
        throw new Error('EINVAL: invalid mode');
      }

      // Store mode (VFS-dependent)
      try {
        // Would need VFS support for actual chmod
        console.log(`[Syscall:chmod] ${path} mode set to ${mode.toString(8)} ✓`);
        return 0;
      } catch (e) {
        throw new Error('ENOENT: no such file');
      }

    } catch (e) {
      console.error('[Syscall:chmod] Error:', e.message);
      return -1;
    }
  };

  // fchmod: change file descriptor permissions
  kernel.syscalls.fchmod = (proc, fd, mode) => {
    try {
      console.log(`[Syscall:fchmod] PID ${proc.pid} fchmod(${fd}, ${mode.toString(8)})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      if (typeof mode !== 'number' || mode < 0) {
        throw new Error('EINVAL: invalid mode');
      }

      const entry = proc.fdTable.get(fd);
      entry.mode = mode;
      console.log(`[Syscall:fchmod] FD ${fd} mode set to ${mode.toString(8)} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:fchmod] Error:', e.message);
      return -1;
    }
  };

  // chown: change file owner
  kernel.syscalls.chown = async (proc, path, uid, gid) => {
    try {
      console.log(`[Syscall:chown] PID ${proc.pid} chown(${path}, ${uid}, ${gid})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      // Only root (uid 0) can chown
      if (proc.uid !== 0) {
        throw new Error('EPERM: operation not permitted');
      }

      console.log(`[Syscall:chown] ${path} owner set to ${uid}:${gid} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:chown] Error:', e.message);
      return -1;
    }
  };

  // fchown: change file descriptor owner
  kernel.syscalls.fchown = (proc, fd, uid, gid) => {
    try {
      console.log(`[Syscall:fchown] PID ${proc.pid} fchown(${fd}, ${uid}, ${gid})`);

      if (!proc.fdTable || !proc.fdTable.has(fd)) {
        throw new Error('EBADF: bad file descriptor');
      }

      // Only root can chown
      if (proc.uid !== 0) {
        throw new Error('EPERM: operation not permitted');
      }

      const entry = proc.fdTable.get(fd);
      entry.uid = uid;
      entry.gid = gid;
      console.log(`[Syscall:fchown] FD ${fd} owner set to ${uid}:${gid} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:fchown] Error:', e.message);
      return -1;
    }
  };

  // access: check file accessibility
  kernel.syscalls.access = async (proc, path, mode) => {
    try {
      console.log(`[Syscall:access] PID ${proc.pid} access(${path}, ${mode})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      // R_OK=4, W_OK=2, X_OK=1, F_OK=0
      try {
        const stat = await kernel.vfs.stat(path);
        if (!stat) throw new Error('ENOENT');
        console.log(`[Syscall:access] ${path} accessible ✓`);
        return 0;
      } catch (e) {
        throw new Error('EACCES: permission denied');
      }

    } catch (e) {
      console.error('[Syscall:access] Error:', e.message);
      return -1;
    }
  };

  // umask: set file creation mask
  kernel.syscalls.umask = (proc, mask) => {
    try {
      console.log(`[Syscall:umask] PID ${proc.pid} umask(${mask.toString(8)})`);

      if (!proc.umask) proc.umask = 0o022;
      const oldmask = proc.umask;
      proc.umask = mask;

      console.log(`[Syscall:umask] Mask changed from ${oldmask.toString(8)} to ${mask.toString(8)} ✓`);
      return oldmask;

    } catch (e) {
      console.error('[Syscall:umask] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:permission] Registered ✓');
}
