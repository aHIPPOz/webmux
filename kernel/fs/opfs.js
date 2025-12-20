// kernel/fs/opfs.js
// OPFS backend with memory fallback. Async API expected by VFS.


export class OPFSBackend {
    constructor() {
    this.inMemory = {};
    this.opfsSupported = (typeof navigator !== 'undefined') && !!navigator.storage && !!navigator.storage.getDirectory;
    this.rootHandlePromise = null;
    }
    
    
    async _getRootHandle() {
    if (!this.opfsSupported) return null;
    if (!this.rootHandlePromise) this.rootHandlePromise = navigator.storage.getDirectory();
    return this.rootHandlePromise;
    }
    
    
// helpers for in-memory fallback
_memWrite(path, uint8arr) {
    this.inMemory[path] = new Uint8Array(uint8arr);
    }
_memRead(path) {
    const b = this.inMemory[path];
    if (!b) throw new Error('ENOENT');
    return b.slice();
    }
_memExists(path) {
    return !!this.inMemory[path];
    }
_memListDir(path) {
    const set = new Set();
    const norm = path === '/' ? '/' : path.replace(/\/+$/, '');
    for (const k of Object.keys(this.inMemory)) {
    if (!k.startsWith(norm)) continue;
    const rest = k.slice(norm === '/' ? 1 : norm.length + 1);
    const first = rest.split('/')[0];
    if (first) set.add(first);
    }
    return [...set];
    }
    
    
// public API
async exists(path) {
    path = path.replace(/\/+/g, '/');
    if (!this.opfsSupported) return this._memExists(path);
    try {
    const root = await this._getRootHandle();

// attempt getFileHandle to check existence
    const segs = path.split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) cur = await cur.getDirectoryHandle(segs[i]);
    const name = segs[segs.length - 1] || '';
    await cur.getFileHandle(name);
    return true;
    } catch (e) {
    return false;
    }
}        
            
async writeFile(path, uint8arr) {
    path = path.replace(/\/+/g, '/');
    if (!this.opfsSupported) return this._memWrite(path, uint8arr);
    const root = await this._getRootHandle();
    const segs = path.split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) cur = await cur.getDirectoryHandle(segs[i], { create: true });
    const name = segs[segs.length - 1] || '';
    const fh = await cur.getFileHandle(name, { create: true });
    const writable = await fh.createWritable();
    await writable.write(uint8arr);
    await writable.close();
}

async readFile(path) {
    path = path.replace(/\/+/g, '/');
    if (!this.opfsSupported) return this._memRead(path);
    const root = await this._getRootHandle();
    const segs = path.split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) cur = await cur.getDirectoryHandle(segs[i]);
    const name = segs[segs.length - 1] || '';
    const fh = await cur.getFileHandle(name);
    const file = await fh.getFile();
    const ab = await file.arrayBuffer();
    return new Uint8Array(ab);
}

async removeFile(path) {
    path = path.replace(/\/+/g, '/');
    if (!this.opfsSupported) {
        delete this.inMemory[path];
        return;
        }
    const root = await this._getRootHandle();
    const segs = path.split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) cur = await cur.getDirectoryHandle(segs[i]);
    const name = segs[segs.length - 1] || '';
    try { await cur.removeEntry(name); } catch (e) { /* ignore */ }
}

async listDir(path) {
    path = path.replace(/\/+/g, '/');
    if (!this.opfsSupported) return this._memListDir(path);
    const root = await this._getRootHandle();
    const segs = path.split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < segs.length; i++) cur = await cur.getDirectoryHandle(segs[i]);
    const entries = [];
    for await (const [name, handle] of cur.entries()) entries.push(name);
    return entries;
}
                            
// minimal stat: return {isFile, size}              
async stat(path) {
    try {
        const data = await this.readFile(path);
        return { isFile: true, size: data.length };
    } catch (e) {
        return { isFile: false, size: 0 };
    }
}

}                       

export default OPFSBackend;