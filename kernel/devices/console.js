// kernel/devices/console.js


export class ConsoleDevice {
    constructor() {
    this.name = 'console';
    this.path = '/dev/console';
    }
    
    
    write(str) {
    console.log(str);
    }
    
    
    read() {
    return null;
    }
    }