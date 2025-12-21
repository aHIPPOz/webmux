// kernel/wasm/instance.js
// high-level instantiation helpers that wire memory, wasi imports, and the kernel

import { createMemory } from './memory.js';
import { createWASIImports } from './wasi.js';

export async function instantiateWasm(buffer, { kernel, proc, importsExtra = {} } = {}) {
    // ensure proc has memory object
    if (!proc.memory) proc.memory = createMemory({ initialPages: 64 });
    const wasi = createWASIImports(kernel, proc);
    // build imports: merge wasi, extra and a simple "env"
    const imports = Object.assign({}, importsExtra, wasi, { env: {} });
    const module = await WebAssembly.compile(buffer);
    const instance = await WebAssembly.instantiate(module, imports);
    // attach instance to proc
    proc.instance = instance;
    // if instance exports memory and proc.memory was not used, sync
    if (instance.exports && instance.exports.memory) proc.memory = instance.exports.memory;
    return instance;
}