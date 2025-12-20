// kernel/devices/random.js


export class RandomDevice {
    constructor() {
    this.name = 'random';
    this.path = '/dev/random';
    }
    
    
    read(n = 32) {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return buf;
    }
    }