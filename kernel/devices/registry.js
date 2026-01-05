// kernel/devices/registry.js — Device Registry AMÉLIORÉ

export class DeviceRegistry {
  constructor() {
    console.log('[DeviceRegistry] Initializing...');
    this.devices = new Map();
  }

  register(device) {
    try {
      if (!device || !device.name || !device.path) {
        throw new Error('Invalid device: missing name or path');
      }

      // Check for duplicate
      if (this.devices.has(device.path)) {
        console.warn(`[DeviceRegistry] Device path ${device.path} already registered, overwriting`);
      }

      this.devices.set(device.path, device);
      console.log(`[DeviceRegistry] Registered ${device.name} at ${device.path} ✓`);
      return true;

    } catch (e) {
      console.error(`[DeviceRegistry] Register error:`, e.message);
      return false;
    }
  }

  unregister(path) {
    try {
      const device = this.devices.get(path);
      if (!device) {
        console.warn(`[DeviceRegistry] Device not found at ${path}`);
        return false;
      }

      this.devices.delete(path);
      console.log(`[DeviceRegistry] Unregistered ${device.name} from ${path} ✓`);
      return true;

    } catch (e) {
      console.error(`[DeviceRegistry] Unregister error:`, e.message);
      return false;
    }
  }

  get(path) {
    const device = this.devices.get(path);
    if (!device) {
      console.warn(`[DeviceRegistry] Device not found at ${path}`);
    }
    return device || null;
  }

  list() {
    return Array.from(this.devices.keys());
  }

  listWithNames() {
    const result = [];
    for (const [path, device] of this.devices) {
      result.push({ path, name: device.name });
    }
    return result;
  }

  getCount() {
    return this.devices.size;
  }

  toString() {
    const devices = this.listWithNames();
    return `DeviceRegistry(${devices.length} devices): ${devices.map(d => d.name).join(', ')}`;
  }
}
