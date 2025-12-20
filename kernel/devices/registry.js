// kernel/devices/registry.js


export class DeviceRegistry {
    constructor() {
    this.devices = new Map();
    }
    
    
    register(device) {
    console.log('Register device', device.name);
    this.devices.set(device.path, device);
    }
    
    
    get(path) {
    return this.devices.get(path);
    }
    
    
    list() {
    return [...this.devices.keys()];
    }
    }