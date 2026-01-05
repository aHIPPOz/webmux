> ⚠️ Wasmux is currently in an early bootstrapping phase.
> Contributions that unblock the boot process are the highest priority.

# Contributing to Wasmux

Wasmux is a WebAssembly operating system written in JavaScript and Rust. We welcome contributions!

## Architecture

- **Kernel**: JavaScript runtime (`kernel/kernel.js`)
- **RootFS**: Virtual filesystem with POSIX structure (`rootfs/`)
- **System Components**: Rust binaries compiled to WebAssembly (`source/`)
- **Syscalls**: POSIX system calls implementation (`kernel/syscalls/`)

## Setting Up for Development

### Prerequisites
- Node.js 16+ (for dev server)
- Rust 1.70+ (for compiling WASM binaries)
- `wasm32-wasi` target

### Quick Start
```bash
git clone https://github.com/aHIPPOz/webmux
cd webmux
npx http-server
# Open http://localhost:8080 in browser
```

### Build Rust Components
```bash
cd source
cargo build --target wasm32-wasi --release
bash ../build.sh  # Full build and deploy
```

## Code Style

- **JavaScript**: Use modern ES6+, prefer const/let, use async/await
- **Rust**: Follow standard Rust conventions, run `cargo fmt` before committing
- Write clean, maintainable code without scaffolding

## Project Structure

```
webmux/
├── index.html           - Main entry point
├── boot.js             - Bootloader
├── kernel/             - JavaScript kernel
├── rootfs/             - Root filesystem
└── source/             - Rust source code
```

## Testing

1. Open `index.html` in a modern browser (F12 for console)
2. Check kernel boot sequence logs
3. Verify filesystem loads properly

## 🚧 Known Blocking Issues (Good First Tasks)

### ❌ RootFS download fails due to CORS (BOOT BLOCKER)

**Status:** 🔴 Blocking boot  
**Difficulty:** 🟢 Good first issue  
**Area:** Kernel / Boot / FS  

#### Symptoms
Boot fails during RootFS initialization with the following error:

```

Access to fetch at
[https://github.com/aHIPPOz/wasmux-rootfs/releases/latest/download/rootfs.tar](https://github.com/aHIPPOz/wasmux-rootfs/releases/latest/download/rootfs.tar)
has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present

```

This causes:
```

Rootfs install failed: Failed to fetch
BOOT FAILED

```

#### Where it happens
- `kernel/kernel.js`
- Method: `downloadAndInstallRootfs()`
- Triggered during kernel initialization when no local rootfs is detected.

#### Why this matters
Without fixing this, **Wasmux cannot boot on a clean install**.
This blocks all further development (syscalls, scheduler, UI, WASM runtime).

#### How to solve this:
Replace calls to this non-existent repository with calls using relative paths to the rootfs directory.

#### How to contribute
1. Fork the repo
2. Create a branch: `fix/rootfs-cors`
3. Propose a solution (code + explanation)
4. Open a Pull Request describing:
   - The approach chosen
   - Pros / cons
   - Browser compatibility
---
See `README.md` for full documentation.
