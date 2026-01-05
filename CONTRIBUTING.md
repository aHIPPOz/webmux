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

See `README.md` for full documentation.
