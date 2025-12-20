// kernel/main.js — kernel entry point
// Exports kernelMain(bootInfo)

import { Kernel } from './kernel.js';

export async function kernelMain(bootInfo = {}) {
console.log('kernelMain: starting with', bootInfo);
const kernel = new Kernel(bootInfo);

// initialize kernel subsystems and attempt to mount rootfs
await kernel.initialize();

// Boot default init from rootfs (/sbin/init.wasm or /init.wasm)
try {
const initPathCandidates = ['/sbin/init.wasm', '/init.wasm'];
let started = false;
for (const p of initPathCandidates) {
if (await kernel.vfs.exists(p)) {
console.log('Launching init:', p);
kernel.spawnFromVFS(p, ['init']);
started = true;
break;
}
}
if (!started) {
console.warn('No init found in rootfs — dropping to kernel shell');
// try to spawn an embedded built-in demo or a shell fallback
if (kernel.builtinHello) {
kernel.spawnWasmBinary(kernel.builtinHello, { args: ['hello'] });
}
}
} catch (e) {
console.error('Error launching init:', e);
}

// let kernel scheduler run (cooperative)
kernel.run();

return kernel;
}