// kernel/devices/main.js


import { DeviceRegistry } from './registry.js';
import { GPUDevice } from './gpu.js';
import { FramebufferDevice } from './framebuffer.js';
import { ConsoleDevice } from './console.js';
import { InputDevice } from './input.js';
import { ClockDevice } from './clock.js';
import { RandomDevice } from './random.js';
import { initUSB } from './usb.js';
import { initHID } from './hid.js';
import { initSerial } from './serial.js';
import { AudioDevice } from './audio.js';
import { ClipboardDevice } from './clipboard.js';
import { ConsoleUIDevice } from './consoleui.js';

export async function initDevices(kernel) {
const registry = new DeviceRegistry();

const consoleui = new ConsoleUIDevice();
consoleui.init();
registry.register(consoleui);

// --- Static devices ---
registry.register(new ConsoleDevice());
registry.register(new ClockDevice());
registry.register(new RandomDevice());
registry.register(new AudioDevice());
registry.register(new ClipboardDevice());


const fb = new FramebufferDevice(kernel.bootInfo);
registry.register(fb);


const gpu = new GPUDevice(fb);
await gpu.init();
registry.register(gpu);


const input = new InputDevice();
input.init();
registry.register(input);


// --- Dynamic devices ---
if ('usb' in navigator) initUSB(registry);
if ('hid' in navigator) initHID(registry);
if ('serial' in navigator) initSerial(registry);


kernel.devices = registry;
return registry;
}