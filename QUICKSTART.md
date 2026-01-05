# Wasmux Quick Start

## For Users - Boot the OS

1. **Start a local server**:
   ```bash
   bash dev-server.sh
   # or: npx http-server
   ```

2. **Open in browser**: `http://localhost:8080`

3. **Check console**: Press `F12` to see boot logs

## For Developers

### Development Setup
```bash
git clone https://github.com/aHIPPOz/webmux
cd webmux
bash dev-server.sh
# Browser: http://localhost:8080
# Console: F12
```

### Edit the Kernel
- File: `kernel/kernel.js`
- The kernel initializes RootFS, devices, and syscalls
- Changes take effect on page reload

### Add POSIX Syscalls
- File: `kernel/syscalls/`
- Register in: `kernel/kernel.js`
- Test in: browser console

### Compile Rust Components
```bash
cd source
rustup target add wasm32-wasi  # One-time
bash ../build.sh               # Compile and deploy
```

### Test New WASM Binaries
1. Run `bash build.sh` from source/
2. Reload `index.html` in browser
3. Binary will be in `/usr/bin/` (as deployed)

## What's Included

| File/Dir | Purpose |
|----------|---------|
| `index.html` | Bootstrap page |
| `boot.js` | Bootloader |
| `kernel/kernel.js` | Core kernel |
| `kernel/rootfs/` | Filesystem manager |
| `kernel/syscalls/` | POSIX syscalls |
| `rootfs/` | Virtual filesystem |
| `source/` | Rust source code |

## Troubleshooting

**Error: "Boot failed"**
- Check browser console (F12)
- Verify `rootfs/` files exist
- Check CORS issues

**WASM binaries not loading**
- Run `bash build.sh` to compile
- Check `rootfs/sbin/init.wasm` exists

**Development changes not showing**
- Hard refresh: `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (Mac)

## Next Steps

1. Review `kernel.js` to understand boot sequence
2. Read `CONTRIBUTING.md` for guidelines
3. Pick an issue from GitHub
4. Submit PR with clean code

---

For full documentation, see `README.md`
