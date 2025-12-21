// kernel/wasm/memory.js
// small helpers to create and operate on WebAssembly.Memory


export function createMemory({ initialPages = 64, maximumPages = 1024 } = {}) {
    return new WebAssembly.Memory({ initial: initialPages, maximum: maximumPages });
    }
    
    
    export function getUint8Memory(memory) {
    return new Uint8Array(memory.buffer);
    }
    
    
    export function readString(memory, ptr, len) {
    const u8 = getUint8Memory(memory);
    const bytes = u8.subarray(ptr, ptr + len);
    return new TextDecoder().decode(bytes);
    }
    
    
    export function writeString(memory, ptr, str) {
    const u8 = getUint8Memory(memory);
    const enc = new TextEncoder().encode(str);
    u8.set(enc, ptr);
    return enc.length;
    }
    
    
    export function readCString(memory, ptr) {
    const u8 = getUint8Memory(memory);
    let end = ptr;
    while (end < u8.length && u8[end] !== 0) end++;
    return new TextDecoder().decode(u8.subarray(ptr, end));
    }
    
    
    export function writeUint8Array(memory, ptr, arr) {
    const u8 = getUint8Memory(memory);
    u8.set(arr, ptr);
    }