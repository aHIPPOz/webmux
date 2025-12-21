// kernel/boot/rootfs.js
// Functions to detect, download and install a rootfs tarball into VFS (OPFS-backed)


// NOTE: this module expects the kernel instance to expose:
// - kernel.vfs with async methods: exists(path), writeFile(path, Uint8Array), readFile(path)
// - kernel.logger (optional)
// - kernel.bootInfo.rootfsDownloadUrl


async function tinyUntarToMap(arrayBuffer) {
    // Very small tar parser returning map path -> Uint8Array
    const view = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder();
    const files = {};
    let offset = 0;
    while (offset + 512 <= view.length) {
    const header = view.subarray(offset, offset + 512);
    offset += 512;
    if (header.every(b => b === 0)) break;
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    const sizeOct = decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOct || '0', 8);
    if (!name) {
    offset += Math.ceil(size / 512) * 512;
    continue;
    }
    const data = view.subarray(offset, offset + size).slice();
    offset += Math.ceil(size / 512) * 512;
    // Normalise: remove leading './' if present
    const clean = name.replace(/^\.\//, '');
    files[clean] = data;
    }
    return files;
}
    
    
    export async function rootfsExists(kernel) {
    try {
    // prefer an explicit marker
    if (await kernel.vfs.exists('/.rootfs_marker')) return true;
    // fallbacks: look for typical files
    if (await kernel.vfs.exists('/init.wasm')) return true;
    if (await kernel.vfs.exists('/sbin/init.wasm')) return true;
    if (await kernel.vfs.exists('/bin')) return true;
    return false;
    } catch (e) {
    return false;
    }
}

export async function downloadRootfsToVFS(kernel, url, { prefix = '/', onProgress = null } = {}) {
    const log = kernel.logger || console;
    log.info && log.info('downloadRootfsToVFS:', url);
    
    
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to download rootfs: ' + resp.status);
    
    
    // streaming reader to support progress callback
    const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
    let chunks = [];
    if (reader) {
    let read = 0;
    while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    read += value.length;
    if (onProgress) try { onProgress(read); } catch (e) {}
    }
    // concat
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const ab = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { ab.set(c, off); off += c.length; }
    const map = await tinyUntarToMap(ab.buffer);
    // write to vfs
    for (const [path, data] of Object.entries(map)) {
    const target = (prefix === '/' ? '/' : prefix.replace(/\/+$/, '/') ) + path.replace(/^\/+/, '');
    log.info && log.info('installing', target);
    await kernel.vfs.writeFile(target, data);
    }
    // marker
    await kernel.vfs.writeFile('/.rootfs_marker', new TextEncoder().encode('wasmux-rootfs'));
    return true;
    } else {
    // fallback: arrayBuffer trick
    const ab = await resp.arrayBuffer();
    const map = await tinyUntarToMap(ab);
    for (const [path, data] of Object.entries(map)) {
    const target = (prefix === '/' ? '/' : prefix.replace(/\/+$/, '/')) + path.replace(/^\/+/, '');
    log.info && log.info('installing', target);
    await kernel.vfs.writeFile(target, data);
    }
    await kernel.vfs.writeFile('/.rootfs_marker', new TextEncoder().encode('wasmux-rootfs'));
    return true;
    }
}

export async function ensureRootfs(kernel, { downloadIfMissing = true } = {}) {
    const log = kernel.logger || console;
    const exists = await rootfsExists(kernel);
    if (exists) {
    log.info && log.info('Rootfs detected in VFS');
    return true;
    }
    if (!downloadIfMissing) {
    log.warn && log.warn('Rootfs missing and download disabled');
    return false;
    }
    const url = kernel.bootInfo && kernel.bootInfo.rootfsDownloadUrl;
    if (!url) throw new Error('No rootfs download URL configured');
    log.info && log.info('Rootfs not found — downloading from', url);
    await downloadRootfsToVFS(kernel, url, { prefix: '/', onProgress: (n) => log.info && log.info('downloaded', n) });
    log.info && log.info('Rootfs installed');
    return true;
    }
    
    
    // optional helper: extract a tar ArrayBuffer directly into kernel.vfs under prefix
    export async function extractTarBuffer(kernel, arrayBuffer, { prefix = '/' } = {}) {
    const map = await tinyUntarToMap(arrayBuffer);
    for (const [path, data] of Object.entries(map)) {
    const target = (prefix === '/' ? '/' : prefix.replace(/\/+$/, '/')) + path.replace(/^\/+/, '');
    await kernel.vfs.writeFile(target, data);
    }
    await kernel.vfs.writeFile('/.rootfs_marker', new TextEncoder().encode('wasmux-rootfs'));
    }
    
    
    // export default for convenience
    export default { rootfsExists, ensureRootfs, downloadRootfsToVFS, extractTarBuffer };