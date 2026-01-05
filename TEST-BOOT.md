# Boot Testing Guide

## What to Expect

When you open `index.html` in a browser and check the console (F12), you should see:

```
[boot] === WASMUX BOOT SEQUENCE START ===
[boot] Phase 1: Canvas initialization
[boot] Canvas: 1366x599 (or your screen size)
[boot] Phase 2: Boot info configuration
[boot] Boot info: ready
[boot] Phase 3: Kernel initialization
[kernelMain] === Kernel initialization START ===
[Kernel] Constructor called
[TinyVFS] Initializing...
[TinyVFS] OPFS available: true
[kernelMain] Kernel instance created
[kernelMain] Phase 1: Initializing subsystems...
[Kernel] Initialisation START
[Kernel] Phase 1: Initializing RootFS Manager...
[RootFS] Initializing root filesystem...
[RootFS] Loading or creating root filesystem...
[RootFS] Directory structure created ✓
[RootFS] Loading filesystem metadata...
[RootFS] No metadata found, using defaults
[RootFS] Ensuring essential directories...
[RootFS] Filesystem mounted ✓
[RootFS] Determining boot command...
[Kernel] RootFS initialized ✓ (boot command: /sbin/init.wasm)
[Kernel] Phase 2: RootFS loaded via RootfsManager ✓
[Kernel] Phase 3: Initializing devices...
[Kernel] Devices initialized: 5 devices
[Kernel] Devices: console, gpu, hid, input, clock
[Kernel] Phase 4: Initializing network...
[Kernel] Network initialized ✓
[Kernel] Initialisation COMPLETE (xxx ms) ✓
[kernelMain] Subsystems initialized ✓
[kernelMain] Phase 2: Mounting virtual filesystems...
[kernelMain] /proc filesystem mounted ✓
[kernelMain] Phase 3: Launching init process...
[kernelMain] Trying init candidate: /sbin/init.wasm
[kernelMain] Found init at /sbin/init.wasm, spawning...
[kernelMain] Init process spawned (PID 1) ✓
[kernelMain] Phase 4: Starting scheduler...
[kernelMain] Scheduler running ✓
[kernelMain] === Kernel initialization COMPLETE (xxx ms) ===
[boot] === BOOT COMPLETE (xxx ms) ===
```

## Validation Checklist

- [ ] No CORS errors in console
- [ ] No "Failed to fetch" messages
- [ ] Canvas renders properly
- [ ] Status shows "✓ System ready"
- [ ] All boot phases complete
- [ ] Kernel.vfs accessible
- [ ] window.wasmux.kernel available

## Error Scenarios

### CORS Error
**Problem**: "Access to fetch at 'https://...' blocked by CORS"
**Cause**: Attempting to download rootfs from GitHub
**Solution**: Already fixed - kernel now uses local rootfs

### RootFS not found
**Problem**: "Rootfs install failed: Failed to fetch"
**Solution**: Kernel should use local RootfsManager - check console logs

### Canvas error
**Problem**: Canvas not rendering
**Solution**: Check that index.html is served from local server (not file://)

## Testing from Console

Once booted, you can test:

```javascript
// Check kernel state
window.wasmux.kernel.vfs.exists('/')

// List rootfs
window.wasmux.kernel.vfs.readdir('/')

// Check processes
window.wasmux.kernel.processTable

// Check devices
window.wasmux.kernel.devices.list()
```

---

**Status**: If all logs appear without errors, ✅ System is booted successfully!
