// kernel/rootfs/manager.js — Root Filesystem Manager
// Gère le montage, l'initialisation et la persistence du rootfs OPFS

export class RootfsManager {
  constructor(kernel) {
    this.kernel = kernel;
    this.rootPath = '/';
    this.mounted = false;
    this.metadata = null;
  }

  async initialize() {
    console.log('[RootFS] Initializing root filesystem...');

    try {
      // Charger ou créer le rootfs
      await this.loadOrCreateRootfs();
      
      // Charger les métadonnées
      await this.loadMetadata();
      
      // Initialiser les répertoires essentiels
      await this.ensureDirectories();
      
      // Charger les utilisateurs et groupes
      await this.loadUserDatabase();
      
      this.mounted = true;
      console.log('[RootFS] Filesystem mounted ✓');
      
    } catch (e) {
      console.error('[RootFS] Initialization failed:', e.message);
      throw e;
    }
  }

  async loadOrCreateRootfs() {
    console.log('[RootFS] Loading or creating root filesystem...');
    
    // Vérifier si le rootfs existe déjà en OPFS
    try {
      const exists = await this.kernel.vfs.exists('/');
      if (exists) {
        console.log('[RootFS] Existing rootfs found ✓');
        return;
      }
    } catch (e) {
      // Non existant, créer nouveau
    }

    console.log('[RootFS] Creating new rootfs structure...');
    
    // Créer la structure de répertoires
    const dirs = [
      '/', '/bin', '/sbin', '/etc', '/home', '/lib',
      '/tmp', '/usr', '/usr/bin', '/usr/lib', '/usr/share',
      '/var', '/var/lib', '/var/lib/wpm', '/var/run', '/var/log',
      '/dev'
    ];

    for (const dir of dirs) {
      try {
        await this.kernel.vfs.mkdir(dir, 0o755);
      } catch (e) {
        // Directory might already exist
      }
    }

    console.log('[RootFS] Directory structure created ✓');
  }

  async loadMetadata() {
    console.log('[RootFS] Loading filesystem metadata...');
    
    try {
      const metadataJson = await this.kernel.vfs.read('/.wasmux.json');
      this.metadata = JSON.parse(new TextDecoder().decode(metadataJson));
      console.log(`[RootFS] Metadata loaded: ${this.metadata.name} v${this.metadata.version}`);
    } catch (e) {
      console.warn('[RootFS] No metadata found, using defaults');
      this.metadata = {
        version: '1.0.0',
        name: 'wasmux',
        os: 'wasmux',
        arch: 'wasm32',
        abi: 'wasmux-wasi',
        bootloader: '/sbin/init.wasm',
        shell: '/bin/sh'
      };
    }
  }

  async ensureDirectories() {
    console.log('[RootFS] Ensuring essential directories...');

    const dirs = [
      { path: '/tmp', mode: 0o777, purpose: 'Temporary files' },
      { path: '/var/log', mode: 0o755, purpose: 'System logs' },
      { path: '/var/run', mode: 0o755, purpose: 'Runtime data' },
      { path: '/var/lib/wpm', mode: 0o755, purpose: 'Package registry' },
      { path: '/home/guest', mode: 0o755, purpose: 'Guest home' },
      { path: '/root', mode: 0o700, purpose: 'Root home' }
    ];

    for (const dir of dirs) {
      try {
        await this.kernel.vfs.mkdir(dir.path, dir.mode);
        console.log(`[RootFS] Directory ${dir.path} ✓`);
      } catch (e) {
        // Already exists
      }
    }
  }

