// kernel/devices/serial.js


export async function initSerial(registry) {
    navigator.serial.addEventListener('connect', e => {
    registry.register({ name: 'serial', path: `/dev/ttyUSB-${Date.now()}`, port: e.target });
    });
    }