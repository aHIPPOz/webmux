// kernel/devices/netcard.js
// NetDevice: exposes a /dev/net0 device backed by the in-kernel LoopbackNetwork


import { LoopbackNetwork } from '../net/loopback.js';


export class NetDevice {
constructor() {
this.name = 'net0';
this.path = '/dev/net0';
this.net = new LoopbackNetwork();
this.initialized = false;
}


async init() {
// nothing async needed now but keep interface consistent
this.initialized = true;
return true;
}


// create a socket (returns a LoopbackSocket)
createSocket() {
return this.net.createSocket();
}


// convenience: bind net device into kernel
getNetwork() { return this.net; }


getInfo() {
return { vendor: 'wasmux', model: 'loopback', path: this.path };
}
}


export async function registerNetDevice(registry) {
const d = new NetDevice();
await d.init();
if (registry && typeof registry.register === 'function') registry.register(d);
return d;
}