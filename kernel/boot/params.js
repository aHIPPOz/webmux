// kernel/boot/params.js
// Tiny parser/normaliser for boot parameters


export function parseBootParams(bootInfo = {}) {
    // normalize known keys and provide defaults
    const out = {};
    out.canvasId = bootInfo.canvasId || 'screen';
    out.canvasWidth = bootInfo.canvasWidth || window.innerWidth || 800;
    out.canvasHeight = bootInfo.canvasHeight || window.innerHeight || 600;
    out.rootfsDownloadUrl = bootInfo.rootfsDownloadUrl || null;
    out.cmdline = bootInfo.cmdline || '';
    out.arch = bootInfo.arch || 'wasm32-wasi';
    out.env = bootInfo.env || {};
    return out;
    }
    
    
    export default { parseBootParams };