  async loadUserDatabase() {
    console.log('[RootFS] Loading user database...');

    try {
      const passwdData = await this.kernel.vfs.read('/etc/passwd');
      const passwdText = new TextDecoder().decode(passwdData);
      const lines = passwdText.split('\n').filter(l => l.trim());

      this.users = new Map();
      this.usersById = new Map();

      for (const line of lines) {
        const [name, , uid, gid, comment, home, shell] = line.split(':');
        const user = { name, uid: parseInt(uid), gid: parseInt(gid), home, shell };
        this.users.set(name, user);
        this.usersById.set(parseInt(uid), user);
      }

      console.log(`[RootFS] Loaded ${this.users.size} users ✓`);

    } catch (e) {
      console.warn('[RootFS] Could not load user database:', e.message);
      // Create minimal defaults
      this.users = new Map([
        ['root', { name: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/sh' }],
        ['guest', { name: 'guest', uid: 1000, gid: 1000, home: '/home/guest', shell: '/bin/sh' }]
      ]);
      this.usersById = new Map([
        [0, this.users.get('root')],
        [1000, this.users.get('guest')]
      ]);
    }
  }

  async getBootCommand() {
    console.log('[RootFS] Determining boot command...');

    // Try to find init binary
    if (this.metadata?.bootloader) {
      return this.metadata.bootloader;
    }

    // Fallback to common locations
    const bootCandidates = [
      '/sbin/init.wasm',
      '/sbin/init',
      '/bin/init.wasm',
      '/bin/init'
    ];

    for (const candidate of bootCandidates) {
      try {
        const exists = await this.kernel.vfs.exists(candidate);
        if (exists) {
          console.log(`[RootFS] Boot command: ${candidate} ✓`);
          return candidate;
        }
      } catch (e) {
        // Not found, try next
      }
    }

    console.warn('[RootFS] No boot command found, using fallback');
    return '/bin/sh';
  }

  getUserInfo(uid) {
    return this.usersById.get(uid);
  }

  getUser(name) {
    return this.users.get(name);
  }

  getMetadata() {
    return this.metadata;
  }

  async getSystemInfo() {
    return {
      os: this.metadata?.os || 'wasmux',
      hostname: 'wasmux',
      arch: this.metadata?.arch || 'wasm32',
      abi: this.metadata?.abi || 'wasmux-wasi',
      kernel: 'Wasmux Kernel',
      uptime: Math.floor(Date.now() / 1000),
      users: this.users.size,
      packages: this.metadata?.system_packages?.length || 0
    };
  }
}

export function registerRootfsManager(kernel) {
  console.log('[Kernel] Initializing RootFS Manager...');
  
  kernel.rootfsManager = new RootfsManager(kernel);
  
  // Register syscalls that depend on rootfs
  kernel.syscalls = kernel.syscalls || {};
  
  kernel.syscalls.uname = async (proc) => {
    try {
      console.log(`[Syscall:uname] PID ${proc.pid} uname()`);
      const info = await kernel.rootfsManager.getSystemInfo();
      return {
        sysname: info.os,
        nodename: 'wasmux',
        release: '1.0.0',
        version: info.kernel,
        machine: info.arch
      };
    } catch (e) {
      console.error('[Syscall:uname] Error:', e.message);
      return null;
    }
  };

  kernel.syscalls.getpwuid = (proc, uid) => {
    try {
      console.log(`[Syscall:getpwuid] PID ${proc.pid} getpwuid(${uid})`);
      const user = kernel.rootfsManager.getUserInfo(uid);
      if (!user) {
        throw new Error('ENOENT: user not found');
      }
      return user;
    } catch (e) {
      console.error('[Syscall:getpwuid] Error:', e.message);
      return null;
    }
  };

  kernel.syscalls.getpwnam = (proc, name) => {
    try {
      console.log(`[Syscall:getpwnam] PID ${proc.pid} getpwnam(${name})`);
      const user = kernel.rootfsManager.getUser(name);
      if (!user) {
        throw new Error('ENOENT: user not found');
      }
      return user;
    } catch (e) {
      console.error('[Syscall:getpwnam] Error:', e.message);
      return null;
    }
  };

  console.log('[RootFS] Manager registered ✓');
}
