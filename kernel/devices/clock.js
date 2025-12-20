// kernel/devices/clock.js


export class ClockDevice {
    constructor() {
    this.name = 'clock';
    this.path = '/dev/clock';
    }
    
    
    now() {
    return performance.now();
    }
    }