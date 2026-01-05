// kernel/syscalls/directory.js — Directory Operations Syscalls (COMPLET)

export function registerDirectorySyscalls(kernel) {
  console.log('[Syscalls:directory] Registering directory syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // mkdir: create directory
  kernel.syscalls.mkdir = async (proc, path, mode = 0o755) => {
    try {
      console.log(`[Syscall:mkdir] PID ${proc.pid} mkdir(${path}, mode=${mode.toString(8)})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      // Try to create directory in VFS
      try {
        // Mark it as a directory entry
        const markerPath = path + '/.dir';
        await kernel.vfs.write(markerPath, new TextEncoder().encode('dir'));
        console.log(`[Syscall:mkdir] ${path} created ✓`);
        return 0;
      } catch (e) {
        console.warn(`[Syscall:mkdir] Could not create dir: ${e.message}`);
        return -1;
      }

    } catch (e) {
      console.error('[Syscall:mkdir] Error:', e.message);
      return -1;
    }
  };

  // rmdir: remove directory
  kernel.syscalls.rmdir = async (proc, path) => {
    try {
      console.log(`[Syscall:rmdir] PID ${proc.pid} rmdir(${path})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      // Try to remove directory marker
      try {
        const markerPath = path + '/.dir';
        await kernel.vfs.unlink(markerPath);
        console.log(`[Syscall:rmdir] ${path} removed ✓`);
        return 0;
      } catch (e) {
        throw new Error('ENOTEMPTY: directory not empty');
      }

    } catch (e) {
      console.error('[Syscall:rmdir] Error:', e.message);
      return -1;
    }
  };

  // chdir: change working directory
  kernel.syscalls.chdir = (proc, path) => {
    try {
      console.log(`[Syscall:chdir] PID ${proc.pid} chdir(${path})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      // Store current working directory in process
      if (!proc.cwd) proc.cwd = '/';
      
      // Handle relative paths
      let newPath = path;
      if (!path.startsWith('/')) {
        newPath = proc.cwd + (proc.cwd.endsWith('/') ? '' : '/') + path;
      }

      proc.cwd = newPath;
      console.log(`[Syscall:chdir] Changed to ${proc.cwd} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:chdir] Error:', e.message);
      return -1;
    }
  };

  // getcwd: get current working directory
  kernel.syscalls.getcwd = (proc) => {
    try {
      console.log(`[Syscall:getcwd] PID ${proc.pid} getcwd()`);

      if (!proc.cwd) proc.cwd = '/';
      console.log(`[Syscall:getcwd] Returning ${proc.cwd}`);
      return proc.cwd;

    } catch (e) {
      console.error('[Syscall:getcwd] Error:', e.message);
      return '/';
    }
  };

  // readdir: read directory entries
  kernel.syscalls.readdir = async (proc, path) => {
    try {
      console.log(`[Syscall:readdir] PID ${proc.pid} readdir(${path})`);

      if (!path || typeof path !== 'string') {
        throw new Error('EINVAL: invalid path');
      }

      try {
        const entries = await kernel.vfs.readdir(path);
        console.log(`[Syscall:readdir] ${path} has ${entries.length} entries`);
        return entries;
      } catch (e) {
        throw new Error('ENOENT: no such directory');
      }

    } catch (e) {
      console.error('[Syscall:readdir] Error:', e.message);
      return [];
    }
  };

  console.log('[Syscalls:directory] Registered ✓');
}
