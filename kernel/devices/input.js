// kernel/devices/input.js


export class InputDevice {
    constructor() {
    this.name = 'input';
    this.path = '/dev/input0';
    this.queue = [];
    }
    
    
    init() {
    window.addEventListener('keydown', e => {
    this.queue.push({ type: 'key', key: e.key, code: e.code });
    });
    }
    
    
    read() {
    return this.queue.shift() || null;
    }
    }