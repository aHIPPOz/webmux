// kernel/wasm/loader.js
// utilities to load wasm binaries from VFS or URL


export async function loadWasmFromVFS(vfs, path) {
    // vfs.readFile returns Uint8Array or throws
    const data = await vfs.readFile(path);
    return data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data.buffer;
    }
    
    
    export async function loadWasmFromUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch wasm: ' + res.status);
    return await res.arrayBuffer();
    }