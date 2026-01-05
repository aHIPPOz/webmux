# Wasmux RootFS

WebAssembly Operating System Root Filesystem

## Structure

```
/              Root directory
├── bin/       User binaries
├── sbin/      System binaries  
├── etc/       System configuration
├── lib/       Libraries
├── usr/       User files
│   ├── bin/   Additional user binaries
│   ├── lib/   Libraries
│   └── share/ Shared data
├── var/       Variable data
│   ├── lib/   Variable libraries
│   ├── log/   System logs
│   └── run/   Runtime data
├── tmp/       Temporary files
├── home/      User home directories
├── dev/       Devices
└── root/      Root user home
```

## Configuration Files

- `/etc/passwd` - User database
- `/etc/group` - Group database
- `/etc/fstab` - Mount table
- `/etc/hostname` - System hostname
- `/.wasmux.json` - System metadata

## Binaries

### System
- `/sbin/init.wasm` - Init system
- `/bin/sh.wasm` - POSIX shell

### Utilities
- `/usr/bin/ls.wasm` - List files
- `/usr/bin/cat.wasm` - Read files
- `/usr/bin/echo.wasm` - Print text
- `/usr/bin/mkdir.wasm` - Create directories
- `/usr/bin/rm.wasm` - Remove files
- `/usr/bin/cp.wasm` - Copy files
- `/usr/bin/mv.wasm` - Move files
- `/usr/bin/touch.wasm` - Create files
- `/usr/bin/whoami.wasm` - Print user
- `/usr/bin/pwd.wasm` - Print directory

## Boot Sequence

1. Browser loads `index.html`
2. JavaScript kernel initializes
3. RootfsManager loads filesystem
4. Kernel registers POSIX syscalls
5. Kernel spawns `/sbin/init.wasm`
6. Init mounts filesystems, starts shell
7. `/bin/sh.wasm` launches
8. System ready for commands
