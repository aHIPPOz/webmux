// boot.js — bootloader minimal
// Place this at project root next to index.html

import { kernelMain } from './kernel/main.js';

async function boot() {
// ensure there's a canvas element
let canvas = document.getElementById('screen');
if (!canvas) {
canvas = document.createElement('canvas');
canvas.id = 'screen';
document.body.style.margin = '0';
document.body.appendChild(canvas);
}
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


// boot parameters / config
const bootInfo = {
canvasId: 'screen',
canvasWidth: canvas.width,
canvasHeight: canvas.height,
// URL from which the kernel may download a rootfs tarball if OPFS is empty.
// Replace with your GitHub release raw URL later.
rootfsDownloadUrl: 'https://github.com/aHIPPOz/wasmux-rootfs/releases/latest/download/rootfs.tar',
cmdline: ''
};


try {
await kernelMain(bootInfo);
console.log('Wasmux boot sequence complete.');
} catch (e) {
console.error('Boot failed:', e);
}
}


window.addEventListener('load', () => {
boot();
});