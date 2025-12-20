// kernel/fs/vfs.js
// Minimal POSIX-like VFS supporting real backends and virtual files.


import { OPFSBackend } from './opfs.js';


export class VFS {
constructor({ backend = null, logger = console } = {}) {
this.backend = backend || new OPFSBackend();
this.logger = logger;
// virtual files: path -> { read: async(ctx)->Uint8Array, stat?: async->stat }
this.virtualFiles = new Map();
// mounts: path -> backend (not deeply implemented yet)
this.mounts = new Map();
}


// normalize POSIX path
_norm(path) {
if (!path) return '/';
if (!path.startsWith('/')) path = '/' + path;
const parts = [];
for (const p of path.split('/')) {
if (!p || p === '.') continue;
if (p === '..') { parts.pop(); continue; }
parts.push(p);
}
return '/' + parts.join('/');
}


// register a virtual file (read-only or read/write if implemented)
registerVirtual(path, handlers) {
path = this._norm(path);
this.virtualFiles.set(path, handlers);
}


unregisterVirtual(path) {
this.virtualFiles.delete(this._norm(path));
}


// existence check (virtual or backend)
async exists(path) {
    path = this._norm(path);
    if (this.virtualFiles.has(path)) return true;
    return await this.backend.exists(path);
    }
    
    
    // read file: prefer virtual
    async readFile(path) {
    path = this._norm(path);
    if (this.virtualFiles.has(path)) {
    const h = this.virtualFiles.get(path);
    if (!h.read) throw new Error('EACCES: virtual file unreadable');
    const data = await h.read({ path, vfs: this });
    if (data instanceof Uint8Array) return data;
    if (typeof data === 'string') return new TextEncoder().encode(data);
    throw new Error('virtual file must return Uint8Array|string');
    }
    return await this.backend.readFile(path);
    }
    
    
    async writeFile(path, uint8arr) {
    path = this._norm(path);
    if (this.virtualFiles.has(path)) {
    const h = this.virtualFiles.get(path);
    if (!h.write) throw new Error('EACCES: virtual file read-only');
    return await h.write(uint8arr, { path, vfs: this });
    }
    return await this.backend.writeFile(path, uint8arr);
    }
    
    
    async unlink(path) {
    path = this._norm(path);
    if (this.virtualFiles.has(path)) throw new Error('EACCES: virtual file');
    return await this.backend.removeFile(path);
    }
    
    
    // list directory: returns array of names (not full paths)
    async readdir(path) {
        path = this._norm(path);
        // include virtual files that are immediate children
        const virtualChildren = [];
        for (const key of this.virtualFiles.keys()) {
        if (!key.startsWith(path === '/' ? '/' : path + '/')) continue;
        const rest = key.slice((path === '/' ? 0 : path.length) + (path === '/' ? 0 : 1));
        const first = rest.split('/')[0];
        if (first && !virtualChildren.includes(first)) virtualChildren.push(first);
        }
        const backendList = await this.backend.listDir(path);
        // backendList should be array of names
        const merged = new Set();
        for (const n of backendList || []) merged.add(n);
        for (const n of virtualChildren) merged.add(n);
        return [...merged];
        }
        
        
        // convenience stat (very small)
        async stat(path) {
        path = this._norm(path);
        if (this.virtualFiles.has(path)) {
        const h = this.virtualFiles.get(path);
        if (h.stat) return await h.stat({ vfs: this, path });
        return { isFile: true, size: (await this.readFile(path)).length };
        }
        return await this.backend.stat(path);
        }
        }
        
        
        // export default convenience
        export default VFS;